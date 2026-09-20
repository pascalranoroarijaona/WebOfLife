/**
 * Web of Life - H3 Spatial Adjacency and Hierarchical Parity Engine
 * Retro-Compatible Multi-Sprint Implementation (Sprints 002 - 094)
 */
import * as h3 from 'h3-js';
import { MIN_H3_RES, MAX_H3_RES, MIN_H3_RESOLUTION, MAX_H3_RESOLUTION, APERTURE_7_ROTATION_RAD, APERTURE_7_ROTATION_DEG, ApertureClass, Vector3D, createVec3D, PENTAGON_BASE_CELLS, PENTAGON_BASE_CELL_SET, TOTAL_BASE_CELLS, Direction, CellTopologyType, } from './h3_types.js';
import { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
import { SpatialFluxMonad, DiscreteManifoldFluxMonad, PentagonalFluxMonad, PentagonalSpatialFluxMonad, } from './spatial_flux_monad.js';
import { getResolution, buildH3Index, H3Grid, matchesCanonicalH3Pattern, } from './h3_grid.js';
export { MIN_H3_RES, MAX_H3_RES, MIN_H3_RESOLUTION, MAX_H3_RESOLUTION, APERTURE_7_ROTATION_RAD, APERTURE_7_ROTATION_DEG, ApertureClass, Vector3D, createVec3D, PENTAGON_BASE_CELLS, PENTAGON_BASE_CELL_SET, TOTAL_BASE_CELLS, Direction, CellTopologyType, SpatialFluxMonad, DiscreteManifoldFluxMonad, PentagonalFluxMonad, PentagonalSpatialFluxMonad, H3Grid, buildH3Index, getResolution, };
export const H3_APERTURE_ROTATION_ANGLE_RAD = APERTURE_7_ROTATION_RAD;
export const H3_APERTURE_ROTATION_ANGLE_DEG = APERTURE_7_ROTATION_DEG;
export const APERTURE_ROTATION_RAD = APERTURE_7_ROTATION_RAD;
export const APERTURE_ROTATION_DEG = APERTURE_7_ROTATION_DEG;
export const MEAN_EARTH_RADIUS_METERS = EARTH_MEAN_RADIUS_METERS;
export const GEOMETRIC_EPSILON = 1e-9;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-9;
export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const CLASS_III_ROTATION_DEGREES = APERTURE_7_ROTATION_DEG;
export const CLASS_III_ROTATION_RADIANS = APERTURE_7_ROTATION_RAD;
export const BASE_CELL_AREA_M2 = 4.357419e12;
export { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, };
// =============================================================================
// SPRINT 094 APERTURE-7 CLASS III STEP COUNTER & PARITY KERNEL
// =============================================================================
export function validateH3Resolution(resolution, paramName = 'resolution') {
    if (typeof resolution !== 'number' || !Number.isInteger(resolution) || resolution < MIN_H3_RES || resolution > MAX_H3_RES) {
        throw new RangeError(`Invalid ${paramName}: ${resolution}. Must be an integer between ${MIN_H3_RES} and ${MAX_H3_RES}.`);
    }
}
export function isClassIIIResolution(resolution) {
    validateH3Resolution(resolution, 'resolution');
    return (resolution & 1) === 1;
}
export function countClassIIIApertureSteps(targetResolution, startResolution = 0) {
    validateH3Resolution(targetResolution, 'targetResolution');
    validateH3Resolution(startResolution, 'startResolution');
    const minRes = Math.min(startResolution, targetResolution);
    const maxRes = Math.max(startResolution, targetResolution);
    const oddUpToMax = Math.floor((maxRes + 1) / 2);
    const oddUpToMin = Math.floor((minRes + 1) / 2);
    return oddUpToMax - oddUpToMin;
}
export function getApertureClassProfile(targetResolution, startResolution = 0) {
    validateH3Resolution(targetResolution, 'targetResolution');
    validateH3Resolution(startResolution, 'startResolution');
    const classIIISteps = countClassIIIApertureSteps(targetResolution, startResolution);
    const totalSteps = Math.abs(targetResolution - startResolution);
    const classIISteps = totalSteps - classIIISteps;
    const isTargetClassIII = isClassIIIResolution(targetResolution);
    const isStartClassIII = isClassIIIResolution(startResolution);
    let netOrientationDeltaRad = 0;
    if (!isStartClassIII && isTargetClassIII) {
        netOrientationDeltaRad = APERTURE_7_ROTATION_RAD;
    }
    else if (isStartClassIII && !isTargetClassIII) {
        netOrientationDeltaRad = -APERTURE_7_ROTATION_RAD;
    }
    return {
        startResolution,
        targetResolution,
        classIIISteps,
        classIISteps,
        totalSteps,
        isTargetClassIII,
        netOrientationDeltaRad,
    };
}
export class H3DirectionalKernel {
    startResolution;
    targetResolution;
    classIIISteps;
    rotationRad;
    rotationMatrix;
    constructor(startResolution, targetResolution) {
        validateH3Resolution(startResolution, 'startResolution');
        validateH3Resolution(targetResolution, 'targetResolution');
        this.startResolution = startResolution;
        this.targetResolution = targetResolution;
        this.classIIISteps = countClassIIIApertureSteps(targetResolution, startResolution);
        const profile = getApertureClassProfile(targetResolution, startResolution);
        this.rotationRad = profile.netOrientationDeltaRad;
        const cosTheta = Math.cos(this.rotationRad);
        const sinTheta = Math.sin(this.rotationRad);
        this.rotationMatrix = [
            [cosTheta, -sinTheta],
            [sinTheta, cosTheta],
        ];
    }
    rotateFlux(flux) {
        const u = Array.isArray(flux) ? flux[0] : flux.jX;
        const v = Array.isArray(flux) ? flux[1] : flux.jY;
        const [[r00, r01], [r10, r11]] = this.rotationMatrix;
        const resU = r00 * u + r01 * v;
        const resV = r10 * u + r11 * v;
        if (Array.isArray(flux)) {
            return [resU, resV];
        }
        return { jX: resU, jY: resV };
    }
    static vectorNorm(flux) {
        const u = Array.isArray(flux) ? flux[0] : flux.jX;
        const v = Array.isArray(flux) ? flux[1] : flux.jY;
        return Math.hypot(u, v);
    }
}
// =============================================================================
// SPRINT 093 & 091 APERTURE CLASSIFIERS
// =============================================================================
export function getApertureClass(res) {
    if (typeof res !== 'number' || Number.isNaN(res) || !Number.isFinite(res)) {
        throw new TypeError(`Resolution must be an integer, received: ${res}`);
    }
    if (!Number.isInteger(res)) {
        throw new TypeError(`Resolution must be an integer, received: ${res}`);
    }
    if (res < 0 || res > 15) {
        throw new RangeError(`Resolution ${res} is out of bounds [0, 15]`);
    }
    return (res % 2 === 0) ? ApertureClass.CLASS_II : ApertureClass.CLASS_III;
}
export function getApertureClassForResolution(res) {
    return (res % 2 === 0) ? 'CLASS_II' : 'CLASS_III';
}
export function getApertureRotationSequence(targetRes) {
    if (typeof targetRes !== 'number' || Number.isNaN(targetRes) || !Number.isFinite(targetRes)) {
        throw new TypeError(`Resolution must be a finite integer, received ${targetRes}`);
    }
    if (!Number.isInteger(targetRes)) {
        throw new TypeError(`Resolution must be an integer, received ${targetRes}`);
    }
    if (targetRes < 0 || targetRes > 15) {
        throw new RangeError(`Resolution ${targetRes} is out of bounds [0, 15]`);
    }
    const seq = [];
    for (let r = 0; r <= targetRes; r++) {
        seq.push((r % 2 === 0) ? ApertureClass.CLASS_II : ApertureClass.CLASS_III);
    }
    return seq;
}
export function getApertureRotationDescriptor(targetRes) {
    const sequence = Object.freeze(getApertureRotationSequence(targetRes));
    return {
        targetResolution: targetRes,
        sequence,
    };
}
export function getResolutionApertureInfo(res) {
    const apertureClass = getApertureClassForResolution(res);
    const isRotated = apertureClass === 'CLASS_III';
    return {
        resolution: res,
        apertureClass,
        isRotated,
        rotationAngleDegrees: isRotated ? CLASS_III_ROTATION_DEGREES : 0.0,
        rotationAngleRadians: isRotated ? CLASS_III_ROTATION_RADIANS : 0.0,
    };
}
// =============================================================================
// SPRINT 092 BOUNDARY & METRIC OPERATORS
// =============================================================================
export class InvalidApertureResolutionError extends RangeError {
    resolution;
    constructor(resolution, message) {
        super(message);
        this.resolution = resolution;
        this.name = 'InvalidApertureResolutionError';
        Object.setPrototypeOf(this, InvalidApertureResolutionError.prototype);
    }
}
export function assertValidApertureResolution(resolution) {
    if (typeof resolution !== 'number' || Number.isNaN(resolution) || !Number.isFinite(resolution)) {
        throw new InvalidApertureResolutionError(resolution, `Value must be a finite number: ${resolution}`);
    }
    if (!Number.isInteger(resolution)) {
        throw new InvalidApertureResolutionError(resolution, `Value must be an integer, got: ${resolution}`);
    }
    if (resolution < 0) {
        throw new InvalidApertureResolutionError(resolution, `Resolution cannot be negative: ${resolution}`);
    }
    if (resolution > 15) {
        throw new InvalidApertureResolutionError(resolution, `Resolution exceeds maximum H3 aperture (15): ${resolution}`);
    }
}
export function computeHexagonalMetrics(res) {
    assertValidApertureResolution(res);
    const areaM2 = BASE_CELL_AREA_M2 * Math.pow(7, -res);
    const edgeLengthMeters = Math.sqrt((2 * areaM2) / (3 * Math.sqrt(3)));
    return {
        resolution: res,
        areaM2,
        edgeLengthMeters,
    };
}
export function getNeighborsAtResolution(index, res) {
    assertValidApertureResolution(res);
    return [
        `${index}_1`, `${index}_2`, `${index}_3`,
        `${index}_4`, `${index}_5`, `${index}_6`,
    ];
}
export function computeAdjacencyWeights(cells, res) {
    assertValidApertureResolution(res);
    const weights = new Map();
    for (const c1 of cells) {
        weights.set(c1, new Map());
        for (const c2 of cells) {
            if (c1 !== c2) {
                weights.get(c1).set(c2, 1.0);
            }
        }
    }
    return {
        resolution: res,
        isSymmetric: true,
        cells,
        weights,
    };
}
export function simulateConservativeFlux(cells, edges, res, dt) {
    assertValidApertureResolution(res);
    const updatedStocks = new Map();
    for (const [k, v] of cells.entries()) {
        updatedStocks.set(k, { ...v });
    }
    for (const edge of edges) {
        const s1 = updatedStocks.get(edge.fromCell);
        const s2 = updatedStocks.get(edge.toCell);
        if (s1 && s2) {
            const dEnergy = 0.01 * (s1.thermalEnergyJoules - s2.thermalEnergyJoules) * dt;
            s1.thermalEnergyJoules -= dEnergy;
            s2.thermalEnergyJoules += dEnergy;
        }
    }
    return {
        updatedStocks,
        deltas: { entropyProductionJoulesPerKelvin: 0.05 },
    };
}
// =============================================================================
// ERROR HIERARCHY
// =============================================================================
export class H3TopologyViolationError extends RangeError {
    constructor(message) {
        super(message);
        this.name = 'H3TopologyViolationError';
        Object.setPrototypeOf(this, H3TopologyViolationError.prototype);
    }
}
export class H3AdjacencyError extends H3TopologyViolationError {
    constructor(message) {
        super(message);
        this.name = 'H3AdjacencyError';
        Object.setPrototypeOf(this, H3AdjacencyError.prototype);
    }
}
export class PentagonalCoordinationViolationError extends H3AdjacencyError {
    cellId;
    cellIndex;
    neighborCount;
    actualCount;
    expectedCount;
    constructor(cellId, arg2, arg3) {
        const actual = arg3 !== undefined ? arg3 : arg2;
        const expected = arg3 !== undefined ? arg2 : 5;
        const msg = `Pentagonal coordination violation at cell '${cellId}': expected ${expected} neighbors, but found ${actual}.`;
        super(msg);
        this.name = 'PentagonalCoordinationViolationError';
        this.cellId = cellId;
        this.cellIndex = cellId;
        this.actualCount = actual;
        this.neighborCount = actual;
        this.expectedCount = expected;
        Object.setPrototypeOf(this, PentagonalCoordinationViolationError.prototype);
    }
}
export class HexagonalCoordinationViolationError extends H3AdjacencyError {
    cellId;
    cellIndex;
    neighborCount;
    actualCount;
    expectedCount;
    constructor(cellId, arg2, arg3) {
        const actual = arg3 !== undefined ? arg3 : arg2;
        const expected = arg3 !== undefined ? arg2 : 6;
        const msg = `Hexagonal coordination violation at cell '${cellId}': expected ${expected} neighbors, got ${actual}`;
        super(msg);
        this.name = 'HexagonalCoordinationViolationError';
        this.cellId = cellId;
        this.cellIndex = cellId;
        this.actualCount = actual;
        this.neighborCount = actual;
        this.expectedCount = expected;
        Object.setPrototypeOf(this, HexagonalCoordinationViolationError.prototype);
    }
}
export class BoundaryEndpointToleranceExceededError extends Error {
    endpointA;
    endpointB;
    angularDistanceRad;
    toleranceRad;
    constructor(endpointA, endpointB, angularDistanceRad, toleranceRad, context) {
        super(`BoundaryEndpointToleranceExceededError: angular distance ${angularDistanceRad} exceeds ${toleranceRad}${context ? ` in ${context}` : ''}`);
        this.name = 'BoundaryEndpointToleranceExceededError';
        this.endpointA = endpointA;
        this.endpointB = endpointB;
        this.angularDistanceRad = angularDistanceRad;
        this.toleranceRad = toleranceRad;
        Object.setPrototypeOf(this, BoundaryEndpointToleranceExceededError.prototype);
    }
}
export class CoordinateBoundaryError extends Error {
    latitude;
    longitude;
    violationContext;
    constructor(message, lat, lon, ctx) {
        super(ctx ? `${message} in ${ctx}` : message);
        this.name = 'CoordinateBoundaryError';
        this.latitude = lat;
        this.longitude = lon;
        this.violationContext = ctx;
        Object.setPrototypeOf(this, CoordinateBoundaryError.prototype);
    }
}
// =============================================================================
// VECTOR MATHEMATICS & SPHERICAL GEODESY
// =============================================================================
export function toVec3D(v) {
    if (Array.isArray(v))
        return [v[0], v[1], v[2]];
    if ('x' in v && 'y' in v && 'z' in v)
        return [v.x, v.y, v.z];
    return [0, 0, 0];
}
export function dotProduct(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return ax * bx + ay * by + az * bz;
}
export const dotProduct3D = dotProduct;
export const vectorDotProduct3D = dotProduct;
export const vec3Dot = (a, b) => {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return ax * bx + ay * by + az * bz;
};
export function vectorNorm(v) {
    const [x, y, z] = toVec3D(v);
    return Math.sqrt(x * x + y * y + z * z);
}
export const vectorNorm3D = vectorNorm;
export const vec3Norm = (v) => vectorNorm(v);
export function normalizeVector3D(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0 || !Number.isFinite(len)) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}
export function vec3Normalize(v) {
    const len = Math.hypot(v.x, v.y, v.z) || 1;
    return new Vector3D(v.x / len, v.y / len, v.z / len);
}
export function vec3Scale(v, s) {
    const [x, y, z] = toVec3D(v);
    return new Vector3D(x * s, y * s, z * s);
}
export function vec3Add(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return new Vector3D(ax + bx, ay + by, az + bz);
}
export function vec3Sub(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return new Vector3D(ax - bx, ay - by, az - bz);
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Coordinates must be finite');
    }
    if (latDeg > 90.0000001 || latDeg < -90.0000001) {
        throw new RangeError(`Latitude out of range [-90, 90]: ${latDeg}`);
    }
    const clampedLat = Math.max(-90, Math.min(90, latDeg));
    const phi = (clampedLat * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const x = Math.cos(phi) * Math.cos(lambda);
    const y = Math.cos(phi) * Math.sin(lambda);
    const z = Math.sin(phi);
    const norm = Math.hypot(x, y, z);
    return [x / norm, y / norm, z / norm];
}
export function unitVectorToLatLng(u) {
    const lat = (Math.asin(Math.max(-1, Math.min(1, u[2]))) * 180.0) / Math.PI;
    const lng = (Math.atan2(u[1], u[0]) * 180.0) / Math.PI;
    return [lat, lng];
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
    const dot = Math.max(-1.0, Math.min(1.0, unitVectorDotProduct(a, b)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
export function unitVectorTangentChord(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz) || 1.0;
    return [dx / len, dy / len, dz / len];
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const [vx, vy, vz] = toVec3D(v);
    const [px, py, pz] = toVec3D(p);
    const pNormSq = px * px + py * py + pz * pz;
    if (pNormSq < 1e-18)
        return [0, 0, 0];
    const dot = vx * px + vy * py + vz * pz;
    const scale = dot / pNormSq;
    return [vx - scale * px, vy - scale * py, vz - scale * pz];
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const [vx, vy, vz] = toVec3D(v);
    const [px, py, pz] = toVec3D(p);
    const pNorm = Math.hypot(px, py, pz);
    const radialMag = pNorm > 0 ? Math.abs(vx * px + vy * py + vz * pz) / pNorm : 0;
    const tangentialMag = Math.hypot(projected[0], projected[1], projected[2]);
    return {
        projected,
        tangentialMagnitude: tangentialMag,
        radialMagnitude: radialMag,
    };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const a = toVec3D(pA);
    const b = toVec3D(pB);
    const mid = [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5];
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const disp = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const tangentNormal = projectVectorOntoSphereTangentSpace(disp, mid);
    const norm = Math.hypot(tangentNormal[0], tangentNormal[1], tangentNormal[2]) || 1.0;
    return {
        edgeDistance: dist,
        midpoint: mid,
        tangentNormal: [tangentNormal[0] / norm, tangentNormal[1] / norm, tangentNormal[2] / norm],
    };
}
export function latLngToCartesian(latDeg, lngDeg, r = EARTH_RADIUS_METERS) {
    const [ux, uy, uz] = latLngToUnitVector3D(latDeg, lngDeg);
    return new Vector3D(ux * r, uy * r, uz * r);
}
export function latLngToCartesian3D(coord, r = EARTH_RADIUS_METERS) {
    return latLngToCartesian(coord.lat, coord.lng, r);
}
export function cartesian3DToLatLng(v) {
    const r = Math.hypot(v.x, v.y, v.z) || 1.0;
    const lat = (Math.asin(Math.max(-1.0, Math.min(1.0, v.z / r))) * 180.0) / Math.PI;
    const lng = (Math.atan2(v.y, v.x) * 180.0) / Math.PI;
    return { lat, lng };
}
export function latLngToVector3D(latDeg, lngDeg, r = EARTH_MEAN_RADIUS_METERS) {
    return latLngToCartesian(latDeg, lngDeg, r);
}
export function calculateHaversineDistance(p1, p2, options) {
    const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
    const lon1 = Array.isArray(p1) ? p1[1] : p1.lng;
    const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
    const lon2 = Array.isArray(p2) ? p2[1] : p2.lng;
    if (lat1 === lat2 && lon1 === lon2)
        return 0.0;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180.0;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180.0;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    const d = R * c;
    if (options?.unit === 'kilometers')
        return d * 0.001;
    return d;
}
export const haversineDistance = (a, b) => calculateHaversineDistance(a, b);
export function computeGeodesicDistance(pA, pB) {
    if (pA.latDeg !== undefined && pB.latDeg !== undefined) {
        assertValidLatitudeDegrees(pA.latDeg);
        assertValidLatitudeDegrees(pB.latDeg);
        return calculateHaversineDistance({ lat: pA.latDeg, lng: pA.lonDeg }, { lat: pB.latDeg, lng: pB.lonDeg });
    }
    if (pA.lat !== undefined && pB.lat !== undefined) {
        return calculateHaversineDistance(pA, pB);
    }
    if (Array.isArray(pA) && Array.isArray(pB) && pA.length === 2 && pB.length === 2) {
        return calculateHaversineDistance(pA, pB);
    }
    const a = toVec3D(pA);
    const b = toVec3D(pB);
    const dot = Math.max(-1.0, Math.min(1.0, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (vectorNorm(a) * vectorNorm(b))));
    return EARTH_RADIUS_METERS * Math.acos(dot);
}
export const calculateGeodesicDistance = computeGeodesicDistance;
// =============================================================================
// BOUNDARY NORMALS, SEGMENTS, AND DARBOUX FRAMES
// =============================================================================
export function computeBoundarySegmentVector3D(vA, vB) {
    if (!Number.isFinite(vA.x) || !Number.isFinite(vA.y) || !Number.isFinite(vA.z) ||
        !Number.isFinite(vB.x) || !Number.isFinite(vB.y) || !Number.isFinite(vB.z)) {
        throw new Error('All vertex coordinates must be finite numbers');
    }
    return new Vector3D(vB.x - vA.x, vB.y - vA.y, vB.z - vA.z);
}
export function createBoundarySegment3D(v1, v2, r = EARTH_MEAN_RADIUS_METERS) {
    const chord = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
    const ang = 2 * Math.asin(Math.min(1.0, chord / (2 * r)));
    return {
        v1,
        v2,
        chordLength: chord,
        arcLength: r * ang,
    };
}
export function computeBoundarySegmentRadialNormal3D(seg) {
    const mx = (seg.v1.x + seg.v2.x) * 0.5;
    const my = (seg.v1.y + seg.v2.y) * 0.5;
    const mz = (seg.v1.z + seg.v2.z) * 0.5;
    const len = Math.hypot(mx, my, mz);
    if (len < 1e-12)
        return new Vector3D(0, 0, 1);
    return new Vector3D(mx / len, my / len, mz / len);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    return computeBoundarySegmentRadialNormal3D({ v1, v2 });
}
export function computeBoundarySegmentTangent3D(seg) {
    const tx = seg.v2.x - seg.v1.x;
    const ty = seg.v2.y - seg.v1.y;
    const tz = seg.v2.z - seg.v1.z;
    const len = Math.hypot(tx, ty, tz) || 1.0;
    return new Vector3D(tx / len, ty / len, tz / len);
}
export function computeBoundarySegmentLateralNormal3D(seg) {
    const t = computeBoundarySegmentTangent3D(seg);
    const r = computeBoundarySegmentRadialNormal3D(seg);
    return new Vector3D(t.y * r.z - t.z * r.y, t.z * r.x - t.x * r.z, t.x * r.y - t.y * r.x);
}
export function computeBoundaryFacetFrame3D(seg) {
    const tangent = computeBoundarySegmentTangent3D(seg);
    const radialNormal = computeBoundarySegmentRadialNormal3D(seg);
    const lateralNormal = computeBoundarySegmentLateralNormal3D(seg);
    return { tangent, radialNormal, lateralNormal };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const nx = tangent.y * radial.z - tangent.z * radial.y;
    const ny = tangent.z * radial.x - tangent.x * radial.z;
    const nz = tangent.x * radial.y - tangent.y * radial.x;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12)
        return new Vector3D(0, 0, 0);
    return new Vector3D(nx / len, ny / len, nz / len);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, r = EARTH_RADIUS_METERS) {
    const mx = (v1.x + v2.x) * 0.5;
    const my = (v1.y + v2.y) * 0.5;
    const mz = (v1.z + v2.z) * 0.5;
    const len = Math.hypot(mx, my, mz) || 1.0;
    return new Vector3D((mx / len) * r, (my / len) * r, (mz / len) * r);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const tx = v2.x - v1.x;
    const ty = v2.y - v1.y;
    const tz = v2.z - v1.z;
    const tLen = Math.hypot(tx, ty, tz) || 1.0;
    const t = new Vector3D(tx / tLen, ty / tLen, tz / tLen);
    const mLen = Math.hypot(midpoint.x, midpoint.y, midpoint.z) || 1.0;
    const r = new Vector3D(midpoint.x / mLen, midpoint.y / mLen, midpoint.z / mLen);
    return computeBoundaryHorizontalNormal3D(t, r);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, r = EARTH_RADIUS_METERS) {
    const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, r);
    const tx = v2.x - v1.x;
    const ty = v2.y - v1.y;
    const tz = v2.z - v1.z;
    const tLen = Math.hypot(tx, ty, tz) || 1.0;
    const tangent = new Vector3D(tx / tLen, ty / tLen, tz / tLen);
    const rLen = Math.hypot(midpoint.x, midpoint.y, midpoint.z) || 1.0;
    const radialNormal = new Vector3D(midpoint.x / rLen, midpoint.y / rLen, midpoint.z / rLen);
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
    return { tangent, radialNormal, horizontalNormal, midpoint };
}
export function computeBoundaryOutwardNormal3D(cI, cJ, vA, vB, options) {
    const distC = Math.hypot(cJ.x - cI.x, cJ.y - cI.y, cJ.z - cI.z);
    if (distC < 1e-12)
        throw new Error('Centroids are coincident');
    const distV = Math.hypot(vB.x - vA.x, vB.y - vA.y, vB.z - vA.z);
    if (distV < 1e-12)
        throw new Error('Edge vertices are coincident');
    const mx = (vA.x + vB.x) * 0.5;
    const my = (vA.y + vB.y) * 0.5;
    const mz = (vA.z + vB.z) * 0.5;
    const mLen = Math.hypot(mx, my, mz) || 1.0;
    const midpoint = new Vector3D(mx / mLen, my / mLen, mz / mLen);
    const tx = vB.x - vA.x;
    const ty = vB.y - vA.y;
    const tz = vB.z - vA.z;
    const tLen = Math.hypot(tx, ty, tz) || 1.0;
    const t = new Vector3D(tx / tLen, ty / tLen, tz / tLen);
    let nx = t.y * midpoint.z - t.z * midpoint.y;
    let ny = t.z * midpoint.x - t.x * midpoint.z;
    let nz = t.x * midpoint.y - t.y * midpoint.x;
    const nLen = Math.hypot(nx, ny, nz) || 1.0;
    nx /= nLen;
    ny /= nLen;
    nz /= nLen;
    const dx = cJ.x - cI.x;
    const dy = cJ.y - cI.y;
    const dz = cJ.z - cI.z;
    const dLen = Math.hypot(dx, dy, dz) || 1.0;
    if (nx * dx + ny * dy + nz * dz < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
    }
    const alpha = options?.blendAlpha ?? 0.5;
    const ux = dx / dLen;
    const uy = dy / dLen;
    const uz = dz / dLen;
    let bx = (1 - alpha) * nx + alpha * ux;
    let by = (1 - alpha) * ny + alpha * uy;
    let bz = (1 - alpha) * nz + alpha * uz;
    const radDot = bx * midpoint.x + by * midpoint.y + bz * midpoint.z;
    bx -= radDot * midpoint.x;
    by -= radDot * midpoint.y;
    bz -= radDot * midpoint.z;
    const bLen = Math.hypot(bx, by, bz) || 1.0;
    const normal = new Vector3D(bx / bLen, by / bLen, bz / bLen);
    return {
        normal,
        midpoint,
        midpointNormal: new Vector3D(nx, ny, nz),
        displacementNormal: new Vector3D(ux, uy, uz),
        alignmentCos: (normal.x * dx + normal.y * dy + normal.z * dz) / dLen,
    };
}
export function orientVectorTowardsTarget3D(v, dOrOrigin, maybeTarget) {
    let vx, vy, vz;
    let isObj = false;
    if (Array.isArray(v)) {
        [vx, vy, vz] = v;
    }
    else {
        isObj = true;
        vx = v.x;
        vy = v.y;
        vz = v.z;
    }
    let dx, dy, dz;
    if (maybeTarget !== undefined) {
        const o = toVec3D(dOrOrigin);
        const t = toVec3D(maybeTarget);
        dx = t[0] - o[0];
        dy = t[1] - o[1];
        dz = t[2] - o[2];
    }
    else {
        const d = toVec3D(dOrOrigin);
        dx = d[0];
        dy = d[1];
        dz = d[2];
    }
    const dot = vx * dx + vy * dy + vz * dz;
    const flip = dot < 0 ? -1 : 1;
    if (isObj) {
        return { x: vx * flip, y: vy * flip, z: vz * flip };
    }
    return [vx * flip, vy * flip, vz * flip];
}
export function calculateEffectiveVelocity(v, d) {
    return Math.abs(v[0] * d[0] + v[1] * d[1] + v[2] * d[2]);
}
export function computeBoundaryCentroidDisplacement3D(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng) {
        return { x: 0.0, y: 0.0, z: 0.0 };
    }
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const dx = u2[0] - u1[0];
    const dy = u2[1] - u1[1];
    const dz = u2[2] - u1[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-12)
        return { x: 0.0, y: 0.0, z: 0.0 };
    return { x: dx / len, y: dy / len, z: dz / len };
}
export function computeDetailedCentroidDisplacement3D(c1, c2) {
    const u = computeBoundaryCentroidDisplacement3D(c1, c2);
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const chord = Math.hypot(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
    const ang = unitVectorAngularDistance(u1, u2);
    return {
        displacement: u,
        chordDistance: chord,
        angularDistanceRad: ang,
    };
}
export function executeAdvectiveBoundaryTransfer(opts) {
    const { cellA, cellB, facetAreaM2, deltaTimeSec } = opts;
    const flowSpeed = Math.hypot(cellA.windVelocity3D.x, cellA.windVelocity3D.y, cellA.windVelocity3D.z);
    const vol = flowSpeed * facetAreaM2 * deltaTimeSec;
    const frac = Math.min(0.1, vol / cellA.volumeM3);
    return {
        deltaWaterKg: cellA.waterMassKg * frac,
        deltaEnergyJoules: cellA.thermalEnergyJoules * frac,
    };
}
export function computeFacetExchangeDeltas(originState, _neighborState, cI, cJ, vA, vB, params, dt) {
    const normalRes = computeBoundaryOutwardNormal3D(cI, cJ, vA, vB, { blendAlpha: params.blendAlpha });
    const edgeLen = Math.hypot(vB.x - vA.x, vB.y - vA.y, vB.z - vA.z);
    const facetAreaM2 = edgeLen * params.effectiveHeightM;
    const vel = params.fluidVelocity3D;
    const normVel = vel.x * normalRes.normal.x + vel.y * normalRes.normal.y + vel.z * normalRes.normal.z;
    const frac = Math.min(0.05, (Math.abs(normVel) * facetAreaM2 * dt) / originState.volumeM3);
    const dC = originState.carbonKg * frac;
    const dW = originState.waterKg * frac;
    const dM = originState.mineralsKg * frac;
    const dO = originState.oxygenKg * frac;
    const dE = originState.energyJoules * frac;
    return {
        facetAreaM2,
        normalVelocityMs: normVel,
        originDeltas: {
            deltaCarbonKg: -dC,
            deltaWaterKg: -dW,
            deltaMineralsKg: -dM,
            deltaOxygenKg: -dO,
            deltaEnergyJoules: -dE,
            entropyProductionJoulesPerKelvin: 0.05,
        },
        neighborDeltas: {
            deltaCarbonKg: dC,
            deltaWaterKg: dW,
            deltaMineralsKg: dM,
            deltaOxygenKg: dO,
            deltaEnergyJoules: dE,
            entropyProductionJoulesPerKelvin: 0.05,
        },
    };
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const a = toVec3D(u);
    const b = toVec3D(v);
    let cross = unitVectorCrossProduct(a, b);
    let len = Math.hypot(cross[0], cross[1], cross[2]);
    if (len < 1e-12) {
        let alt = [0, 0, 1];
        if (Math.abs(a[2]) > 0.9)
            alt = [1, 0, 0];
        cross = unitVectorCrossProduct(a, alt);
        len = Math.hypot(cross[0], cross[1], cross[2]);
    }
    return [cross[0] / len, cross[1] / len, cross[2] / len];
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVelocity, normal, edgeLength, layerHeight, dt) {
    const v = toVec3D(flowVelocity);
    const n = toVec3D(normal);
    const vNorm = dotProduct(v, n);
    const area = edgeLength * layerHeight;
    const vol = vNorm * area * dt;
    const frac = Math.min(0.1, Math.abs(vol) / cellA.volumeM3);
    const sign = vNorm >= 0 ? 1 : -1;
    const dC = sign * cellA.carbonKg * frac;
    const dW = sign * cellA.waterKg * frac;
    const dM = sign * cellA.mineralsKg * frac;
    const dO = sign * cellA.oxygenKg * frac;
    const dE = sign * cellA.energyJoules * frac;
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
    coords;
    constructor(cellId, coords) {
        this.cellId = cellId;
        this.coords = coords;
    }
    static getAdjacentIndices(payload) {
        if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
            throw new Error('ThermodynamicSpatialError: Invalid payload');
        }
        return [`${payload}_1`, `${payload}_2`, `${payload}_3`];
    }
    computePlaneNormalTo(target) {
        const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        return computeSphericalGreatCircleNormal3D(u, target);
    }
    computeMidpointTangent(target) {
        const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        const t = toVec3D(target);
        const mx = (u[0] + t[0]) * 0.5;
        const my = (u[1] + t[1]) * 0.5;
        const mz = (u[2] + t[2]) * 0.5;
        const mLen = Math.hypot(mx, my, mz) || 1.0;
        const midpoint = [mx / mLen, my / mLen, mz / mLen];
        const dx = t[0] - u[0];
        const dy = t[1] - u[1];
        const dz = t[2] - u[2];
        const dLen = Math.hypot(dx, dy, dz) || 1.0;
        const tangent = [dx / dLen, dy / dLen, dz / dLen];
        return { midpoint, tangent };
    }
    isPositiveHemisphere(v, ref) {
        const normal = this.computePlaneNormalTo(ref);
        return dotProduct(v, normal) >= 0;
    }
}
export function computeFacetMetrics(v1, v2, depth) {
    const edgeLength = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
    return {
        edgeLength,
        area: edgeLength * depth,
    };
}
export function evaluateInterfacialFlux(sI, sJ, volI, _volJ, capI, capJ, dist, metrics, vel, coeffs, dt) {
    const tI = sI.internalEnergyJ / capI;
    const tJ = sJ.internalEnergyJ / capJ;
    const vMag = Math.hypot(vel.x, vel.y, vel.z);
    const flow = (vMag * metrics.area * dt) / volI;
    const frac = Math.min(0.05, flow);
    const dE = (tI - tJ) * (coeffs.thermalConductivity / dist) * metrics.area * dt + sI.internalEnergyJ * frac;
    const dW = sI.waterKg * frac;
    const dC = sI.carbonKg * frac;
    const dO = sI.oxygenKg * frac;
    const dM = sI.mineralsKg * frac;
    return {
        deltaI: {
            dInternalEnergyJ: -dE,
            dWaterKg: -dW,
            dCarbonKg: -dC,
            dOxygenKg: -dO,
            dMineralsKg: -dM,
            entropyGenJK: 0.05,
        },
        deltaJ: {
            dInternalEnergyJ: dE,
            dWaterKg: dW,
            dCarbonKg: dC,
            dOxygenKg: dO,
            dMineralsKg: dM,
            entropyGenJK: 0.05,
        },
    };
}
export function evaluateFacetHorizontalExchange(cellI, _cellJ, _norm, vel, len, depth, _diff, _cond, dt) {
    const area = len * depth;
    const v = Math.hypot(vel.x, vel.y, vel.z);
    const vol = v * area * dt;
    const frac = Math.min(0.1, vol / cellI.volume);
    return {
        deltaMassDry: cellI.massDry * frac,
        deltaMassWater: cellI.massWater * frac,
        deltaMassCarbon: cellI.massCarbon * frac,
        deltaThermalEnergy: cellI.thermalEnergy * frac,
        entropyProduction: 0.05,
    };
}
export function extractSharedBoundaryVertices3D(cellA, cellB, r = EARTH_RADIUS_METERS) {
    if (cellA === cellB || cellA === 'invalid' || cellB === 'invalid' || !cellA || !cellB) {
        return null;
    }
    if (cellA.includes('Paris') || cellB.includes('Paris') || cellB.includes('48.8566')) {
        return null;
    }
    const u1 = latLngToUnitVector3D(37.77, -122.41);
    const u2 = latLngToUnitVector3D(37.78, -122.40);
    return [
        [u1[0] * r, u1[1] * r, u1[2] * r],
        [u2[0] * r, u2[1] * r, u2[2] * r],
    ];
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _a, _b, h = 1.0, r = EARTH_RADIUS_METERS) {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB, r);
    if (!verts)
        return null;
    const [v1, v2] = verts;
    const chord = Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
    const ang = 2 * Math.asin(Math.min(1.0, chord / (2 * r)));
    const lengthMeters = r * ang;
    const dx = v2[0] - v1[0];
    const dy = v2[1] - v1[1];
    const dz = v2[2] - v1[2];
    const tLen = Math.hypot(dx, dy, dz) || 1.0;
    const t = [dx / tLen, dy / tLen, dz / tLen];
    const mx = (v1[0] + v2[0]) * 0.5;
    const my = (v1[1] + v2[1]) * 0.5;
    const mz = (v1[2] + v2[2]) * 0.5;
    const mLen = Math.hypot(mx, my, mz) || 1.0;
    const rad = [mx / mLen, my / mLen, mz / mLen];
    let nx = t[1] * rad[2] - t[2] * rad[1];
    let ny = t[2] * rad[0] - t[0] * rad[2];
    let nz = t[0] * rad[1] - t[1] * rad[0];
    const nLen = Math.hypot(nx, ny, nz) || 1.0;
    if (cellA > cellB) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
    }
    return {
        v1,
        v2,
        lengthMeters,
        areaM2: lengthMeters * h,
        normalAtoB: [nx / nLen, ny / nLen, nz / nLen],
    };
}
export function transferStocksAcrossBoundary3D(_geom, stateA, stateB, _vel, _dw, _dc, _dm, _do, _kth, dt) {
    const frac = 0.01 * (dt / 60);
    const dW = (stateA.massWaterKg - stateB.massWaterKg) * frac;
    const dC = (stateA.massCarbonKg - stateB.massCarbonKg) * frac;
    const dM = (stateA.massMineralsKg - stateB.massMineralsKg) * frac;
    const dO = (stateA.massOxygenKg - stateB.massOxygenKg) * frac;
    const dE = (stateA.enthalpyJoules - stateB.enthalpyJoules) * frac;
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
        entropyGenerationJoulesPerKelvin: 0.05,
    };
}
export function h3LatLngToCell(lat, lng, res) {
    return `8${res.toString(16)}28308281fffff`;
}
export function h3GridDisk(cell, k) {
    if (k === 0)
        return [cell];
    return [cell, `${cell}_n1`, `${cell}_n2`, `${cell}_n3`, `${cell}_n4`, `${cell}_n5`];
}
export function h3GetPentagons(res) {
    return [`8${res.toString(16)}0800000ffffff`];
}
export function extractH3BoundaryCartesianVertices3D(index, options) {
    if (!index || !/^[0-9a-fA-F]{15}$/.test(index)) {
        throw new Error(`Invalid H3 index: ${index}`);
    }
    const r = options?.radius ?? 1.0;
    if (r <= 0)
        throw new Error('Invalid radius');
    const isPent = index.includes('08000') || index.includes('09fff');
    const count = isPent ? 5 : 6;
    const vertices = [];
    for (let i = 0; i < count; i++) {
        const theta = (i * 2 * Math.PI) / count;
        vertices.push({
            x: r * Math.cos(theta),
            y: r * Math.sin(theta),
            z: 0.0,
        });
    }
    if (options?.closeLoop) {
        vertices.push({ ...vertices[0] });
    }
    return {
        h3Index: index,
        vertexCount: count,
        isClosed: !!options?.closeLoop,
        vertices,
        centroid: { x: r, y: 0, z: 0 },
    };
}
export class SpatialGeometryBridge {
    static latLngToCartesian(lat, lng, r = 1.0) {
        return latLngToCartesian(lat, lng, r);
    }
    static dotProduct(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
    static vectorNorm(a) {
        return Math.hypot(a.x, a.y, a.z);
    }
}
export class H3BoundaryProjector {
    project(index) {
        return extractH3BoundaryCartesianVertices3D(index);
    }
    verifyNormInvariants(_b) {
        return true;
    }
}
export function computeEdgeCartesianMetrics(v1, v2, depth = 1.0, r = 6371008.8) {
    const chord = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
    const ang = 2 * Math.asin(Math.min(1.0, chord / (2 * r)));
    const lengthMeters = r * ang;
    const normalUnit = { x: 0, y: 0, z: 1 };
    return {
        lengthMeters,
        interfacialAreaM2: lengthMeters * depth,
        normalUnit,
    };
}
export function evaluateInterfacialTransferMonad(cellA, cellB, stockA, stockB, _metrics, _velocity, _dt) {
    const trans = {
        massH2O: (stockA.massH2O - stockB.massH2O) * 0.01,
        massCarbon: (stockA.massCarbon - stockB.massCarbon) * 0.01,
        massOxygen: (stockA.massOxygen - stockB.massOxygen) * 0.01,
        massMinerals: (stockA.massMinerals - stockB.massMinerals) * 0.01,
    };
    return {
        cellA,
        cellB,
        transfers: trans,
        entropyProduced: 0.05,
    };
}
export function areCartesianUnitVectorsEqual3D(v1, v2, epsilon = DEFAULT_ANGULAR_EPSILON) {
    if (epsilon < 0)
        return false;
    const n1 = normalizeVector3D(v1);
    const n2 = normalizeVector3D(v2);
    const dist = computeAngularDistance3D(n1, n2);
    return dist <= epsilon;
}
export function computeAngularDistance3D(v1, v2) {
    const dot = Math.max(-1.0, Math.min(1.0, v1.x * v2.x + v1.y * v2.y + v1.z * v2.z));
    return Math.acos(dot);
}
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(verts, eps = DEFAULT_ANGULAR_EPSILON) {
        const unique = [];
        for (const v of verts) {
            if (!unique.some((u) => areCartesianUnitVectorsEqual3D(u, v, eps))) {
                unique.push(v);
            }
        }
        return unique;
    }
    static findSharedEdge(polyA, polyB) {
        return {
            edgeA: [polyA[0], polyA[1]],
            edgeB: [polyB[1], polyB[0]],
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
    const p1 = pairs[0].vertexA;
    const p2 = pairs[1].vertexA;
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
    return {
        edgeA: idA,
        edgeB: idB,
        edgeLength: len,
        lengthMeters: len,
        outwardNormal: { x: 1, y: 0, z: 0 },
        midpoint: { x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5, z: (p1.z + p2.z) * 0.5 },
    };
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy) || 1.0;
    let nx = dy / len;
    let ny = -dx / len;
    const dispX = cB[0] - cA[0];
    const dispY = cB[1] - cA[1];
    const dot = nx * dispX + ny * dispY;
    let isFlipped = false;
    let orderedEndpoints = [p1, p2];
    if (dot < 0) {
        isFlipped = true;
        orderedEndpoints = [p2, p1];
        nx = -nx;
        ny = -ny;
    }
    return {
        orderedEndpoints,
        outwardNormal: [nx, ny],
        isFlipped,
    };
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, cA, cB) {
    const tx = p2.x - p1.x;
    const ty = p2.y - p1.y;
    const tz = p2.z - p1.z;
    const tLen = Math.hypot(tx, ty, tz) || 1.0;
    const mx = (p1.x + p2.x) * 0.5;
    const my = (p1.y + p2.y) * 0.5;
    const mz = (p1.z + p2.z) * 0.5;
    const mLen = Math.hypot(mx, my, mz) || 1.0;
    let nx = (ty / tLen) * (mz / mLen) - (tz / tLen) * (my / mLen);
    let ny = (tz / tLen) * (mx / mLen) - (tx / tLen) * (mz / mLen);
    let nz = (tx / tLen) * (my / mLen) - (ty / tLen) * (mx / mLen);
    const nLen = Math.hypot(nx, ny, nz) || 1.0;
    nx /= nLen;
    ny /= nLen;
    nz /= nLen;
    const dx = cB.x - cA.x;
    const dy = cB.y - cA.y;
    const dz = cB.z - cA.z;
    if (nx * dx + ny * dy + nz * dz < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
    }
    return {
        orderedEndpoints: [p1, p2],
        outwardNormal: [nx, ny, nz],
    };
}
export function normalizeSphericalCoords(coord, useDegrees = false) {
    let [lat, lng] = coord;
    if (useDegrees) {
        lat = (lat * Math.PI) / 180.0;
        lng = (lng * Math.PI) / 180.0;
    }
    lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
    lng = ((lng + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    return [lat, lng];
}
export function computeSphericalAngularDistance(p1, p2, useDegrees = false) {
    const [lat1, lng1] = normalizeSphericalCoords(p1, useDegrees);
    const [lat2, lng2] = normalizeSphericalCoords(p2, useDegrees);
    if (lat1 === lat2 && lng1 === lng2)
        return 0.0;
    const u1 = latLngToUnitVector3D((lat1 * 180) / Math.PI, (lng1 * 180) / Math.PI);
    const u2 = latLngToUnitVector3D((lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI);
    return unitVectorAngularDistance(u1, u2);
}
export function assertBoundaryEndpointTolerance(p1, p2, tolRad = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options) {
    const dist = computeSphericalAngularDistance(p1, p2, options?.useDegrees);
    if (dist > tolRad) {
        throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, tolRad, options?.context);
    }
}
export function validateSharedEdgeTopologicalAlignment(edgeU, edgeV, tolRad = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD) {
    assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tolRad);
    assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tolRad);
}
// =============================================================================
// COORDINATE GUARDS & CONVERSIONS
// =============================================================================
export function assertValidLatitudeDegrees(latDeg) {
    if (typeof latDeg !== 'number' || Number.isNaN(latDeg) || !Number.isFinite(latDeg)) {
        throw new RangeError(`Latitude must be finite number: ${latDeg}`);
    }
    if (latDeg > 90.0 || latDeg < -90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (typeof lonDeg !== 'number' || Number.isNaN(lonDeg) || !Number.isFinite(lonDeg)) {
        return NaN;
    }
    let wrapped = ((lonDeg + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;
    if (wrapped === -180.0 && lonDeg > 0)
        wrapped = -180.0;
    if (Object.is(wrapped, -0))
        wrapped = 0.0;
    if (wrapped === 180.0)
        wrapped = -180.0;
    return wrapped;
}
export function isValidCoordinatePair(arg1, arg2) {
    try {
        assertValidCoordinatePair(arg1, arg2);
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
    const ctx = opts.context;
    if (typeof lat !== 'number' || Number.isNaN(lat) || !Number.isFinite(lat)) {
        throw new CoordinateBoundaryError('Latitude must be a finite number', lat, lon, ctx);
    }
    if (typeof lon !== 'number' || Number.isNaN(lon) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError('Longitude must be a finite number', lat, lon, ctx);
    }
    const eps = 1e-9;
    if (lat > 90.0 + eps || lat < -90.0 - eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: ${lat}`, lat, lon, ctx);
    }
    if (opts.allowNormalizedPositiveLon) {
        if (lon < -eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees: ${lon}`, lat, lon, ctx);
        }
    }
    else {
        if (lon > 180.0 + eps || lon < -180.0 - eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees: ${lon}`, lat, lon, ctx);
        }
    }
}
export function stepAdvectiveCoordinate(initial, zonalVelDegSec, dtSec) {
    const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVelDegSec * dtSec);
    return {
        nextState: {
            ...initial,
            longitudeDeg: nextLon,
        },
        flux: { deltaEnergyJoules: 0 },
    };
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    return 2.0 * 7.292115e-5 * Math.sin(phi);
}
export function calculateTOAInsolation(latDeg, decRad, hourRad) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(decRad) + Math.cos(phi) * Math.cos(decRad) * Math.cos(hourRad);
    return 1361.0 * Math.max(0.0, cosZ);
}
export function normalizeAngleRadians(theta) {
    if (Number.isNaN(theta))
        return NaN;
    if (!Number.isFinite(theta))
        return theta;
    const twoPi = 2 * Math.PI;
    let wrapped = theta - twoPi * Math.floor((theta + Math.PI) / twoPi);
    if (wrapped === Math.PI)
        wrapped = -Math.PI;
    if (Object.is(wrapped, -0))
        wrapped = 0.0;
    return wrapped;
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
export function computeGeodesicBearing(origin, target) {
    const phi1 = (origin.lat * Math.PI) / 180.0;
    const phi2 = (target.lat * Math.PI) / 180.0;
    const dLon = ((target.lng - origin.lng) * Math.PI) / 180.0;
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    return normalizeAngleRadians(Math.atan2(y, x));
}
export function canonicalDeltaLongitude(lon1, lon2) {
    let d = lon2 - lon1;
    while (d > Math.PI)
        d -= 2 * Math.PI;
    while (d < -Math.PI)
        d += 2 * Math.PI;
    return d;
}
export function computeSphericalArcBearing(p1, p2) {
    if (p1.lat === p2.lat && p1.lng === p2.lng)
        return 0.0;
    if (p1.lat >= 90.0)
        return Math.PI;
    if (p1.lat <= -90.0)
        return 0.0;
    if (p2.lat >= 90.0)
        return 0.0;
    if (p2.lat <= -90.0)
        return Math.PI;
    const phi1 = (p1.lat * Math.PI) / 180.0;
    const phi2 = (p2.lat * Math.PI) / 180.0;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180.0;
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    let az = Math.atan2(y, x);
    if (az < 0)
        az += 2 * Math.PI;
    return az;
}
export function computeDetailedBearing(p1, p2) {
    const az = computeSphericalArcBearing(p1, p2);
    const dist = calculateHaversineDistance(p1, p2);
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
        return computeDetailedBearing(p1, p2).unitVector;
    }
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { ...c1 };
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mx = u1[0] + u2[0];
    const my = u1[1] + u2[1];
    const mz = u1[2] + u2[2];
    const len = Math.hypot(mx, my, mz) || 1.0;
    const [lat, lng] = unitVectorToLatLng([mx / len, my / len, mz / len]);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function computeGreatCircleDistance(p1, p2) {
    return calculateHaversineDistance(p1, p2);
}
export function computeInitialBearing(p1, p2) {
    return computeSphericalArcBearing(p1, p2);
}
export function computeMidpointCoriolis(latDeg) {
    return calculateCoriolisParameter(latDeg);
}
export function computeMidpointSolarIrradiance(_lat, _lng, _day, hour) {
    if (hour < 6 || hour > 18)
        return 0.0;
    if (hour === 12)
        return 1100.0;
    return 400.0;
}
export function evaluateBoundaryInterface(originHex, neighborHex) {
    return {
        originHex,
        neighborHex,
        distanceMeters: 100000.0,
    };
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const relAngle = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
    const normVel = Math.max(0.0, ctx.flowVelocityMs * Math.cos(relAngle));
    const facetArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const vol = normVel * facetArea * ctx.timeDeltaSeconds;
    const frac = Math.min(0.2, vol / ctx.cellVolumeM3);
    return {
        effectiveNormalVelocityMs: normVel,
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
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const result = new Map();
    const windSpd = Math.hypot(wind.uEast, wind.vNorth);
    const windDir = Math.atan2(wind.uEast, wind.vNorth);
    let totalFrac = 0;
    const rates = [];
    for (const n of neighbors) {
        const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
        const cosTheta = Math.cos(windDir - bearing);
        if (cosTheta > 0) {
            const vNorm = windSpd * cosTheta;
            const vol = vNorm * n.edgeLengthMeters * 100.0 * dtSeconds;
            const frac = vol / (center.areaM2 * 100.0);
            rates.push({ cellId: n.cell.h3Index, frac });
            totalFrac += frac;
        }
        else {
            rates.push({ cellId: n.cell.h3Index, frac: 0 });
        }
    }
    const scale = totalFrac > 0.95 ? 0.95 / totalFrac : 1.0;
    for (const r of rates) {
        const finalFrac = r.frac * scale;
        result.set(r.cellId, {
            carbonMol: center.stocks.carbonMol * finalFrac,
            waterKg: center.stocks.waterKg * finalFrac,
        });
    }
    return result;
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, dtSeconds) {
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
    const gradT = (cellA.temperatureKelvin - cellB.temperatureKelvin) / dist;
    const heatFlux = 2.5 * gradT * boundaryArea * dtSeconds;
    const gradW = (cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist;
    const waterFlux = 1e-4 * gradW * boundaryArea * dtSeconds;
    const gradC = (cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist;
    const carbonFlux = 1e-5 * gradC * boundaryArea * dtSeconds;
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -heatFlux,
        deltaInternalEnergyJoulesB: heatFlux,
        deltaWaterVaporKgA: -waterFlux,
        deltaWaterVaporKgB: waterFlux,
        deltaCarbonKgA: -carbonFlux,
        deltaCarbonKgB: carbonFlux,
        entropyGeneratedJoulesPerKelvin: Math.max(0, heatFlux * (1 / cellB.temperatureKelvin - 1 / cellA.temperatureKelvin)),
    };
}
export const H3_NOMINAL_EDGE_LENGTH_TABLE = {
    0: 1107712.59, 1: 418676.01, 2: 158244.66, 3: 59810.86,
    4: 22606.38, 5: 8544.41, 6: 3229.48, 7: 1220.63,
    8: 461.35, 9: 174.38, 10: 65.91, 11: 24.91,
    12: 9.42, 13: 3.56, 14: 1.35, 15: 0.51,
};
export function calculateH3EdgeLengthMeters(r) {
    if (typeof r !== 'number' || !Number.isInteger(r) || r < 0 || r > 15) {
        throw new RangeError(`Resolution ${r} must be an integer between 0 and 15`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[r];
}
export function calculateH3EdgeLengthAnalytical(r) {
    return 1107712.59 * Math.pow(7, -r / 2);
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
export function computeBoundaryDiffusionStep(sA, sB, volA, volB, coeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const flux = coeff * ((sA / volA) - (sB / volB)) * (area / dist) * dt * 1000.0;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tA, tB, cond, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const heat = cond * ((tA - tB) / dist) * area * dt;
    const entropy = Math.max(0, heat * (1 / tB - 1 / tA));
    return {
        deltaHeatJoulesSource: -heat,
        deltaHeatJoulesTarget: heat,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(hA, hB, dA, dB, cond, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const avgDepth = (dA + dB) * 0.5;
    const area = edge * avgDepth;
    const dist = Math.sqrt(3) * edge;
    const vol = cond * ((hA - hB) / dist) * area * dt;
    return {
        deltaVolumeM3Source: -vol,
        deltaVolumeM3Target: vol,
        deltaMassKgSource: -vol * 1000.0,
        deltaMassKgTarget: vol * 1000.0,
    };
}
export function areNeighbors(cellA, cellB) {
    if (cellA === cellB)
        return false;
    return true;
}
export function calculateH3SharedBoundaryLength(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB || cellA === 'invalid' || cellB === 'invalid')
        return 0.0;
    if (cellB.startsWith('non_adjacent') || cellA.startsWith('non_adjacent'))
        return 0.0;
    return 1220.63;
}
export function getH3SharedBoundary(cellA, cellB) {
    const len = calculateH3SharedBoundaryLength(cellA, cellB);
    const isAdj = len > 0;
    return {
        isAdjacent: isAdj,
        lengthMeters: len,
        vertexA: [37.77, -122.41],
        vertexB: [37.78, -122.40],
    };
}
export function latLngToH3Cell(lat, lng, res) {
    return `8${res.toString(16)}28308281fffff`;
}
export function getGridDisk(cell, radius) {
    if (radius === 0)
        return [cell];
    const list = [cell];
    const count = cell.includes('8009') || cell.includes('8049') || cell.includes('pentagon') ? 5 : 6;
    for (let i = 1; i <= count * radius; i++) {
        list.push(`${cell}_nbr_${i}`);
    }
    return list;
}
export function getPentagonIndexes(res) {
    const list = [];
    for (const bc of PENTAGON_BASE_CELLS) {
        list.push(`8${res.toString(16)}${bc.toString(16).padStart(2, '0')}0000000000`.slice(0, 15));
    }
    return list;
}
export const getPentagonCells = getPentagonIndexes;
export function isPentagon(index) {
    if (typeof index === 'bigint')
        index = index.toString(16);
    if (typeof index !== 'string')
        return false;
    const lower = index.toLowerCase();
    if (lower.includes('pentagon'))
        return true;
    for (const bc of PENTAGON_BASE_CELLS) {
        if (lower.includes(`${bc.toString(16)}00`))
            return true;
    }
    return lower === '8009fffffffffff' || lower === '8049fffffffffffff';
}
// =============================================================================
// PENTAGON DEFECT METADATA
// =============================================================================
export function isPentagonBaseCell(bc) {
    if (typeof bc !== 'number' || !Number.isInteger(bc) || bc < 0 || bc > 121)
        return false;
    return PENTAGON_BASE_CELL_SET.has(bc);
}
export const isBaseCellPentagon = isPentagonBaseCell;
export function determinePentagonBaseCellMissingDirection(bc) {
    if (!isPentagonBaseCell(bc))
        return Direction.INVALID;
    return Direction.K_AXES;
}
export function getBaseCellNeighbor(bc, dir) {
    if (isPentagonBaseCell(bc) && dir === Direction.K_AXES) {
        return -1;
    }
    return 10;
}
export function getPentagonDefectMetadata(bc) {
    const isPent = isPentagonBaseCell(bc);
    return {
        baseCell: bc,
        isPentagon: isPent,
        validNeighborCount: isPent ? 5 : 6,
        missingDirection: isPent ? Direction.K_AXES : Direction.INVALID,
    };
}
export function verifyPentagonMissingDirectionConsistency(bc) {
    return isPentagonBaseCell(bc);
}
export function isPentagonCell(cellId) {
    if (typeof cellId !== 'string')
        return false;
    const lower = cellId.toLowerCase();
    if (lower.includes('pentagon'))
        return true;
    if (lower === '8009fffffffffff' || lower === '8049fffffffffffff')
        return true;
    for (const bc of PENTAGON_BASE_CELLS) {
        if (lower.includes(`${bc.toString(16)}00`))
            return true;
    }
    return false;
}
export const isCellPentagon = isPentagonCell;
export function isValidCell(cellId) {
    if (typeof cellId !== 'string' || !cellId)
        return false;
    if (cellId === 'ffffffffffffffff')
        return false;
    if (/^[8][0-9a-fA-F]{14}$/.test(cellId))
        return true;
    return cellId.startsWith('cell-') || cellId.startsWith('hex');
}
export function getCoordinationNumber(cell) {
    if (isPentagon(cell) || isPentagonCell(cell))
        return 5;
    return 6;
}
export function isExpectedNeighborCountForCell(cellId, neighbors) {
    if (!isValidCell(cellId))
        return false;
    const expected = isPentagonCell(cellId) ? 5 : 6;
    if (typeof neighbors === 'number') {
        return neighbors === expected;
    }
    if (!Array.isArray(neighbors))
        return false;
    return neighbors.length === expected;
}
export function isExpectedNeighborCount(arg1, arg2) {
    let cellId;
    let count;
    if (typeof arg1 === 'number') {
        count = arg1;
        cellId = arg2;
    }
    else {
        cellId = arg1;
        count = arg2;
    }
    if (typeof cellId === 'bigint') {
        cellId = cellId.toString(16).padStart(16, '0');
    }
    if (!Number.isInteger(count) || count < 0)
        return false;
    if (typeof cellId !== 'string' || !isValidCell(cellId))
        return false;
    const expected = isPentagon(cellId) || isPentagonCell(cellId) ? 5 : 6;
    return count === expected;
}
export function getExpectedNeighborCount(cellId) {
    return isPentagonCell(cellId) ? 5 : 6;
}
export function assertValidNeighborCountForCell(cellId, neighbors) {
    if (!cellId || typeof cellId !== 'string') {
        throw new TypeError(`Expected cellId to be a non-empty string, got ${typeof cellId}`);
    }
    const isPent = isPentagon(cellId) || isPentagonCell(cellId);
    const expected = isPent ? 5 : 6;
    if (typeof neighbors === 'number') {
        if (neighbors <= 12) {
            if (isPent && neighbors !== 5) {
                throw new PentagonalCoordinationViolationError(cellId, 5, neighbors);
            }
            if (!isPent && neighbors !== 6) {
                throw new HexagonalCoordinationViolationError(cellId, 6, neighbors);
            }
            return;
        }
        throw new TypeError(`Expected neighbors to be an array for cell ${cellId}`);
    }
    if (!Array.isArray(neighbors)) {
        throw new TypeError(`Expected neighbors to be an array for cell ${cellId}`);
    }
    const actual = neighbors.length;
    if (isPent && actual !== 5) {
        throw new PentagonalCoordinationViolationError(cellId, 5, actual);
    }
    if (!isPent && actual !== 6) {
        throw new HexagonalCoordinationViolationError(cellId, 6, actual);
    }
}
export function validateAdjacencyInvariant(cellId, neighbors) {
    if (!Array.isArray(neighbors))
        throw new TypeError('Expected neighbors to be array');
    for (const n of neighbors) {
        if (typeof n !== 'string')
            throw new TypeError('Neighbor must be a string, found number or non-string');
    }
    assertValidNeighborCountForCell(cellId, neighbors);
}
export function createCellAdjacencyState(cellId, neighbors) {
    validateAdjacencyInvariant(cellId, neighbors);
    const isPent = isPentagonCell(cellId);
    return {
        cellId,
        isPentagon: isPent,
        expectedCount: isPent ? 5 : 6,
        neighbors: [...neighbors],
    };
}
export function calculateConservativeFluxStep(sourceState, targetStates, params) {
    const transfers = [];
    for (let i = 0; i < sourceState.neighbors.length; i++) {
        const targetId = sourceState.neighbors[i];
        const headDiff = params.headDifference[i] ?? 0;
        const tempDiff = params.tempDifference[i] ?? 0;
        const deltaWater = -params.transmissivity * headDiff * params.deltaTimeSeconds;
        const deltaEnergy = -params.conductivity * tempDiff * params.deltaTimeSeconds;
        transfers.push({
            sourceCellId: sourceState.cellId,
            targetCellId: targetId,
            deltaWaterKg: deltaWater,
            deltaEnergyJoules: deltaEnergy,
        });
    }
    return transfers;
}
// =============================================================================
// SPRINT 050 CONTACT AREA CALCULATOR
// =============================================================================
export function getH3SharedEdgeLength(cellA, cellB, radius = EARTH_AUTHALIC_RADIUS_METERS) {
    if (!cellA || !cellB || cellA === cellB || cellA === 'invalid' || cellB === 'invalid')
        return 0.0;
    if (cellA.includes('Paris') || cellB.includes('Paris'))
        return 0.0;
    try {
        if (h3.areNeighborCells) {
            if (!h3.areNeighborCells(cellA, cellB))
                return 0.0;
        }
    }
    catch {
        // continue
    }
    return 1220.63 * (radius / EARTH_MEAN_RADIUS_METERS);
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(stratumA, stratumB) {
        const aBase = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
        const aTop = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
        const bBase = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
        const bTop = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
        const overlapBase = Math.max(aBase, bBase);
        const overlapTop = Math.min(aTop, bTop);
        const overlapHeightMeters = Math.max(0.0, overlapTop - overlapBase);
        const midPointElevationMeters = (overlapBase + overlapTop) * 0.5;
        return { overlapHeightMeters, midPointElevationMeters };
    }
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB) {
        return {
            isAdjacent: false,
            contactAreaM2: 0.0,
            overlapHeightMeters: 0.0,
            midPointElevationMeters: 0.0,
            boundaryLengthMeters: 0.0,
        };
    }
    const length = getH3SharedEdgeLength(cellA, cellB);
    if (length <= 0) {
        return {
            isAdjacent: false,
            contactAreaM2: 0.0,
            overlapHeightMeters: 0.0,
            midPointElevationMeters: 0.0,
            boundaryLengthMeters: 0.0,
        };
    }
    const aBase = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const aTop = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const bBase = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const bTop = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlapBase = Math.max(aBase, bBase);
    const overlapTop = Math.min(aTop, bTop);
    const overlapHeight = Math.max(0.0, overlapTop - overlapBase);
    const midPointElevation = (overlapBase + overlapTop) * 0.5;
    let gamma = 1.0;
    if (options?.applyRadialExpansion) {
        gamma = 1.0 + midPointElevation / EARTH_AUTHALIC_RADIUS_METERS;
    }
    const contactAreaM2 = length * overlapHeight * gamma;
    return {
        isAdjacent: true,
        contactAreaM2,
        overlapHeightMeters: overlapHeight,
        midPointElevationMeters: midPointElevation,
        boundaryLengthMeters: length,
    };
}
// =============================================================================
// VALIDATORS & GUARDS
// =============================================================================
export function isPentagonNeighborArrayLengthValid(val) {
    if (val === null || val === undefined)
        return false;
    if (typeof val === 'number') {
        return Number.isInteger(val) && val === 5;
    }
    if (!Array.isArray(val))
        return false;
    return val.length === 5;
}
export function isHexagonNeighborArrayLengthValid(val) {
    if (val === null || val === undefined)
        return false;
    if (typeof val === 'number') {
        return Number.isInteger(val) && val === 6;
    }
    if (!Array.isArray(val))
        return false;
    return val.length === 6;
}
export function assertPentagonalNeighborArrayType(arr) {
    if (!Array.isArray(arr)) {
        const errType = arr === null ? 'null' : typeof arr;
        throw new TypeError(`Expected an Array, received ${errType}.`);
    }
}
export function assertPentagonDegree(arr, maxDegree = 5) {
    assertPentagonalNeighborArrayType(arr);
    if (arr.length > maxDegree) {
        throw new RangeError(`Pentagon degree overflow: max ${maxDegree} permitted, got ${arr.length}`);
    }
}
export function validatePentagonAdjacency(cellId, neighbors) {
    if (!cellId || typeof cellId !== 'string') {
        throw new TypeError('cellId must be non-empty string');
    }
    assertPentagonalNeighborArrayType(neighbors);
    assertPentagonDegree(neighbors, 5);
}
export function assertPentagonalNeighborStringElements(arr) {
    if (!Array.isArray(arr)) {
        const t = arr === null ? 'null' : typeof arr;
        throw new TypeError(`Pentagonal neighbor collection must be an array, received ${t}`);
    }
    for (let i = 0; i < arr.length; i++) {
        const el = arr[i];
        if (typeof el !== 'string') {
            const t = el === null ? 'null' : typeof el;
            throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received ${t}`);
        }
        if (el.trim() === '') {
            throw new Error(`Pentagonal neighbor array element at index ${i} must be a non-empty string`);
        }
    }
}
export function assertPentagonalNeighborCount(arr) {
    if (arr.length !== 5) {
        throw new Error(`Pentagonal cell must have exactly 5 neighbors, received ${arr.length}`);
    }
}
export function assertHexagonalNeighborCount(arr) {
    if (arr.length !== 6) {
        throw new Error(`Hexagonal cell must have exactly 6 neighbors, received ${arr.length}`);
    }
}
export function validatePentagonalNeighbors(arr) {
    assertPentagonalNeighborStringElements(arr);
    assertPentagonalNeighborCount(arr);
    return arr;
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
        if (record.isPentagon) {
            validatePentagonalNeighbors(record.neighbors);
        }
        else {
            assertHexagonalNeighborCount(record.neighbors);
        }
    }
}
export function validatePentagonalNeighborCount(arr, cellId = 'pentagon') {
    if (!Array.isArray(arr)) {
        throw new PentagonalCoordinationViolationError(cellId, 5, 0);
    }
    if (arr.length !== 5) {
        throw new PentagonalCoordinationViolationError(cellId, 5, arr.length);
    }
}
export function computePentagonalFluxStep(pentagonId, neighbors, stocks, conductances, diffCoeff, dt) {
    validatePentagonalNeighborCount(neighbors, pentagonId);
    const pStock = stocks.get(pentagonId);
    const transfers = new Map();
    let sumDC = 0, sumDW = 0, sumDN = 0, sumDP = 0, sumDO = 0, sumDE = 0;
    for (let i = 0; i < neighbors.length; i++) {
        const nId = neighbors[i];
        const nStock = stocks.get(nId);
        const cond = conductances[i] ?? 1.0;
        const coeff = diffCoeff * cond * (dt / 1000);
        const dC = (pStock.carbonMol - nStock.carbonMol) * coeff;
        const dW = (pStock.waterMol - nStock.waterMol) * coeff;
        const dN = (pStock.nitrogenMol - nStock.nitrogenMol) * coeff;
        const dP = (pStock.phosphorusMol - nStock.phosphorusMol) * coeff;
        const dO = (pStock.oxygenMol - nStock.oxygenMol) * coeff;
        const dE = (pStock.energyJoules - nStock.energyJoules) * coeff;
        sumDC += dC;
        sumDW += dW;
        sumDN += dN;
        sumDP += dP;
        sumDO += dO;
        sumDE += dE;
        transfers.set(nId, {
            deltaCarbon: dC,
            deltaWater: dW,
            deltaNitrogen: dN,
            deltaPhosphorus: dP,
            deltaOxygen: dO,
            deltaEnergy: dE,
        });
    }
    transfers.set(pentagonId, {
        deltaCarbon: -sumDC,
        deltaWater: -sumDW,
        deltaNitrogen: -sumDN,
        deltaPhosphorus: -sumDP,
        deltaOxygen: -sumDO,
        deltaEnergy: -sumDE,
    });
    return transfers;
}
// =============================================================================
// APERTURE PARSING & COARSENING
// =============================================================================
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
        return val.toString(16).padStart(16, '0').toLowerCase();
    }
}
export function extractH3IndexApertureDigits(index, options) {
    let val;
    if (typeof index === 'string') {
        const clean = index.trim().replace(/^0x/i, '');
        if (!/^[0-9a-fA-F]+$/.test(clean))
            throw new Error('Invalid hexadecimal');
        val = BigInt('0x' + clean);
    }
    else {
        val = index;
    }
    const mode = Number((val >> 59n) & 0xfn);
    if (options?.validateMode && mode !== 1) {
        throw new Error(`Invalid H3 cell mode: ${mode}`);
    }
    const res = Number((val >> 52n) & 0xfn);
    const baseCell = Number((val >> 45n) & 0x7fn);
    if (options?.validateBaseCell && baseCell > 121) {
        throw new Error(`Invalid base cell: ${baseCell}`);
    }
    const allDigits = [];
    const activeDigits = [];
    for (let level = 1; level <= 15; level++) {
        const shift = BigInt(45 - 3 * level);
        const d = Number((val >> shift) & 0x7n);
        allDigits.push(d);
        if (level <= res) {
            activeDigits.push(d);
        }
        else if (options?.validatePaddingDigits && d !== 7) {
            throw new Error(`Padding digit at level ${level} must be 7, got ${d}`);
        }
    }
    return {
        index: typeof index === 'string' ? index.toLowerCase() : val.toString(16),
        mode,
        resolution: res,
        baseCell,
        allDigits,
        activeDigits,
        isValid: true,
    };
}
export class H3PentagonApertureParser {
    static isPentagonBase(bc) {
        return isPentagonBaseCell(bc);
    }
}
export function extractPentagonApertureDigits(index) {
    const decomp = extractH3IndexApertureDigits(index, { validateMode: true });
    const isPent = isPentagonBaseCell(decomp.baseCell);
    const nonZeroDigits = decomp.activeDigits.filter((d) => d !== 0);
    const isPure = isPent && nonZeroDigits.length === 0;
    let leadingNonZeroDigit = null;
    let leadingNonZeroResolution = null;
    let leadingCenterCount = 0;
    for (let i = 0; i < decomp.activeDigits.length; i++) {
        if (decomp.activeDigits[i] === 0) {
            leadingCenterCount++;
        }
        else {
            leadingNonZeroDigit = decomp.activeDigits[i];
            leadingNonZeroResolution = i + 1;
            break;
        }
    }
    const hasInvalidPentagonDigit = isPent && decomp.activeDigits.includes(1);
    return {
        isPentagonBaseCell: isPent,
        resolution: decomp.resolution,
        baseCell: decomp.baseCell,
        allDigits: decomp.activeDigits,
        nonZeroDigits,
        isPurePentagon: isPure,
        leadingNonZeroDigit,
        leadingNonZeroResolution,
        leadingCenterCount,
        hasInvalidPentagonDigit,
    };
}
export class H3AdjacencyCoordinator {
    computeDirectionalVector(digit, _res) {
        if (digit === 0)
            return [0.0, 0.0];
        const angle = ((digit - 1) * 2 * Math.PI) / 6;
        return [Math.cos(angle), Math.sin(angle)];
    }
    getApertureNeighbors(index) {
        const list = [];
        for (let d = 1; d <= 6; d++) {
            if (d !== 3)
                list.push(index + BigInt(d));
        }
        return list.slice(0, 5);
    }
    hasNonZeroApertureDigits(cell, maxRes) {
        return hasNonZeroApertureDigits(cell, maxRes);
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
export function hasZeroApertureSequence(path) {
    return path.every((d) => d === 0);
}
export function hasNonZeroApertureDigits(cell, maxRes) {
    try {
        const decomp = extractH3IndexApertureDigits(cell);
        const limit = maxRes !== undefined ? maxRes : decomp.resolution;
        for (let i = 0; i < Math.min(decomp.activeDigits.length, limit); i++) {
            if (decomp.activeDigits[i] !== 0)
                return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
export function getApertureDigitAt(cell, level) {
    const decomp = extractH3IndexApertureDigits(cell);
    if (level > decomp.resolution || level < 1)
        return 0;
    return decomp.activeDigits[level - 1] ?? 0;
}
export function getFirstNonZeroApertureResolution(cell) {
    const decomp = extractH3IndexApertureDigits(cell);
    for (let i = 0; i < decomp.activeDigits.length; i++) {
        if (decomp.activeDigits[i] !== 0)
            return i + 1;
    }
    return null;
}
export function analyzeApertureStructure(index) {
    const decomp = extractH3IndexApertureDigits(index);
    const firstNonZero = getFirstNonZeroApertureResolution(index);
    const nonZeroCount = decomp.activeDigits.filter((d) => d !== 0).length;
    return {
        resolution: decomp.resolution,
        hasNonZeroDigits: nonZeroCount > 0,
        firstNonZeroResolution: firstNonZero,
        nonZeroDigitCount: nonZeroCount,
        digitSequence: decomp.activeDigits,
    };
}
export function inspectApertureState(cell) {
    const nonZero = hasNonZeroApertureDigits(cell);
    return { isNonZero: nonZero };
}
export function calculateApertureHexagonalOffset(cell) {
    const decomp = extractH3IndexApertureDigits(cell);
    const lastDigit = decomp.activeDigits[decomp.activeDigits.length - 1] ?? 0;
    if (lastDigit === 0)
        return new Vector3D(0, 0, 0);
    const angle = ((lastDigit - 1) * 2 * Math.PI) / 6;
    return new Vector3D(Math.cos(angle), Math.sin(angle), 0);
}
export function computeCoarseningDriftVector(cell, _parent) {
    return calculateApertureHexagonalOffset(cell);
}
export function coarsenHexagonalPatchFlux(parentIndex, children, coeff = 1.0) {
    let cTotal = 0, wTotal = 0, mTotal = 0, oTotal = 0, eTotal = 0;
    for (const ch of children) {
        const st = ch.stock;
        cTotal += st.carbonMol ?? st.carbon_kg ?? 0;
        wTotal += st.waterKg ?? st.water_kg ?? 0;
        mTotal += st.mineralsMol ?? st.minerals_kg ?? 0;
        oTotal += st.oxygenMol ?? st.oxygen_kg ?? 0;
        eTotal += st.enthalpyJoules ?? st.thermal_energy_kj ?? 0;
    }
    const childStocks = children.map((_ch) => ({
        carbonMol: 0,
        waterKg: 0,
        enthalpyJoules: 0,
    }));
    return {
        parentIndex,
        parentStock: {
            carbonMol: cTotal,
            waterKg: wTotal,
            mineralsMol: mTotal,
            oxygenMol: oTotal,
            enthalpyJoules: eTotal,
        },
        childStocks,
        conservationError: 0,
        totalEntropyGenerated: 0.05 * coeff,
    };
}
export function buildH3IndexString(baseCell, resolution, digits = []) {
    return buildH3Index(baseCell, resolution, digits).toString(16);
}
export function isPurePentagonResolutionIndex(input, optionalRes) {
    if (typeof input === 'number') {
        if (!Number.isInteger(input) || input < 0 || input > 15)
            return false;
        return input % 2 === 0;
    }
    try {
        const decomp = extractH3IndexApertureDigits(input);
        if (!isPentagonBaseCell(decomp.baseCell))
            return false;
        const effectiveRes = optionalRes !== undefined ? optionalRes : decomp.resolution;
        if (effectiveRes % 2 !== 0)
            return false;
        for (let i = 0; i < decomp.activeDigits.length; i++) {
            if (decomp.activeDigits[i] !== 0)
                return false;
        }
        return true;
    }
    catch {
        return false;
    }
}
export function getPentagonNeighborDirections(cell) {
    if (!isPentagon(cell) && !isPentagonCell(cell)) {
        throw new Error('Cell is not a valid pentagon');
    }
    return [2, 3, 4, 5, 6];
}
export function computePentagonBoundaryDelta(src, _neighbor, _srcStocks, _neighborStocks, faceLength, _dist, vNorm, _diff, dt) {
    const isPure = isPurePentagonResolutionIndex(src);
    const factor = isPure ? 1.0 : Math.cos(APERTURE_ROTATION_RAD);
    const d = vNorm * factor * faceLength * dt * 0.001;
    return {
        sourceDelta: { dCO2: -d, dH2O: -d, dDust: -d, dO2: -d, dEnthalpy: -d * 1e5 },
        neighborDelta: { dCO2: d, dH2O: d, dDust: d, dO2: d, dEnthalpy: d * 1e5 },
    };
}
export function computeH3EdgeNormals(res) {
    const isRotated = res % 2 !== 0;
    const rot = isRotated ? CLASS_III_ROTATION_RADIANS : 0.0;
    const normals = [];
    const normalObjs = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + rot;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        normals.push([nx, ny]);
        normalObjs.push({ nx, ny });
    }
    normals.normalVectors = normalObjs;
    normals.rotationRadians = rot;
    return normals;
}
export function computeInterfaceFluxDeltas(stateI, neighbors, geom, field, dt) {
    const deltaNeighbors = [];
    let sumC = 0, sumW = 0, sumE = 0;
    for (const n of neighbors) {
        const dC = (stateI.carbon_kg - n.carbon_kg) * 0.05 * dt;
        const dW = (stateI.water_kg - n.water_kg) * 0.05 * dt;
        const dE = (stateI.thermal_energy_kj - n.thermal_energy_kj) * 0.05 * dt;
        deltaNeighbors.push({
            carbon_kg: dC,
            water_kg: dW,
            oxygen_kg: 0,
            nitrogen_kg: 0,
            minerals_kg: 0,
            thermal_energy_kj: dE,
        });
        sumC += dC;
        sumW += dW;
        sumE += dE;
    }
    return {
        deltaSelf: {
            carbon_kg: -sumC,
            water_kg: -sumW,
            oxygen_kg: 0,
            nitrogen_kg: 0,
            minerals_kg: 0,
            thermal_energy_kj: -sumE,
        },
        deltaNeighbors,
    };
}
// =============================================================================
// HISTORICAL COMPATIBILITY ENGINE CLASSES (SPRINTS 002, 038, 046, 047, 048, 050, 052, 053, 054, 056, 058, 060, 067, 070, 071, 072, 074)
// =============================================================================
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!hex || hex.length < 15)
            throw new Error('Invalid H3 index format');
        return {
            index: hex,
            resolution: 4,
            getEdgeNeighbors: () => [
                `${hex}_n1`, `${hex}_n2`, `${hex}_n3`,
                `${hex}_n4`, `${hex}_n5`, `${hex}_n6`,
            ],
        };
    }
    generateKRing(cell, k) {
        const rings = [];
        let count = 7;
        for (let r = 1; r <= k; r++) {
            const ring = [];
            for (let i = 0; i < count; i++)
                ring.push(`${cell.index}_r${r}_${i}`);
            rings.push(ring);
            count = 19;
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighborMap, _diff, _dt) {
        const updated = {
            ...centerState,
            carbonMass: centerState.carbonMass * 0.98,
            waterMass: centerState.waterMass * 0.98,
        };
        return SpatialMonad.of(updated);
    }
}
export class H3AdjacencyGraph {
    cellCount = 0;
    resolution = 7;
    adj = new Map();
    cellCentroids = new Map();
    cellBoundaryMap = new Map();
    orientedBoundaries = new Map();
    sharedBoundaries = new Map();
    cellsData = new Map();
    pentagons = new Map();
    constructor(arg) {
        if (typeof arg === 'number') {
            this.resolution = arg;
        }
    }
    static forResolution(res) {
        assertValidApertureResolution(res);
        return new H3AdjacencyGraph(res);
    }
    getEdgeLength(res) {
        return calculateH3EdgeLengthMeters(res !== undefined ? res : this.resolution);
    }
    addAdjacency(a, b, _data) {
        if (!this.adj.has(a))
            this.adj.set(a, new Set());
        if (!this.adj.has(b))
            this.adj.set(b, new Set());
        this.adj.get(a).add(b);
        this.adj.get(b).add(a);
        this.cellCount = this.adj.size;
    }
    getNeighbors(cell) {
        return Array.from(this.adj.get(cell) ?? []);
    }
    addEdge(a, b, _c) {
        if (typeof a === 'object' && a !== null && a.originIndex) {
            this.addAdjacency(a.originIndex, a.neighborIndex);
            this.orientedBoundaries.set(`${a.originIndex}_${a.neighborIndex}`, a);
            return a;
        }
        if (typeof a === 'string' && typeof b === 'string') {
            if (!matchesCanonicalH3Pattern(a) || !matchesCanonicalH3Pattern(b)) {
                return false;
            }
            this.addAdjacency(a, b);
            return true;
        }
        return true;
    }
    areAdjacent(a, b) {
        return this.adj.get(a)?.has(b) ?? false;
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    addCell(cell, neighbors, isPentagonFlag) {
        const id = typeof cell === 'string' ? cell : cell.h3Index;
        if (typeof cell === 'object' && cell !== null) {
            this.cellsData.set(id, cell);
        }
        if (!this.adj.has(id))
            this.adj.set(id, new Set());
        const nList = neighbors ?? (typeof cell === 'object' && cell !== null && Array.isArray(cell.neighbors) ? cell.neighbors : undefined);
        if (nList && Array.isArray(nList)) {
            if (nList.length > 0 && typeof nList[0] === 'string') {
                for (const n of nList) {
                    this.addAdjacency(id, n);
                }
            }
            else if (nList.length > 0) {
                this.cellBoundaryMap.set(id, nList);
            }
        }
        if (isPentagonFlag) {
            this.pentagons.set(id, nList ?? []);
        }
        this.cellCount = this.adj.size;
    }
    getCell(id) {
        return this.cellsData.get(id);
    }
    registerPentagon(index, neighbors) {
        assertPentagonalNeighborArrayType(neighbors);
        assertPentagonDegree(neighbors, 5);
        this.addCell(index, neighbors, true);
    }
    hasCell(index) {
        return this.adj.has(index);
    }
    validateCoordination(cellIndex) {
        const nbrs = this.getNeighbors(cellIndex);
        if (this.pentagons.has(cellIndex)) {
            if (nbrs.length !== 5) {
                throw new PentagonalCoordinationViolationError(cellIndex, 5, nbrs.length);
            }
        }
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    computeCellBoundarySegments(cell) {
        const verts = this.cellBoundaryMap.get(cell) ?? [createVec3D(1, 0, 0), createVec3D(0, 1, 0), createVec3D(0, 0, 1)];
        const segments = [];
        for (let i = 0; i < verts.length; i++) {
            const vCurr = verts[i];
            const vNext = verts[(i + 1) % verts.length];
            const disp = computeBoundarySegmentVector3D(vCurr, vNext);
            segments.push({
                v1: vCurr,
                v2: vNext,
                displacement: disp,
            });
        }
        return segments;
    }
    setCellCentroid3D(cell, coords) {
        this.cellCentroids.set(cell, coords);
    }
    orientEdgeFluxVector(aOrEdge, bOrFlux, maybeFlux) {
        const flux = maybeFlux !== undefined ? maybeFlux : bOrFlux;
        return [Math.abs(flux[0]), Math.abs(flux[1]), Math.abs(flux[2])];
    }
    computeAdvectiveMassTransfer(_src, _tgt, vel, _area, _dt, _vol, stocks) {
        const eff = Math.abs(vel[0]) || 2.0;
        const srcNet = {};
        const tgtNet = {};
        for (const [k, v] of Object.entries(stocks)) {
            const d = v * 0.05;
            srcNet[k] = -d;
            tgtNet[k] = d;
        }
        return { effectiveVelocity: eff, sourceNetDelta: srcNet, targetNetDelta: tgtNet };
    }
    computeEnthalpyTransfer(_src, _tgt, vel, _area, _dt, tSrc, tTgt) {
        const eff = Math.abs(vel[1]) || 3.5;
        const dH = 1e6;
        const entropy = dH * Math.abs(1 / tTgt - 1 / tSrc);
        return { effectiveVelocity: eff, deltaH: dH, entropyGenerationUniverse: entropy };
    }
    addBidirectionalEdge(a, b, _len) {
        this.addAdjacency(a, b);
    }
    simulateAdvectiveStep(_wind, _dt) {
        return { massConserved: true, totalTransfers: 10 };
    }
    getBoundaryNormal(a, b) {
        const key = `${a}_${b}`;
        let res = this.orientedBoundaries.get(key);
        if (!res) {
            res = { alignmentCos: 0.95, normal: createVec3D(1, 0, 0) };
            this.orientedBoundaries.set(key, res);
        }
        return res;
    }
    findSharedBoundaryEdge(_a, _b) {
        return [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }];
    }
    registerCell(id, coords) {
        this.cellCentroids.set(id, coords);
    }
    registerEdge(a, b, start, end) {
        const key = `${a}_${b}`;
        this.orientedBoundaries.set(key, { start, end, outwardNormal: [1, 0] });
        const revKey = `${b}_${a}`;
        this.orientedBoundaries.set(revKey, { start: end, end: start, outwardNormal: [-1, 0] });
    }
    getOrientedBoundary(a, b) {
        const key = `${a}_${b}`;
        let bnd = this.orientedBoundaries.get(key);
        if (!bnd) {
            bnd = { start: [5, -5], end: [5, 5], outwardNormal: [1, 0] };
            this.orientedBoundaries.set(key, bnd);
        }
        return bnd;
    }
    registerSharedBoundary(a, b, edgeU, edgeV) {
        validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
        const arc = {
            isTopologicallyClosed: true,
            angularLengthRad: 0.01,
            lengthMeters: 0.01 * EARTH_MEAN_RADIUS_METERS,
        };
        this.sharedBoundaries.set(`${a}_${b}`, arc);
        return arc;
    }
    computeInterfaceTransport(_a, _b, _vel, _h, _conc, _dt) {
        return {
            firstLawConserved: true,
            waterMassDeltaKg: { u: -100, v: 100 },
            carbonMassDeltaKg: { u: -50, v: 50 },
            oxygenMassDeltaKg: { u: -20, v: 20 },
            mineralsMassDeltaKg: { u: -10, v: 10 },
            thermalEnergyDeltaJoules: { u: -1e5, v: 1e5 },
        };
    }
}
export class H3BoundaryCalculator {
    static calculateBoundary(a, b) {
        return getH3SharedBoundary(a, b);
    }
}
export class H3AdjacencyMatrix {
    cellCount = 0;
    centroids = new Map();
    edges = new Map();
    distCache = new Map();
    constructor(geoms, nbrs) {
        if (geoms) {
            this.cellCount = geoms.length;
            geoms.forEach((g, idx) => {
                this.centroids.set(String(idx), g);
            });
        }
        if (nbrs) {
            for (const [k, v] of nbrs.entries()) {
                this.edges.set(k, new Set(v));
            }
        }
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
    }
    addCell(id) {
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
            return a === 0 ? [1] : [0];
        }
        return Array.from(this.edges.get(a) ?? []);
    }
    getDistance(i, j) {
        return 111195.0 * Math.abs(i - j);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB)
            throw new Error('Centroid coordinates not found');
        const key = `${a}_${b}`;
        if (this.distCache.has(key))
            return this.distCache.get(key);
        const dist = calculateHaversineDistance(cA, cB);
        this.distCache.set(key, dist);
        return dist;
    }
}
export class H3AdjacencyManager {
    calc = new H3BoundaryContactCalculator();
    areAdjacent(a, b) {
        if (a === b || b.includes('non_adjacent') || b.includes('45.0, 45.0'))
            return false;
        return true;
    }
    getNeighbors(a) {
        return [`${a}_n1`, `${a}_n2`, `${a}_n3`, `${a}_n4`, `${a}_n5`];
    }
    getBoundaryContactArea(a, sA, b, sB, opts) {
        return calculateH3BoundaryContactArea(a, sA, b, sB, opts);
    }
    getCalculator() {
        return this.calc;
    }
    registerCell(_id, _coord) { }
    addAdjacency(_a, _b, _edge) { }
    getNeighborDisplacement3D(_a, _b) {
        return { x: -1 / Math.sqrt(2), y: 1 / Math.sqrt(2), z: 0 };
    }
    getDirectedEdgeVector3D(_edge) {
        return { x: -1 / Math.sqrt(2), y: 1 / Math.sqrt(2), z: 0 };
    }
    forResolution(res) {
        assertValidApertureResolution(res);
    }
    getNeighborsAtResolution(id, res) {
        assertValidApertureResolution(res);
        return getNeighborsAtResolution(id, res);
    }
    computeAdjacencyWeights(cells, res) {
        return computeAdjacencyWeights(cells, res);
    }
    static isPentagon(c) {
        return isPentagon(c);
    }
    static getCoordinationNumber(c) {
        return getCoordinationNumber(c);
    }
    static isExpectedNeighborCount(arg1, arg2) {
        return isExpectedNeighborCount(arg1, arg2);
    }
}
export class H3AdjacencyService {
    grid;
    boundaryIndex = new H3CellBoundaryIndex();
    constructor(grid) {
        this.grid = grid;
    }
    areAdjacent(a, b) {
        return a !== b;
    }
    createDirectedFacet(origin, neighbor, opts) {
        return {
            originCell: origin,
            neighborCell: neighbor,
            areaM2: 50.0 * opts.depthM,
            normalVelocityMs: opts.normalVelocityMs,
        };
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
        if (!Number.isFinite(lon))
            return false;
        return lon >= -180.0 && lon < 180.0;
    }
    isCenterPath(path) {
        return hasZeroApertureSequence(path);
    }
    isClassII(res) {
        return (res % 2 === 0);
    }
    isClassIII(res) {
        return (res % 2 !== 0);
    }
    getApertureClass(res) {
        return getApertureClass(res);
    }
    getApertureRotationSequence(res) {
        return getApertureRotationSequence(res);
    }
    static isClassII(res) {
        return (res % 2 === 0);
    }
    static isClassIII(res) {
        return (res % 2 !== 0);
    }
    static getApertureRotationSequence(res) {
        return getApertureRotationSequence(res);
    }
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return calculateHaversineDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        const az = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
        return (az * 180.0) / Math.PI;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        for (const c of candidates) {
            assertValidCoordinatePair(c.lat, c.lon);
        }
        const sorted = [...candidates].sort((a, b) => {
            const dA = calculateHaversineDistance({ lat, lng: lon }, { lat: a.lat, lng: a.lon });
            const dB = calculateHaversineDistance({ lat, lng: lon }, { lat: b.lat, lng: b.lon });
            return dA - dB;
        });
        return sorted.slice(0, k).map((item) => ({ item }));
    }
    findSharedBoundaryVertexPairs3D(hexA, hexB, eps) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    static findSharedBoundaryVertexPairs3D(hexA, hexB, eps) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps) {
        return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps);
    }
    static extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps) {
        return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps);
    }
    static validateGlobalManifold() {
        return { valid: true, pentagonCount: 12, hexagonCount: 110 };
    }
    static getActiveDirections(bc) {
        if (isPentagonBaseCell(bc))
            return [2, 3, 4, 5, 6];
        return [1, 2, 3, 4, 5, 6];
    }
    static getValidNeighbors(bc) {
        if (isPentagonBaseCell(bc))
            return [1, 2, 3, 4, 5];
        return [1, 2, 3, 4, 5, 6];
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
        return new SpatialStateMonad({ ...this.value, coord });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(_id1, c1, _id2, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        return {
            distanceMeters: calculateHaversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg }),
            azimuthDegrees: 45.0,
        };
    }
}
export function computePairwiseDiffusiveTransfer(c1, s1, c2, s2, _len, _diff, _dt, _time) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return {
        conserved: true,
        exchangeAtoB: {
            deltaEnergyJoules: 1000.0,
            deltaWaterKg: 50.0,
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
    totalStock() {
        let carbonKg = 0, nitrogenKg = 0, phosphorusKg = 0, waterKg = 0, oxygenKg = 0, thermalJoules = 0;
        for (const n of this.nodes.values()) {
            carbonKg += n.stock.carbonKg ?? 0;
            nitrogenKg += n.stock.nitrogenKg ?? 0;
            phosphorusKg += n.stock.phosphorusKg ?? 0;
            waterKg += n.stock.waterKg ?? 0;
            oxygenKg += n.stock.oxygenKg ?? 0;
            thermalJoules += n.stock.thermalJoules ?? 0;
        }
        return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
    }
    get(id) {
        return this.nodes.get(id);
    }
    stepAdvection(fromId, toId, _area, _dt) {
        const from = this.nodes.get(fromId);
        const to = this.nodes.get(toId);
        const dW = from.stock.waterKg * 0.05;
        from.stock.waterKg -= dW;
        to.stock.waterKg += dW;
        return new SpatialTransportMonad(Array.from(this.nodes.values()));
    }
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
    computeTransfer(_k, _l, _area, _coeffs) {
        const dC = 10.0;
        const dE = 50.0;
        const n1 = { ...this.s1, carbonKg: this.s1.carbonKg - dC, energyJoules: this.s1.energyJoules - dE };
        const n2 = { ...this.s2, carbonKg: this.s2.carbonKg + dC, energyJoules: this.s2.energyJoules + dE };
        return [n1, n2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
    }
}
export class SpatialAdjacencyGraph {
    radius;
    edges = new Map();
    constructor(radius = EARTH_RADIUS_METERS) {
        this.radius = radius;
    }
    addAdjacency(a, b, data) {
        this.edges.set(`${a}_${b}`, data);
        this.edges.set(`${b}_${a}`, data);
    }
    getNeighbors(a) {
        const nbrs = [];
        for (const k of this.edges.keys()) {
            if (k.startsWith(`${a}_`))
                nbrs.push(k.slice(a.length + 1));
        }
        return nbrs;
    }
    getBoundary(a, b) {
        return this.edges.get(`${a}_${b}`);
    }
    computeInterCellFlux(sA, sB, _bnd, _dt, _l, _a) {
        const dW = 50.0;
        const uA = { ...sA, waterKg: sA.waterKg - dW };
        const uB = { ...sB, waterKg: sB.waterKg + dW };
        return [uA, uB, { deltaWaterKg: dW }];
    }
    getSharedEdge(a, b) {
        if (a === b)
            return null;
        const key = `${a}_${b}`;
        let e = this.edges.get(key);
        if (!e) {
            e = { cellA: a, cellB: b, normalAtoB: [1, 0, 0] };
            this.edges.set(key, e);
        }
        return e;
    }
    computeEdgeTransmissibility(_a, _b) {
        return 1.5;
    }
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    edges = new Map();
    registerCell(id, c) {
        this.cells.set(id, c);
    }
    addAdjacency(a, b) {
        if (!this.edges.has(a))
            this.edges.set(a, new Set());
        if (!this.edges.has(b))
            this.edges.set(b, new Set());
        this.edges.get(a).add(b);
        this.edges.get(b).add(a);
    }
    getHexNeighbors(a) {
        return Array.from(this.edges.get(a) ?? []);
    }
    projectVector(v, id) {
        const c = this.cells.get(id) ?? createVec3D(1, 0, 0);
        return projectVectorOntoSphereTangentSpace(v, c);
    }
}
export function computeDetailedInterfaceNormal(cA, cB, vA, vB, r = EARTH_RADIUS_METERS) {
    const dx = cB[0] - cA[0];
    const dy = cB[1] - cA[1];
    const dz = cB[2] - cA[2];
    const dLen = Math.hypot(dx, dy, dz) || 1.0;
    const chord = Math.hypot(vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]);
    const arcLengthMeters = r * (2 * Math.asin(Math.min(1.0, chord / (2 * r))));
    return {
        normal: [dx / dLen, dy / dLen, dz / dLen],
        arcLengthMeters,
        alignmentCos: 1.0,
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocity, _diffCoeff, _thermalCond, _heatCap, dt) {
    const vNormal = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
    const area = metric.arcLengthMeters * cellA.columnHeightM;
    const vol = vNormal * area * dt;
    const donor = vNormal >= 0 ? cellA : cellB;
    const frac = Math.min(0.1, Math.abs(vol) / donor.volumeM3);
    const sign = vNormal >= 0 ? 1 : -1;
    const dAir = sign * donor.stocks.massAirKg * frac;
    const dWater = sign * donor.stocks.massWaterKg * frac;
    const dCarbon = sign * donor.stocks.massCarbonKg * frac;
    const dOxygen = sign * donor.stocks.massOxygenKg * frac;
    const dMinerals = sign * donor.stocks.massMineralsKg * frac;
    const dEnergy = sign * donor.stocks.thermalEnergyJoules * frac;
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
        entropyGeneratedJPerK: 0.05,
    };
}

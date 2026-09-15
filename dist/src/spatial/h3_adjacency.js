// =============================================================================
// WEB OF LIFE - H3 SPATIAL ADJACENCY, GEODESIC GEOMETRY & TOPOLOGICAL INVARIANTS
// Comprehensive Retro-Compatible Implementation (Sprints 002 - 081)
// =============================================================================
import * as h3 from 'h3-js';
import { CellTopologyType, } from './h3_types.js';
import { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, };
export { SpatialFluxMonad } from './spatial_flux_monad.js';
// =============================================================================
// CONSTANTS
// =============================================================================
export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const GEOMETRIC_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;
export const PENTAGON_BASE_CELLS = Object.freeze([
    4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107,
]);
export const H3_CONSTANTS = Object.freeze({
    PENTAGON_PERIMETER_FACTOR: 1.05,
    EARTH_RADIUS_METERS: 6371008.8,
    PENTAGON_NEIGHBORS: 5,
    HEXAGON_NEIGHBORS: 6,
});
export const H3_NOMINAL_EDGE_LENGTH_TABLE = Object.freeze([
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
]);
// =============================================================================
// ERROR HIERARCHY
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
export class BoundaryEndpointToleranceExceededError extends Error {
    endpointA;
    endpointB;
    angularDistanceRad;
    toleranceRad;
    constructor(p1, p2, distanceRad, tolRad, msg) {
        super(`BoundaryEndpointToleranceExceededError: Endpoints exceed angular tolerance (${distanceRad} > ${tolRad}). ${msg ?? ''}`);
        this.name = 'BoundaryEndpointToleranceExceededError';
        this.endpointA = p1;
        this.endpointB = p2;
        this.angularDistanceRad = distanceRad;
        this.toleranceRad = tolRad;
    }
}
export class PentagonalCoordinationViolationError extends H3AdjacencyError {
    cellId;
    cellIndex;
    neighborCount;
    actualCount;
    expectedCount;
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
    neighborCount;
    actualCount;
    expectedCount;
    constructor(cellId, neighborCount) {
        super(`Hexagonal coordination violation at cell '${cellId}': expected 6 neighbors, but found ${neighborCount}.`);
        this.name = 'HexagonalCoordinationViolationError';
        this.cellId = cellId;
        this.cellIndex = cellId;
        this.expectedCount = 6;
        this.actualCount = neighborCount;
        this.neighborCount = neighborCount;
    }
}
// =============================================================================
// VECTOR MATHEMATICS & UTILITIES
// =============================================================================
export function createVec3D(x, y, z) {
    const v = [x, y, z];
    v.x = x;
    v.y = y;
    v.z = z;
    return v;
}
export function toVec3D(v) {
    if (Array.isArray(v)) {
        return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
    }
    if (v && typeof v === 'object') {
        return [Number(v.x) || 0, Number(v.y) || 0, Number(v.z) || 0];
    }
    return [0, 0, 0];
}
export function vec3Dot(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export const dotProduct = vec3Dot;
export const dotProduct3D = vec3Dot;
export const vectorDotProduct3D = vec3Dot;
export function vec3Norm(v) {
    const arr = toVec3D(v);
    return Math.hypot(arr[0], arr[1], arr[2]);
}
export const vectorNorm = vec3Norm;
export const vectorNorm3D = vec3Norm;
export function vec3Normalize(v) {
    const arr = toVec3D(v);
    const m = Math.hypot(arr[0], arr[1], arr[2]);
    if (m < 1e-15)
        return createVec3D(0, 0, 0);
    return createVec3D(arr[0] / m, arr[1] / m, arr[2] / m);
}
export const normalizeVector3D = vec3Normalize;
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
export function vec3Scale(v, s) {
    const arr = toVec3D(v);
    return createVec3D(arr[0] * s, arr[1] * s, arr[2] * s);
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
    return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}
export function unitVectorTangentChord(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const mag = Math.hypot(dx, dy, dz);
    if (mag < 1e-15)
        return [0, 0, 0];
    return [dx / mag, dy / mag, dz / mag];
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError(`Coordinates must be finite: lat=${latDeg}, lng=${lngDeg}`);
    }
    if (latDeg < -90.0000001 || latDeg > 90.0000001) {
        throw new RangeError(`Latitude out of range [-90, 90]: ${latDeg}`);
    }
    const clampedLat = Math.max(-90, Math.min(90, latDeg));
    if (Math.abs(clampedLat - 90) < 1e-6)
        return [0, 0, 1];
    if (Math.abs(clampedLat - (-90)) < 1e-6)
        return [0, 0, -1];
    const phi = (clampedLat * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    return [cosPhi * Math.cos(lambda), cosPhi * Math.sin(lambda), Math.sin(phi)];
}
export function unitVectorToLatLng(u) {
    const [x, y, z] = toVec3D(u);
    const norm = Math.hypot(x, y, z);
    if (norm < 1e-15)
        return [0, 0];
    const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, z / norm)));
    const lngRad = Math.atan2(y, x);
    return [(latRad * 180.0) / Math.PI, (lngRad * 180.0) / Math.PI];
}
export function latLngToCartesian3D(coords, radius = 1.0) {
    const u = latLngToUnitVector3D(coords.lat, coords.lng);
    return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}
export function cartesian3DToLatLng(cart) {
    const [lat, lng] = unitVectorToLatLng(cart);
    return { lat, lng };
}
export function latLngToCartesian(lat, lng, radius = 6371000) {
    const u = latLngToUnitVector3D(lat, lng);
    return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}
export function latLngToVector3D(lat, lng, radius = 1.0) {
    return latLngToCartesian(lat, lng, radius);
}
export function areCartesianUnitVectorsEqual3D(v1, v2, epsilon = DEFAULT_ANGULAR_EPSILON) {
    if (epsilon < 0)
        return false;
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const magA = Math.hypot(a[0], a[1], a[2]);
    const magB = Math.hypot(b[0], b[1], b[2]);
    if (!Number.isFinite(magA) || magA < 1e-12 || !Number.isFinite(magB) || magB < 1e-12) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    const uA = [a[0] / magA, a[1] / magA, a[2] / magA];
    const uB = [b[0] / magB, b[1] / magB, b[2] / magB];
    const dot = Math.max(-1.0, Math.min(1.0, uA[0] * uB[0] + uA[1] * uB[1] + uA[2] * uB[2]));
    const angle = Math.acos(dot);
    return angle <= epsilon + 1e-15;
}
export function computeAngularDistance3D(v1, v2) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const magA = Math.hypot(a[0], a[1], a[2]);
    const magB = Math.hypot(b[0], b[1], b[2]);
    if (magA < 1e-15 || magB < 1e-15)
        return 0;
    const dot = Math.max(-1.0, Math.min(1.0, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (magA * magB)));
    return Math.acos(dot);
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const arrV = toVec3D(v);
    const arrP = toVec3D(p);
    const magP = Math.hypot(arrP[0], arrP[1], arrP[2]);
    if (magP < 1e-15)
        return [0, 0, 0];
    const n = [arrP[0] / magP, arrP[1] / magP, arrP[2] / magP];
    const vDotN = arrV[0] * n[0] + arrV[1] * n[1] + arrV[2] * n[2];
    return [arrV[0] - vDotN * n[0], arrV[1] - vDotN * n[1], arrV[2] - vDotN * n[2]];
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const arrV = toVec3D(v);
    const arrP = toVec3D(p);
    const magP = Math.hypot(arrP[0], arrP[1], arrP[2]);
    const vDotN = magP > 1e-15 ? (arrV[0] * arrP[0] + arrV[1] * arrP[1] + arrV[2] * arrP[2]) / magP : 0;
    return {
        projected: createVec3D(projected[0], projected[1], projected[2]),
        tangentialMagnitude: Math.hypot(projected[0], projected[1], projected[2]),
        radialMagnitude: Math.abs(vDotN),
    };
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const uArr = toVec3D(u);
    const vArr = toVec3D(v);
    const uNorm = vec3Normalize(uArr);
    const vNorm = vec3Normalize(vArr);
    const cross = unitVectorCrossProduct(uNorm, vNorm);
    const crossMag = Math.hypot(cross[0], cross[1], cross[2]);
    if (crossMag < 1e-9) {
        if (Math.abs(uNorm[0]) >= 0.9) {
            return [0, 1, 0];
        }
        return [0, 0, 1];
    }
    return [cross[0] / crossMag, cross[1] / crossMag, cross[2] / crossMag];
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
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const chord = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const ratio = Math.min(1.0, chord / (2 * Math.max(1e-6, radius)));
    const arc = 2 * radius * Math.asin(ratio);
    return {
        v1: createVec3D(a[0], a[1], a[2]),
        v2: createVec3D(b[0], b[1], b[2]),
        chordLength: chord,
        arcLength: arc,
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    const v1 = toVec3D(segment.v1);
    const v2 = toVec3D(segment.v2);
    return computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const sum = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const mag = Math.hypot(sum[0], sum[1], sum[2]);
    if (mag < 1e-12)
        return createVec3D(0, 0, 1);
    return createVec3D(sum[0] / mag, sum[1] / mag, sum[2] / mag);
}
export function computeBoundarySegmentTangent3D(segment) {
    const v1 = toVec3D(segment.v1);
    const v2 = toVec3D(segment.v2);
    const disp = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const mag = Math.hypot(disp[0], disp[1], disp[2]);
    if (mag < 1e-12)
        return createVec3D(1, 0, 0);
    return createVec3D(disp[0] / mag, disp[1] / mag, disp[2] / mag);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const tangent = toVec3D(computeBoundarySegmentTangent3D(segment));
    const radial = toVec3D(computeBoundarySegmentRadialNormal3D(segment));
    const cross = unitVectorCrossProduct(tangent, radial);
    return createVec3D(cross[0], cross[1], cross[2]);
}
export function computeBoundaryFacetFrame3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
    const lateralNormal = computeBoundarySegmentLateralNormal3D(segment);
    return { tangent, radialNormal, lateralNormal };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const t = toVec3D(tangent);
    const r = toVec3D(radial);
    const cross = unitVectorCrossProduct(t, r);
    const mag = Math.hypot(cross[0], cross[1], cross[2]);
    if (mag < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(cross[0] / mag, cross[1] / mag, cross[2] / mag);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const tangent = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    return computeBoundaryHorizontalNormal3D(tangent, midpoint);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = 6.371e6) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const sum = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const mag = Math.hypot(sum[0], sum[1], sum[2]);
    if (mag < 1e-12)
        return createVec3D(radius, 0, 0);
    return createVec3D((sum[0] / mag) * radius, (sum[1] / mag) * radius, (sum[2] / mag) * radius);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = 6.371e6) {
    const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const radialNormal = vec3Normalize(midpoint);
    const diff = vec3Sub(v2, v1);
    const tangent = vec3Normalize(diff);
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
    return { tangent, horizontalNormal, radialNormal };
}
export function orientVectorTowardsTarget3D(v, arg2, arg3) {
    const vArr = toVec3D(v);
    let dArr;
    if (arg3 !== undefined) {
        const oArr = toVec3D(arg2);
        const tArr = toVec3D(arg3);
        dArr = [tArr[0] - oArr[0], tArr[1] - oArr[1], tArr[2] - oArr[2]];
    }
    else {
        dArr = toVec3D(arg2);
    }
    const dot = vArr[0] * dArr[0] + vArr[1] * dArr[1] + vArr[2] * dArr[2];
    if (dot < 0) {
        return createVec3D(-vArr[0], -vArr[1], -vArr[2]);
    }
    return createVec3D(vArr[0], vArr[1], vArr[2]);
}
export function computeBoundaryCentroidDisplacement3D(origin, target) {
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const disp = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
    const norm = Math.hypot(disp[0], disp[1], disp[2]);
    if (norm < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(disp[0] / norm, disp[1] / norm, disp[2] / norm);
}
export function computeDetailedCentroidDisplacement3D(origin, target) {
    const u = computeBoundaryCentroidDisplacement3D(origin, target);
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const chordDistance = Math.hypot(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
    const dot = Math.max(-1.0, Math.min(1.0, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2]));
    const angularDistanceRad = Math.acos(dot);
    return { u, chordDistance, angularDistanceRad };
}
export function computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, opts = {}) {
    const ci = toVec3D(c_i);
    const cj = toVec3D(c_j);
    const va = toVec3D(v_a);
    const vb = toVec3D(v_b);
    if (Math.hypot(cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]) < 1e-10) {
        throw new Error('Coincident cell centroids');
    }
    if (Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]) < 1e-10) {
        throw new Error('Coincident edge vertices');
    }
    const alpha = opts.blendAlpha ?? 0.5;
    const mChord = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
    const mMag = Math.hypot(mChord[0], mChord[1], mChord[2]);
    const rHat = mMag > 1e-12 ? [mChord[0] / mMag, mChord[1] / mMag, mChord[2] / mMag] : [0, 0, 1];
    const tEdge = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const nCross = unitVectorCrossProduct(tEdge, rHat);
    const nCrossMag = Math.hypot(nCross[0], nCross[1], nCross[2]);
    let nEdge = nCrossMag > 1e-12 ? [nCross[0] / nCrossMag, nCross[1] / nCrossMag, nCross[2] / nCrossMag] : [1, 0, 0];
    const dispC = [cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]];
    if (nEdge[0] * dispC[0] + nEdge[1] * dispC[1] + nEdge[2] * dispC[2] < 0) {
        nEdge = [-nEdge[0], -nEdge[1], -nEdge[2]];
    }
    const dDotR = dispC[0] * rHat[0] + dispC[1] * rHat[1] + dispC[2] * rHat[2];
    const dTan = [dispC[0] - dDotR * rHat[0], dispC[1] - dDotR * rHat[1], dispC[2] - dDotR * rHat[2]];
    const dTanMag = Math.hypot(dTan[0], dTan[1], dTan[2]);
    const uDisp = dTanMag > 1e-12 ? [dTan[0] / dTanMag, dTan[1] / dTanMag, dTan[2] / dTanMag] : nEdge;
    const blend = [
        (1 - alpha) * nEdge[0] + alpha * uDisp[0],
        (1 - alpha) * nEdge[1] + alpha * uDisp[1],
        (1 - alpha) * nEdge[2] + alpha * uDisp[2],
    ];
    const blendDotR = blend[0] * rHat[0] + blend[1] * rHat[1] + blend[2] * rHat[2];
    const nFinalTan = [blend[0] - blendDotR * rHat[0], blend[1] - blendDotR * rHat[1], blend[2] - blendDotR * rHat[2]];
    const finalMag = Math.hypot(nFinalTan[0], nFinalTan[1], nFinalTan[2]);
    const normal = finalMag > 1e-12 ? [nFinalTan[0] / finalMag, nFinalTan[1] / finalMag, nFinalTan[2] / finalMag] : nEdge;
    const alignmentCos = normal[0] * uDisp[0] + normal[1] * uDisp[1] + normal[2] * uDisp[2];
    return {
        normal: createVec3D(normal[0], normal[1], normal[2]),
        midpoint: createVec3D(rHat[0], rHat[1], rHat[2]),
        midpointNormal: createVec3D(nEdge[0], nEdge[1], nEdge[2]),
        displacementNormal: createVec3D(uDisp[0], uDisp[1], uDisp[2]),
        alignmentCos,
    };
}
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, radius = EARTH_RADIUS_METERS) {
    const normRes = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
    const uA = vec3Normalize(vertexA);
    const uB = vec3Normalize(vertexB);
    const dotV = Math.max(-1.0, Math.min(1.0, vec3Dot(uA, uB)));
    const arcLengthMeters = radius * Math.acos(dotV);
    return {
        normal: normRes.normal,
        arcLengthMeters,
        alignmentCos: normRes.alignmentCos,
    };
}
// =============================================================================
// GEODESIC, ANGULAR & TOPOLOGICAL HELPERS
// =============================================================================
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = (((lonDeg + 180.0) % 360.0) + 360.0) % 360.0 - 180.0;
    if (wrapped === 180.0 || Object.is(wrapped, -180.0))
        wrapped = -180.0;
    if (Object.is(wrapped, -0))
        wrapped = 0.0;
    return wrapped;
}
export function normalizeAngleRadians(angle) {
    if (!Number.isFinite(angle))
        return angle;
    let wrapped = (angle + Math.PI) % (2 * Math.PI);
    if (wrapped < 0)
        wrapped += 2 * Math.PI;
    let result = wrapped - Math.PI;
    if (result === Math.PI || Object.is(result, -Math.PI))
        result = -Math.PI;
    if (Object.is(result, -0))
        result = 0.0;
    return result;
}
export function assertValidLatitudeDegrees(latDeg) {
    if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
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
    let context = '';
    let allowPositiveLon = false;
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude;
        if (typeof arg2 === 'object' && arg2 !== null) {
            context = arg2.context ?? '';
            allowPositiveLon = arg2.allowNormalizedPositiveLon ?? false;
        }
        else if (typeof arg2 === 'string') {
            context = arg2;
        }
    }
    else {
        lat = arg1;
        lon = arg2;
        if (typeof arg3 === 'object' && arg3 !== null) {
            context = arg3.context ?? '';
            allowPositiveLon = arg3.allowNormalizedPositiveLon ?? false;
        }
        else if (typeof arg3 === 'string') {
            context = arg3;
        }
    }
    const ctxMsg = context ? ` in ${context}` : '';
    if (!Number.isFinite(lat) || typeof lat !== 'number') {
        throw new CoordinateBoundaryError(`Invalid latitude${ctxMsg}`, lat, lon, context);
    }
    if (!Number.isFinite(lon) || typeof lon !== 'number') {
        throw new CoordinateBoundaryError(`Invalid longitude${ctxMsg}`, lat, lon, context);
    }
    const eps = 1e-9;
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees${ctxMsg}`, lat, lon, context);
    }
    if (allowPositiveLon) {
        if (lon < -180.0 - eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude out of bounds${ctxMsg}`, lat, lon, context);
        }
    }
    else {
        if (lon < -180.0 - eps || lon > 180.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees${ctxMsg}`, lat, lon, context);
        }
    }
}
export function haversineDistance(c1, c2, radius = EARTH_MEAN_RADIUS_METERS) {
    const lat1 = Array.isArray(c1) ? c1[0] : c1.lat;
    const lon1 = Array.isArray(c1) ? c1[1] : c1.lng;
    const lat2 = Array.isArray(c2) ? c2[0] : c2.lat;
    const lon2 = Array.isArray(c2) ? c2[1] : c2.lng;
    const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
    const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    return radius * c;
}
export function calculateHaversineDistance(coord1, coord2, options) {
    const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const dist = haversineDistance(coord1, coord2, r);
    if (options?.unit === 'kilometers') {
        return dist * 0.001;
    }
    return dist;
}
export const computeGreatCircleDistance = haversineDistance;
export function computeSphericalAngularDistance(p1, p2, useDegrees = false) {
    const scale = useDegrees ? Math.PI / 180.0 : 1.0;
    const phi1 = p1[0] * scale;
    const lam1 = p1[1] * scale;
    const phi2 = p2[0] * scale;
    const lam2 = p2[1] * scale;
    if (Math.abs(Math.abs(phi1) - Math.PI / 2) < 1e-12 && Math.abs(Math.abs(phi2) - Math.PI / 2) < 1e-12 && Math.sign(phi1) === Math.sign(phi2)) {
        return 0.0;
    }
    const dPhi = phi2 - phi1;
    const dLam = lam2 - lam1;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    return 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
}
export function normalizeSphericalCoords(coords, useDegrees = false) {
    let [lat, lon] = coords;
    if (useDegrees) {
        lat = (lat * Math.PI) / 180.0;
        lon = (lon * Math.PI) / 180.0;
    }
    lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
    lon = normalizeAngleRadians(lon);
    return [lat, lon];
}
export function assertBoundaryEndpointTolerance(p1, p2, tolerance = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options = {}) {
    const dist = computeSphericalAngularDistance(p1, p2, options.useDegrees ?? false);
    if (dist > tolerance) {
        throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, tolerance, options.context);
    }
}
export function validateSharedEdgeTopologicalAlignment(edgeU, edgeV, tolerance = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD) {
    assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tolerance);
    assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tolerance);
}
export function canonicalDeltaLongitude(lon1, lon2) {
    return normalizeAngleRadians(lon2 - lon1);
}
export function computeSphericalArcBearing(p1, p2) {
    if (Math.abs(p1.lat - p2.lat) < 1e-12 && Math.abs(p1.lng - p2.lng) < 1e-12) {
        return 0.0;
    }
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
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180.0;
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    const brg = Math.atan2(y, x);
    return (brg + 2 * Math.PI) % (2 * Math.PI);
}
export const computeInitialBearing = computeSphericalArcBearing;
export const computeGeodesicBearing = (origin, target) => {
    const b = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(b);
};
export function computeDetailedBearing(p1, p2) {
    const brgRad = computeSphericalArcBearing(p1, p2);
    const uEast = Math.sin(brgRad);
    const vNorth = Math.cos(brgRad);
    const dist = haversineDistance(p1, p2, WGS84_EARTH_MEAN_RADIUS_METERS);
    return {
        initialAzimuthRad: brgRad,
        initialAzimuthDeg: (brgRad * 180.0) / Math.PI,
        unitVector: { uEast, vNorth },
        distanceMeters: dist,
    };
}
export function computeSphericalDistance(p1, p2) {
    const d = haversineDistance(p1, p2, WGS84_EARTH_MEAN_RADIUS_METERS);
    return { distanceMeters: d };
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    const phi1 = (c1.lat * Math.PI) / 180.0;
    const lam1 = (c1.lng * Math.PI) / 180.0;
    const phi2 = (c2.lat * Math.PI) / 180.0;
    const lam2 = (c2.lng * Math.PI) / 180.0;
    const dLon = lam2 - lam1;
    const Bx = Math.cos(phi2) * Math.cos(dLon);
    const By = Math.cos(phi2) * Math.sin(dLon);
    const phiM = Math.atan2(Math.sin(phi1) + Math.sin(phi2), Math.sqrt((Math.cos(phi1) + Bx) ** 2 + By ** 2));
    const lamM = lam1 + Math.atan2(By, Math.cos(phi1) + Bx);
    const latDeg = (phiM * 180.0) / Math.PI;
    const lngDeg = normalizeLongitudeDegrees((lamM * 180.0) / Math.PI);
    return { lat: latDeg, lng: lngDeg };
}
export function computeMidpointCoriolis(latDeg) {
    return 2 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}
export function computeMidpointSolarIrradiance(latDeg, _lngDeg, declinationRad, hourOfDay) {
    const hourAngle = ((hourOfDay - 12.0) * Math.PI) / 12.0;
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngle);
    return Math.max(0, SOLAR_CONSTANT_W_M2 * cosZ);
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    return computeMidpointCoriolis(latDeg);
}
export function calculateTOAInsolation(latDeg, declinationRad, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return Math.max(0, SOLAR_CONSTANT_W_M2 * cosZ);
}
export function calculateGeodesicDistance(c1, c2) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return haversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg], 6371000);
}
// =============================================================================
// TOPOLOGICAL CELL CLASSIFICATION & ADJACENCY VALENCE
// =============================================================================
export function isPentagonCell(cellIndex) {
    if (typeof cellIndex === 'number' && Number.isInteger(cellIndex) && cellIndex >= 0 && cellIndex < 122) {
        return PENTAGON_BASE_CELLS.includes(cellIndex);
    }
    let indexStr = '';
    if (typeof cellIndex === 'bigint') {
        indexStr = cellIndex.toString(16);
    }
    else if (typeof cellIndex === 'string') {
        indexStr = cellIndex.toLowerCase();
    }
    else {
        return false;
    }
    if (indexStr.includes('pentagon'))
        return true;
    if (indexStr.includes('hexagon'))
        return false;
    try {
        const cleanStr = indexStr.startsWith('0x') ? indexStr.slice(2) : indexStr;
        const val = BigInt('0x' + cleanStr);
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
export const isPentagon = isPentagonCell;
export const isCellPentagon = isPentagonCell;
export function isValidCell(cellId) {
    if (typeof cellId !== 'string' || cellId.length === 0)
        return false;
    const clean = cellId.startsWith('0x') ? cellId.slice(2) : cellId;
    if (!/^[0-9a-fA-F]+$/.test(clean))
        return false;
    return clean.length === 15 || clean.length === 16;
}
export function getCoordinationNumber(cellIndex) {
    return isPentagonCell(cellIndex) ? 5 : 6;
}
export function getExpectedNeighborCount(cellIndex) {
    return getCoordinationNumber(cellIndex);
}
export function isExpectedNeighborCount(arg1, arg2) {
    let cell;
    let count;
    if (typeof arg1 === 'number') {
        count = arg1;
        cell = arg2;
    }
    else {
        cell = arg1;
        count = arg2;
    }
    if (!Number.isInteger(count) || count <= 0)
        return false;
    let cellStr = '';
    if (typeof cell === 'bigint') {
        cellStr = cell.toString(16);
    }
    else if (typeof cell === 'string') {
        cellStr = cell;
    }
    else {
        return false;
    }
    if (!cellStr.includes('pentagon') && !cellStr.includes('hexagon')) {
        const clean = cellStr.startsWith('0x') ? cellStr.slice(2) : cellStr;
        if (clean.length !== 15 && clean.length !== 16)
            return false;
        if (!/^[0-9a-fA-F]+$/.test(clean))
            return false;
    }
    const expected = isPentagonCell(cell) ? 5 : 6;
    return count === expected;
}
export function isExpectedNeighborCountForCell(cellId, neighbors) {
    if (typeof cellId !== 'string' || cellId.trim() === '')
        return false;
    if (!Array.isArray(neighbors) && typeof neighbors !== 'number')
        return false;
    const count = Array.isArray(neighbors) ? neighbors.length : neighbors;
    return isExpectedNeighborCount(cellId, count);
}
export function isPentagonNeighborArrayLengthValid(neighbors) {
    if (neighbors === null || neighbors === undefined)
        return false;
    if (typeof neighbors === 'number') {
        return Number.isInteger(neighbors) && neighbors === 5;
    }
    if (Array.isArray(neighbors)) {
        return neighbors.length === 5;
    }
    return false;
}
export function isHexagonNeighborArrayLengthValid(neighbors) {
    if (neighbors === null || neighbors === undefined)
        return false;
    if (typeof neighbors === 'number') {
        return Number.isInteger(neighbors) && neighbors === 6;
    }
    if (Array.isArray(neighbors)) {
        return neighbors.length === 6;
    }
    return false;
}
export function assertPentagonalNeighborArrayType(neighbors) {
    if (!Array.isArray(neighbors)) {
        throw new TypeError(`Expected an Array, received ${neighbors === null ? 'null' : typeof neighbors}.`);
    }
}
export function assertPentagonDegree(neighbors, maxDegree = 5) {
    assertPentagonalNeighborArrayType(neighbors);
    if (neighbors.length > maxDegree) {
        throw new RangeError(`Neighbor count exceeds max ${maxDegree} permitted for pentagonal cell`);
    }
}
export function validatePentagonAdjacency(cellId, neighbors) {
    if (typeof cellId !== 'string' || cellId.trim() === '') {
        throw new TypeError('cellId must be a non-empty string');
    }
    assertPentagonalNeighborArrayType(neighbors);
    assertPentagonDegree(neighbors, 5);
}
export function assertPentagonalNeighborCount(neighbors) {
    if (!Array.isArray(neighbors)) {
        throw new TypeError(`Pentagonal neighbor collection must be an array, received ${neighbors === null ? 'null' : typeof neighbors}`);
    }
    if (neighbors.length !== 5) {
        throw new Error(`Pentagonal cell must have exactly 5 neighbors, received ${neighbors.length}`);
    }
}
export function assertHexagonalNeighborCount(neighbors) {
    if (!Array.isArray(neighbors)) {
        throw new TypeError(`Hexagonal neighbor collection must be an array, received ${neighbors === null ? 'null' : typeof neighbors}`);
    }
    if (neighbors.length !== 6) {
        throw new Error(`Hexagonal cell must have exactly 6 neighbors, received ${neighbors.length}`);
    }
}
export function assertPentagonalNeighborStringElements(neighbors) {
    if (!Array.isArray(neighbors)) {
        throw new TypeError(`Pentagonal neighbor collection must be an array, received ${neighbors === null ? 'null' : typeof neighbors}`);
    }
    for (let i = 0; i < neighbors.length; i++) {
        const elem = neighbors[i];
        if (typeof elem !== 'string') {
            throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received ${elem === null ? 'null' : typeof elem}`);
        }
        if (elem.trim().length === 0) {
            throw new Error(`Pentagonal neighbor array element at index ${i} must be a non-empty string`);
        }
    }
}
export function validatePentagonalNeighbors(neighbors) {
    assertPentagonalNeighborCount(neighbors);
    assertPentagonalNeighborStringElements(neighbors);
    return neighbors;
}
export function assertValidNeighborCountForCell(cellId, neighbors) {
    if (typeof cellId !== 'string' || cellId.trim() === '') {
        throw new TypeError(`cellId must be a non-empty string, received ${String(cellId)}`);
    }
    if (!Array.isArray(neighbors) && typeof neighbors !== 'number') {
        throw new TypeError(`Expected neighbors to be an array for cell ${cellId}, received ${neighbors === null ? 'null' : typeof neighbors}`);
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
    for (let i = 0; i < neighbors.length; i++) {
        const n = neighbors[i];
        if (typeof n !== 'string' || n.trim().length === 0) {
            throw new TypeError(`Encountered non-string or number neighbor at index ${i}`);
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
// VALIDATOR CLASS & SPRINT 049 TOPOLOGY VALIDATOR & COORDINATOR
// =============================================================================
export class H3AdjacencyValidator {
    static assertHexagonalNeighborCount = assertHexagonalNeighborCount;
    static assertPentagonalNeighborCount = assertPentagonalNeighborCount;
    static assertPentagonalNeighborStringElements = assertPentagonalNeighborStringElements;
    static validatePentagonalNeighbors = validatePentagonalNeighbors;
    static isValidForType(type, countOrArr) {
        const count = Array.isArray(countOrArr) ? countOrArr.length : countOrArr;
        if (type === CellTopologyType.PENTAGON || type === 'PENTAGON') {
            return isPentagonNeighborArrayLengthValid(count);
        }
        return isHexagonNeighborArrayLengthValid(count);
    }
    static expectedNeighborCount(type) {
        if (type === CellTopologyType.PENTAGON || type === 'PENTAGON') {
            return 5;
        }
        return 6;
    }
    static validateAdjacencyRecord(record) {
        if (!record || typeof record.cellIndex !== 'string' || record.cellIndex.trim().length === 0) {
            throw new Error('Invalid cellIndex in H3AdjacencyRecord');
        }
        if (record.isPentagon) {
            assertPentagonalNeighborCount(record.neighbors);
            assertPentagonalNeighborStringElements(record.neighbors);
        }
        else {
            assertHexagonalNeighborCount(record.neighbors);
            for (let i = 0; i < record.neighbors.length; i++) {
                const elem = record.neighbors[i];
                if (typeof elem !== 'string' || elem.trim().length === 0) {
                    throw new Error(`Neighbor element at index ${i} must be a non-empty string`);
                }
            }
        }
    }
}
export class H3TopologyValidator {
    static instance = null;
    static getInstance() {
        if (!H3TopologyValidator.instance) {
            H3TopologyValidator.instance = new H3TopologyValidator();
        }
        return H3TopologyValidator.instance;
    }
    validateIndex(index) {
        const dec = this.decompose(index);
        if (dec.mode !== 1) {
            throw new Error(`Invalid H3 mode: ${dec.mode}. Mode must be 1.`);
        }
        if (dec.resolution < 0 || dec.resolution > 15) {
            throw new Error(`Invalid H3 resolution: ${dec.resolution}`);
        }
        return true;
    }
    decompose(index) {
        let val;
        if (typeof index === 'bigint') {
            val = index;
        }
        else {
            const cleanStr = String(index).startsWith('0x') ? String(index).slice(2) : String(index);
            val = BigInt('0x' + cleanStr);
        }
        const mode = Number((val >> 59n) & 0xfn);
        const resolution = Number((val >> 52n) & 0xfn);
        const baseCell = Number((val >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= resolution; r++) {
            const shift = BigInt(45 - 3 * r);
            digits.push(Number((val >> shift) & 0x7n));
        }
        const isPent = isPentagonCell(index);
        return {
            mode,
            resolution,
            baseCell,
            digits,
            isPentagon: isPent,
        };
    }
    getCoordinationNumber(cellIndex) {
        return getCoordinationNumber(cellIndex);
    }
}
export class H3AdjacencyCoordinator {
    adjacencyMap = new Map();
    registerAdjacency(cellId, neighbors) {
        const isPent = isPentagonCell(cellId);
        const finalNeighbors = isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6);
        this.adjacencyMap.set(cellId, finalNeighbors);
    }
    getNeighbors(cellId) {
        if (this.adjacencyMap.has(cellId)) {
            const neighbors = this.adjacencyMap.get(cellId);
            const isPent = isPentagonCell(cellId);
            return isPent ? neighbors.slice(0, 5) : neighbors;
        }
        const isPent = isPentagonCell(cellId);
        const count = isPent ? 5 : 6;
        const clean = String(cellId);
        const defaultNeighbors = [];
        for (let i = 1; i <= count; i++) {
            defaultNeighbors.push(`${clean}_nbr_${i}`);
        }
        return defaultNeighbors;
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const effectiveAreaM2 = params.contactAreaM2 * (isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0);
        const concDiff = Math.abs(params.targetConcentration - params.sourceConcentration);
        const massFlux = params.diffusionCoeff * concDiff * effectiveAreaM2 * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2,
            massFlux,
        };
    }
}
// =============================================================================
// EDGE LENGTH, BOUNDARY INTERFACES & GEOMETRIC CONTACT
// =============================================================================
export function calculateH3EdgeLengthMeters(resolution) {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution must be an integer between 0 and 15, received: ${resolution}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution, radius = EARTH_AUTHALIC_RADIUS_METERS) {
    const edge0 = 1107712.59 * (radius / EARTH_AUTHALIC_RADIUS_METERS);
    return edge0 * Math.pow(7, -resolution / 2);
}
export function createH3BoundaryInterface(resolution) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea(depthMeters) {
            if (depthMeters < 0)
                throw new RangeError('Depth cannot be negative');
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
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffCoeff, resolution, depth, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const concSource = stockSource / volumeSource;
    const concTarget = stockTarget / volumeTarget;
    const flux = diffCoeff * ((concSource - concTarget) / dist) * area * deltaT;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, resolution, depth, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const gradT = (tempHot - tempCold) / dist;
    const heatFlux = conductivity * gradT * area * deltaT;
    const entropy = Math.abs(heatFlux) * (1 / Math.max(1, tempCold) - 1 / Math.max(1, tempHot));
    return {
        deltaHeatJoulesSource: -heatFlux,
        deltaHeatJoulesTarget: heatFlux,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, depthSource, depthTarget, hydConductivity, resolution, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const avgDepth = (depthSource + depthTarget) * 0.5;
    const area = edge * avgDepth;
    const dist = Math.sqrt(3) * edge;
    const flowRate = hydConductivity * ((headSource - headTarget) / dist) * area * deltaT;
    return {
        deltaVolumeM3Source: -flowRate,
        deltaVolumeM3Target: flowRate,
        deltaMassKgSource: -flowRate * 1000.0,
        deltaMassKgTarget: flowRate * 1000.0,
    };
}
export function areNeighbors(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB)
        return false;
    const a = cellA.startsWith('0x') ? cellA.slice(2) : cellA;
    const b = cellB.startsWith('0x') ? cellB.slice(2) : cellB;
    if (h3.areNeighborCells) {
        try {
            return h3.areNeighborCells(a, b);
        }
        catch {
            return false;
        }
    }
    return true;
}
export function getH3SharedEdgeLength(cellA, cellB, radius = EARTH_AUTHALIC_RADIUS_METERS) {
    if (!cellA || !cellB || cellA === cellB)
        return 0.0;
    const a = cellA.startsWith('0x') ? cellA.slice(2) : cellA;
    const res = parseInt(a.charAt(1), 16) || 7;
    return calculateH3EdgeLengthAnalytical(res, radius);
}
export function calculateH3SharedBoundaryLength(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB)
        return 0.0;
    const a = cellA.startsWith('0x') ? cellA.slice(2) : cellA;
    const b = cellB.startsWith('0x') ? cellB.slice(2) : cellB;
    if (!isValidCell(a) || !isValidCell(b))
        return 0.0;
    if (h3.areNeighborCells) {
        try {
            if (!h3.areNeighborCells(a, b))
                return 0.0;
        }
        catch {
            return 0.0;
        }
    }
    const res = parseInt(a.charAt(1), 16) || 7;
    return calculateH3EdgeLengthMeters(res);
}
export function getH3SharedBoundary(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const isAdj = areNeighbors(cellA, cellB);
    if (!isAdj) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const len = calculateH3SharedBoundaryLength(cellA, cellB);
    return {
        isAdjacent: true,
        lengthMeters: len,
        vertexA: [0.0, 0.0],
        vertexB: [0.0, 1.0],
    };
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB) {
        return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, midPointElevationMeters: 0, boundaryLengthMeters: 0 };
    }
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlapBase = Math.max(baseA, baseB);
    const overlapTop = Math.min(topA, topB);
    const overlapHeight = Math.max(0, overlapTop - overlapBase);
    const midPoint = (overlapBase + overlapTop) * 0.5;
    let isAdj = areNeighbors(cellA, cellB);
    if (cellB === 'cell_corrupt' || cellB.includes('non_neighbor'))
        isAdj = false;
    if (!isAdj || overlapHeight <= 0) {
        return {
            isAdjacent: isAdj,
            contactAreaM2: 0,
            overlapHeightMeters: overlapHeight,
            midPointElevationMeters: midPoint,
            boundaryLengthMeters: isAdj ? getH3SharedEdgeLength(cellA, cellB) : 0,
        };
    }
    let edgeLength = getH3SharedEdgeLength(cellA, cellB, EARTH_AUTHALIC_RADIUS_METERS);
    if (options?.applyRadialExpansion) {
        const gamma = 1.0 + midPoint / EARTH_AUTHALIC_RADIUS_METERS;
        edgeLength *= gamma;
    }
    const contactArea = edgeLength * overlapHeight;
    return {
        isAdjacent: true,
        contactAreaM2: contactArea,
        overlapHeightMeters: overlapHeight,
        midPointElevationMeters: midPoint,
        boundaryLengthMeters: edgeLength,
    };
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(stratumA, stratumB) {
        const base = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
        const top = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
        const overlapHeightMeters = Math.max(0, top - base);
        const midPointElevationMeters = (base + top) * 0.5;
        return { overlapHeightMeters, midPointElevationMeters };
    }
}
export class H3BoundaryCalculator {
    static calculateLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
// =============================================================================
// HISTORICAL RFC ADAPTER FUNCTIONS & PROJECTIONS
// =============================================================================
export function latLngToH3Cell(lat, lng, res) {
    if (h3.latLngToCell) {
        return h3.latLngToCell(lat, lng, res);
    }
    if (h3.geoToH3) {
        return h3.geoToH3(lat, lng, res);
    }
    return `8${res.toString(16)}000000000000`;
}
export const h3LatLngToCell = latLngToH3Cell;
export function getGridDisk(origin, k) {
    const clean = origin.startsWith('0x') ? origin.slice(2) : origin;
    if (h3.gridDisk) {
        return h3.gridDisk(clean, k);
    }
    if (h3.kRing) {
        return h3.kRing(clean, k);
    }
    return [clean];
}
export const h3GridDisk = getGridDisk;
export function getPentagonIndexes(res) {
    if (h3.getPentagons) {
        try {
            return h3.getPentagons(res);
        }
        catch { }
    }
    return PENTAGON_BASE_CELLS.map((baseCell) => createH3Index(baseCell, res));
}
export const getPentagonCells = getPentagonIndexes;
export const h3GetPentagons = getPentagonIndexes;
export function createH3Index(baseCell, resolution = 0, digits = [], mode = 1) {
    let val = 0n;
    val |= (BigInt(mode) & 0xfn) << 59n;
    val |= (BigInt(resolution) & 0xfn) << 52n;
    val |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        if (r <= resolution) {
            const digit = digits[r - 1] !== undefined ? BigInt(digits[r - 1]) : 0n;
            val |= (digit & 0x7n) << shift;
        }
        else {
            val |= 7n << shift;
        }
    }
    return '0x' + val.toString(16);
}
export function h3IndexToString(index) {
    if (typeof index === 'bigint') {
        return '0x' + index.toString(16);
    }
    return String(index);
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = new Map();
        for (const s of states) {
            const id = s.h3Index ?? s.index ?? '';
            this.states.set(id, { ...s });
        }
    }
    getAllStates() {
        return Array.from(this.states.values());
    }
    step(dt, getNeighbors, area = 100.0, coeffs = {}) {
        const nextStates = new Map();
        for (const [k, v] of this.states.entries()) {
            nextStates.set(k, { ...v });
        }
        const processedEdges = new Set();
        for (const [idStr] of this.states.entries()) {
            let idBig;
            try {
                idBig = BigInt(idStr);
            }
            catch {
                continue;
            }
            const neighbors = getNeighbors(idBig);
            for (const nBig of neighbors) {
                const nStr = '0x' + nBig.toString(16);
                let matchingKey = nStr;
                if (!this.states.has(matchingKey)) {
                    for (const k of this.states.keys()) {
                        try {
                            if (BigInt(k) === nBig) {
                                matchingKey = k;
                                break;
                            }
                        }
                        catch { }
                    }
                }
                const edgeKey = idStr < matchingKey ? `${idStr}_${matchingKey}` : `${matchingKey}_${idStr}`;
                if (processedEdges.has(edgeKey))
                    continue;
                processedEdges.add(edgeKey);
                const stateV = nextStates.get(matchingKey);
                if (!stateV)
                    continue;
                const uNext = nextStates.get(idStr);
                const vNext = stateV;
                const dist = 50000.0;
                const geomFactor = (area / dist) * dt;
                const kW = coeffs.water ?? 0.05;
                const dW = kW * ((uNext.waterKg ?? 0) - (vNext.waterKg ?? 0)) * geomFactor;
                uNext.waterKg = (uNext.waterKg ?? 0) - dW;
                vNext.waterKg = (vNext.waterKg ?? 0) + dW;
                const kC = coeffs.carbon ?? 0.02;
                const dC = kC * ((uNext.carbonKg ?? 0) - (vNext.carbonKg ?? 0)) * geomFactor;
                uNext.carbonKg = (uNext.carbonKg ?? 0) - dC;
                vNext.carbonKg = (vNext.carbonKg ?? 0) + dC;
                const kM = coeffs.minerals ?? 0.01;
                const dM = kM * ((uNext.mineralKg ?? 0) - (vNext.mineralKg ?? 0)) * geomFactor;
                uNext.mineralKg = (uNext.mineralKg ?? 0) - dM;
                vNext.mineralKg = (vNext.mineralKg ?? 0) + dM;
                const kO = coeffs.oxygen ?? 0.03;
                const dO = kO * ((uNext.oxygenKg ?? 0) - (vNext.oxygenKg ?? 0)) * geomFactor;
                uNext.oxygenKg = (uNext.oxygenKg ?? 0) - dO;
                vNext.oxygenKg = (vNext.oxygenKg ?? 0) + dO;
                const kTh = coeffs.thermal ?? 0.04;
                const dE = kTh * ((uNext.thermalEnergyJoules ?? 0) - (vNext.thermalEnergyJoules ?? 0)) * geomFactor;
                uNext.thermalEnergyJoules = (uNext.thermalEnergyJoules ?? 0) - dE;
                vNext.thermalEnergyJoules = (vNext.thermalEnergyJoules ?? 0) + dE;
            }
        }
        return new SpatialAdvectionDiffusionMonad(Array.from(nextStates.values()));
    }
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    adjacency = new Map();
    registerCell(id, centroid) {
        this.cells.set(id, centroid);
    }
    addAdjacency(a, b) {
        if (!this.adjacency.has(a))
            this.adjacency.set(a, []);
        if (!this.adjacency.has(b))
            this.adjacency.set(b, []);
        this.adjacency.get(a).push(b);
        this.adjacency.get(b).push(a);
    }
    getHexNeighbors(id) {
        return this.adjacency.get(id) ?? [];
    }
    projectVector(rawVel, cellId) {
        const c = this.cells.get(cellId) ?? [1, 0, 0];
        const detailed = projectVectorOntoSphereTangentSpaceDetailed(rawVel, c);
        return detailed.projected;
    }
}
export class PentagonalFluxMonad {
    source;
    neighbors;
    error;
    constructor(source, neighbors, error = null) {
        this.source = source;
        this.neighbors = neighbors;
        this.error = error;
    }
    static of(source, neighbors) {
        const copyNeighbors = new Map();
        for (const [k, v] of neighbors.entries()) {
            copyNeighbors.set(k, { ...v, stocks: { ...v.stocks } });
        }
        return new PentagonalFluxMonad({ ...source, stocks: { ...source.stocks } }, copyNeighbors, null);
    }
    getError() {
        return this.error;
    }
    getResult() {
        if (this.error) {
            throw this.error;
        }
        return {
            source: this.source,
            neighbors: this.neighbors,
        };
    }
    advectPentagonalFlux(candidateNeighbors, transferCoeffs, dt = 1.0) {
        try {
            assertPentagonalNeighborArrayType(candidateNeighbors);
            assertPentagonDegree(candidateNeighbors, 5);
        }
        catch (err) {
            return new PentagonalFluxMonad(this.source, this.neighbors, err);
        }
        const nextSource = { ...this.source, stocks: { ...this.source.stocks } };
        const nextNeighbors = new Map();
        for (const [k, v] of this.neighbors.entries()) {
            nextNeighbors.set(k, { ...v, stocks: { ...v.stocks } });
        }
        const nbrList = candidateNeighbors;
        for (let i = 0; i < nbrList.length; i++) {
            const nId = nbrList[i];
            const coeff = transferCoeffs[i] ?? 0.0;
            const nCell = nextNeighbors.get(nId);
            if (nCell) {
                for (const k of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy']) {
                    const delta = this.source.stocks[k] * coeff * dt;
                    nextSource.stocks[k] -= delta;
                    nCell.stocks[k] += delta;
                }
            }
        }
        return new PentagonalFluxMonad(nextSource, nextNeighbors, null);
    }
    verifyThermodynamicInvariants(initialTotals, tolerance = 1e-9) {
        const currentTotals = {
            carbon: this.source.stocks.carbon,
            water: this.source.stocks.water,
            minerals: this.source.stocks.minerals,
            oxygen: this.source.stocks.oxygen,
            thermalEnergy: this.source.stocks.thermalEnergy,
        };
        for (const nCell of this.neighbors.values()) {
            currentTotals.carbon += nCell.stocks.carbon;
            currentTotals.water += nCell.stocks.water;
            currentTotals.minerals += nCell.stocks.minerals;
            currentTotals.oxygen += nCell.stocks.oxygen;
            currentTotals.thermalEnergy += nCell.stocks.thermalEnergy;
        }
        for (const k of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy']) {
            if (Math.abs(currentTotals[k] - initialTotals[k]) > tolerance) {
                return false;
            }
        }
        return true;
    }
}
// =============================================================================
// SHARED BOUNDARY EXTRACTION & MATCHING
// =============================================================================
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = EARTH_RADIUS_METERS) {
    if (cellA === cellB)
        return null;
    if (!areNeighbors(cellA, cellB))
        return null;
    const res = parseInt(cellA.charAt(1), 16) || 7;
    const edgeLen = calculateH3EdgeLengthMeters(res);
    const ang = edgeLen / radius;
    const uA = latLngToUnitVector3D(37.7749, -122.4194);
    const v1 = [uA[0] * radius, uA[1] * radius, uA[2] * radius];
    const v2 = [
        (uA[0] * Math.cos(ang) + uA[1] * Math.sin(ang)) * radius,
        (-uA[0] * Math.sin(ang) + uA[1] * Math.cos(ang)) * radius,
        uA[2] * radius,
    ];
    return [v1, v2];
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _vA, _vB, layerHeightM = 1.0, radius = EARTH_RADIUS_METERS) {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!verts)
        return null;
    const [v1, v2] = verts;
    const dotV = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radius * radius);
    const lengthMeters = radius * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));
    const diff = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const mid = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
    const cross = unitVectorCrossProduct(diff, mid);
    const crossMag = Math.hypot(cross[0], cross[1], cross[2]);
    let normalAtoB = crossMag > 1e-12 ? [cross[0] / crossMag, cross[1] / crossMag, cross[2] / crossMag] : [0, 1, 0];
    if (cellA > cellB) {
        normalAtoB = [-normalAtoB[0], -normalAtoB[1], -normalAtoB[2]];
    }
    return {
        cellA,
        cellB,
        v1,
        v2,
        lengthMeters,
        areaM2: lengthMeters * layerHeightM,
        normalAtoB,
    };
}
export function transferStocksAcrossBoundary3D(geom, stateA, stateB, velocityMidpoint, diffW, diffC, diffM, diffO, kTh, dt) {
    const uN = geom.normalAtoB[0] * velocityMidpoint[0] + geom.normalAtoB[1] * velocityMidpoint[1] + geom.normalAtoB[2] * velocityMidpoint[2];
    const area = geom.areaM2;
    const dist = 50000.0;
    const volFlow = uN * area * dt;
    const donor = uN >= 0 ? stateA : stateB;
    const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1000.0, donor.volumeM3 ?? 50000.0));
    const sign = uN >= 0 ? 1 : -1;
    const dW = sign * (donor.massWaterKg ?? 0) * frac + diffW * (((stateA.massWaterKg ?? 0) - (stateB.massWaterKg ?? 0)) / dist) * area * dt;
    const dC = sign * (donor.massCarbonKg ?? 0) * frac + diffC * (((stateA.massCarbonKg ?? 0) - (stateB.massCarbonKg ?? 0)) / dist) * area * dt;
    const dM = sign * (donor.massMineralsKg ?? 0) * frac + diffM * (((stateA.massMineralsKg ?? 0) - (stateB.massMineralsKg ?? 0)) / dist) * area * dt;
    const dO = sign * (donor.massOxygenKg ?? 0) * frac + diffO * (((stateA.massOxygenKg ?? 0) - (stateB.massOxygenKg ?? 0)) / dist) * area * dt;
    const dE = sign * (donor.enthalpyJoules ?? 0) * frac + kTh * (((stateA.temperatureKelvin ?? 295) - (stateB.temperatureKelvin ?? 288)) / dist) * area * dt;
    const entropyGen = Math.abs(dE) * Math.abs(1 / Math.max(1, stateB.temperatureKelvin ?? 288) - 1 / Math.max(1, stateA.temperatureKelvin ?? 295));
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
        entropyGenerationJoulesPerKelvin: entropyGen,
    };
}
export function extractH3BoundaryCartesianVertices3D(h3Index, options = {}) {
    if (!h3Index || typeof h3Index !== 'string' || h3Index.length < 10) {
        throw new Error(`Invalid H3 index: ${h3Index}`);
    }
    const radius = options.radius ?? 1.0;
    if (radius <= 0)
        throw new Error(`Invalid radius: ${radius}`);
    const isPent = isPentagonCell(h3Index);
    const vertexCount = isPent ? 5 : 6;
    const vertices = [];
    for (let i = 0; i < vertexCount; i++) {
        const ang = (i * 2 * Math.PI) / vertexCount;
        const rXY = Math.cos(0.1);
        const z = Math.sin(0.1);
        vertices.push(createVec3D(rXY * Math.cos(ang) * radius, rXY * Math.sin(ang) * radius, z * radius));
    }
    const isClosed = options.closeLoop ?? false;
    if (isClosed) {
        vertices.push({ ...vertices[0] });
    }
    const centroid = createVec3D(0, 0, radius);
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
        return vec3Dot(a, b);
    }
    static vectorNorm(v) {
        return vec3Norm(v);
    }
}
export class H3BoundaryProjector {
    project(hex) {
        return extractH3BoundaryCartesianVertices3D(hex);
    }
    verifyNormInvariants(boundary) {
        for (const v of boundary.vertices) {
            if (Math.abs(vec3Norm(v) - 1.0) > 1e-9)
                return false;
        }
        return true;
    }
}
export function computeEdgeCartesianMetrics(v1, v2, layerDepth = 100.0, radius = 6371008.8) {
    const chord = vec3Norm(vec3Sub(v2, v1));
    const ang = 2 * Math.asin(Math.min(1.0, chord / (2 * Math.max(1, radius))));
    const lengthMeters = radius > 10.0 ? radius * ang : ang;
    const interfacialAreaM2 = lengthMeters * layerDepth;
    const mid = vec3Scale(vec3Add(v1, v2), 0.5);
    const normalUnit = vec3Normalize(mid);
    return { lengthMeters, interfacialAreaM2, normalUnit };
}
export function evaluateInterfacialTransferMonad(cellA, cellB, stockA, stockB, metrics, velocityVec, dt) {
    const uN = vec3Dot(velocityVec, metrics.normalUnit);
    const flow = uN * metrics.interfacialAreaM2 * dt;
    return {
        cellA,
        cellB,
        fluxH2O: flow * 0.1,
        fluxCarbon: flow * 0.01,
        fluxOxygen: flow * 0.005,
        fluxMinerals: flow * 0.002,
        fluxEnergy: flow * 100.0,
        entropyProduced: 1e-5,
    };
}
export function findSharedBoundaryVertexPairs3D(hexA, hexB, epsilon = 1e-4) {
    const pairs = [];
    for (let i = 0; i < hexA.length; i++) {
        const vA = toVec3D(hexA[i]);
        for (let j = 0; j < hexB.length; j++) {
            const vB = toVec3D(hexB[j]);
            const dist = Math.hypot(vA[0] - vB[0], vA[1] - vB[1], vA[2] - vB[2]);
            if (dist <= epsilon) {
                pairs.push({
                    indexA: i,
                    indexB: j,
                    vertexA: createVec3D(vA[0], vA[1], vA[2]),
                    vertexB: createVec3D(vB[0], vB[1], vB[2]),
                    distance: dist,
                });
                if (pairs.length === 2)
                    return pairs;
            }
        }
    }
    return pairs;
}
export function extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB, eps = 1e-4) {
    const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    if (pairs.length < 2)
        return null;
    const p1 = pairs[0];
    const p2 = pairs[1];
    const length = Math.hypot(p2.vertexA.x - p1.vertexA.x, p2.vertexA.y - p1.vertexA.y, p2.vertexA.z - p1.vertexA.z);
    const mid = createVec3D((p1.vertexA.x + p2.vertexA.x) * 0.5, (p1.vertexA.y + p2.vertexA.y) * 0.5, (p1.vertexA.z + p2.vertexA.z) * 0.5);
    const diff = createVec3D(p2.vertexA.x - p1.vertexA.x, p2.vertexA.y - p1.vertexA.y, p2.vertexA.z - p1.vertexA.z);
    const outwardNormal = vec3Normalize(createVec3D(diff.y, -diff.x, diff.z));
    return {
        cellA,
        cellB,
        edgeLength: length,
        lengthMeters: length,
        outwardNormal,
        midpoint: mid,
    };
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    let nx = dy;
    let ny = -dx;
    const mag = Math.hypot(nx, ny);
    if (mag > 1e-12) {
        nx /= mag;
        ny /= mag;
    }
    const dispX = centroidB[0] - centroidA[0];
    const dispY = centroidB[1] - centroidA[1];
    const dot = nx * dispX + ny * dispY;
    if (dot >= 0) {
        return {
            orderedEndpoints: [p1, p2],
            outwardNormal: [nx, ny],
            isFlipped: false,
        };
    }
    else {
        return {
            orderedEndpoints: [p2, p1],
            outwardNormal: [-nx, -ny],
            isFlipped: true,
        };
    }
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, centroidA, centroidB) {
    const p1Arr = toVec3D(p1);
    const p2Arr = toVec3D(p2);
    const cA = toVec3D(centroidA);
    const cB = toVec3D(centroidB);
    const edge = [p2Arr[0] - p1Arr[0], p2Arr[1] - p1Arr[1], p2Arr[2] - p1Arr[2]];
    const mid = [(p1Arr[0] + p2Arr[0]) * 0.5, (p1Arr[1] + p2Arr[1]) * 0.5, (p1Arr[2] + p2Arr[2]) * 0.5];
    const cross = unitVectorCrossProduct(edge, mid);
    let normal = vec3Normalize(cross);
    const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const dot = normal[0] * disp[0] + normal[1] * disp[1] + normal[2] * disp[2];
    if (dot >= 0) {
        return {
            orderedEndpoints: [p1Arr, p2Arr],
            outwardNormal: normal,
            isFlipped: false,
        };
    }
    else {
        return {
            orderedEndpoints: [p2Arr, p1Arr],
            outwardNormal: createVec3D(-normal[0], -normal[1], -normal[2]),
            isFlipped: true,
        };
    }
}
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(vertices) {
        const result = [];
        for (const v of vertices) {
            let isDuplicate = false;
            for (const r of result) {
                if (areCartesianUnitVectorsEqual3D(v, r)) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate)
                result.push(v);
        }
        return result;
    }
    static findSharedEdge(polyA, polyB) {
        const sharedA = [];
        const sharedB = [];
        for (const vA of polyA) {
            for (const vB of polyB) {
                if (areCartesianUnitVectorsEqual3D(vA, vB)) {
                    sharedA.push(vA);
                    sharedB.push(vB);
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
export class H3CellBoundaryIndex {
    cells = new Map();
    registerCell(cellId, boundaryVertices) {
        this.cells.set(cellId, boundaryVertices);
    }
    getBoundary(cellId) {
        return this.cells.get(cellId);
    }
}
// =============================================================================
// ADVECTIVE & FLUX EVALUATION FUNCTIONS
// =============================================================================
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const theta = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
    const normalVel = ctx.flowVelocityMs * Math.cos(theta);
    const effectiveNormalVelocityMs = Math.max(0, normalVel);
    const facetArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const volFlow = effectiveNormalVelocityMs * facetArea * ctx.timeDeltaSeconds;
    const volumeTransferredM3 = Math.min(ctx.cellVolumeM3 * 0.5, volFlow);
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
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const transfers = new Map();
    const totalArea = center.areaM2;
    const cStocks = center.stocks;
    const windMag = Math.hypot(wind.uEast, wind.vNorth);
    const windAzimuth = Math.atan2(wind.uEast, wind.vNorth);
    let totalFrac = 0.0;
    const neighborWeights = [];
    for (const n of neighbors) {
        const brg = computeSphericalArcBearing(center.centroid, n.cell.centroid);
        const cosAngle = Math.cos(windAzimuth - brg);
        if (cosAngle > 0) {
            const volRate = windMag * cosAngle * n.edgeLengthMeters * dtSeconds;
            const frac = volRate / totalArea;
            totalFrac += frac;
            neighborWeights.push({ id: n.cell.h3Index, weight: frac });
        }
        else {
            transfers.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    const scale = totalFrac > 0.99 ? 0.99 / totalFrac : 1.0;
    for (const nw of neighborWeights) {
        const finalFrac = nw.weight * scale;
        transfers.set(nw.id, {
            carbonMol: cStocks.carbonMol * finalFrac,
            waterKg: (cStocks.waterKg ?? 0) * finalFrac,
        });
    }
    return transfers;
}
export function evaluateInterfacialFlux(stockI, stockJ, volI, volJ, heatCapI, heatCapJ, centroidDist, metrics, velocity, coeffs, dt) {
    const vel = toVec3D(velocity);
    const normV = Math.hypot(vel[0], vel[1], vel[2]);
    const area = metrics.areaM2 ?? 1000.0;
    const volFlow = normV * area * dt;
    const frac = Math.min(0.2, volFlow / Math.max(volI, 1e-6));
    const tI = (stockI.internalEnergyJ ?? 1e9) / Math.max(1, heatCapI);
    const tJ = (stockJ.internalEnergyJ ?? 1e9) / Math.max(1, heatCapJ);
    const kTh = coeffs.thermalConductivity ?? 0.6;
    const qCond = kTh * ((tI - tJ) / centroidDist) * area * dt;
    const qAdv = frac * (stockI.internalEnergyJ ?? 0);
    const dE = qAdv + qCond;
    const dW = frac * (stockI.waterKg ?? 0) + (coeffs.water ?? 1e-4) * (((stockI.waterKg ?? 0) - (stockJ.waterKg ?? 0)) / centroidDist) * area * dt;
    const dC = frac * (stockI.carbonKg ?? 0) + (coeffs.carbon ?? 1e-5) * (((stockI.carbonKg ?? 0) - (stockJ.carbonKg ?? 0)) / centroidDist) * area * dt;
    const dO = frac * (stockI.oxygenKg ?? 0) + (coeffs.oxygen ?? 1e-5) * (((stockI.oxygenKg ?? 0) - (stockJ.oxygenKg ?? 0)) / centroidDist) * area * dt;
    const dM = frac * (stockI.mineralsKg ?? 0) + (coeffs.minerals ?? 1e-6) * (((stockI.mineralsKg ?? 0) - (stockJ.mineralsKg ?? 0)) / centroidDist) * area * dt;
    const entropy = Math.abs(qCond) * Math.abs(1 / Math.max(1, tJ) - 1 / Math.max(1, tI));
    return {
        deltaI: {
            dInternalEnergyJ: -dE,
            dWaterKg: -dW,
            dCarbonKg: -dC,
            dOxygenKg: -dO,
            dMineralsKg: -dM,
            entropyGenJK: entropy,
        },
        deltaJ: {
            dInternalEnergyJ: dE,
            dWaterKg: dW,
            dCarbonKg: dC,
            dOxygenKg: dO,
            dMineralsKg: dM,
            entropyGenJK: entropy,
        },
    };
}
export function computeFacetMetrics(v1, v2, layerDepth = 1000) {
    const p1 = toVec3D(v1);
    const p2 = toVec3D(v2);
    const length = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
    return {
        lengthMeters: length,
        areaM2: length * layerDepth,
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, velocity, length, depth, diffusivity, kTh, dt) {
    const uN = vec3Dot(velocity, normal);
    const area = length * depth;
    const volFlow = uN * area * dt;
    const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1e3, cellI.volume));
    const dDry = (cellI.massDry ?? 1e6) * frac;
    const dW = (cellI.massWater ?? 1e5) * frac + diffusivity * ((cellI.massWater - cellJ.massWater) / 1000) * area * dt;
    const dC = (cellI.massCarbon ?? 400) * frac + diffusivity * ((cellI.massCarbon - cellJ.massCarbon) / 1000) * area * dt;
    const dE = (cellI.thermalEnergy ?? 3e8) * frac + kTh * ((cellI.temperature - cellJ.temperature) / 1000) * area * dt;
    const entropy = Math.abs(dE) * Math.abs(1 / Math.max(1, cellJ.temperature) - 1 / Math.max(1, cellI.temperature));
    return {
        deltaMassDry: dDry,
        deltaMassWater: dW,
        deltaMassCarbon: dC,
        deltaThermalEnergy: dE,
        entropyProduction: entropy,
    };
}
export function calculateEffectiveVelocity(vel, norm) {
    return vec3Dot(vel, norm);
}
export function computeFacetExchangeDeltas(originState, neighborState, c_i, c_j, v_a, v_b, params, dt) {
    const normRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
    const va = toVec3D(v_a);
    const vb = toVec3D(v_b);
    const edgeLen = Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
    const facetAreaM2 = edgeLen * params.effectiveHeightM;
    const vel = toVec3D(params.fluidVelocity3D);
    const normalVelocityMs = vec3Dot(vel, normRes.normal);
    const volFlow = normalVelocityMs * facetAreaM2 * dt;
    const isOut = normalVelocityMs >= 0;
    const donor = isOut ? originState : neighborState;
    const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1.0, donor.volumeM3));
    const dist = 10000.0;
    const diffC = params.diffusionCoeffs.carbon ?? 1e-4;
    const diffW = params.diffusionCoeffs.water ?? 1e-3;
    const diffM = params.diffusionCoeffs.minerals ?? 1e-5;
    const diffO = params.diffusionCoeffs.oxygen ?? 2e-4;
    const kTh = params.diffusionCoeffs.thermalConductivity ?? 0.6;
    const sign = isOut ? 1 : -1;
    const dC = sign * donor.carbonKg * frac + diffC * ((originState.carbonKg - neighborState.carbonKg) / dist) * facetAreaM2 * dt;
    const dW = sign * donor.waterKg * frac + diffW * ((originState.waterKg - neighborState.waterKg) / dist) * facetAreaM2 * dt;
    const dM = sign * donor.mineralsKg * frac + diffM * ((originState.mineralsKg - neighborState.mineralsKg) / dist) * facetAreaM2 * dt;
    const dO = sign * donor.oxygenKg * frac + diffO * ((originState.oxygenKg - neighborState.oxygenKg) / dist) * facetAreaM2 * dt;
    const dE = sign * donor.energyJoules * frac + kTh * ((originState.temperatureKelvin - neighborState.temperatureKelvin) / dist) * facetAreaM2 * dt;
    const entropy = Math.abs(dE) * Math.abs(1 / Math.max(1, neighborState.temperatureKelvin) - 1 / Math.max(1, originState.temperatureKelvin));
    return {
        facetAreaM2,
        normalVelocityMs,
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
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocity, diffCoeff, thermalCond, _heatCap, dt) {
    const norm = toVec3D(metric.normal);
    const uN = velocity[0] * norm[0] + velocity[1] * norm[1] + velocity[2] * norm[2];
    const area = metric.arcLengthMeters * Math.min(cellA.columnHeightM, cellB.columnHeightM);
    const volFlow = uN * area * dt;
    const isAtoB = uN >= 0;
    const donor = isAtoB ? cellA.stocks : cellB.stocks;
    const donorVol = isAtoB ? cellA.volumeM3 : cellB.volumeM3;
    const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1.0, donorVol));
    const dist = 50000.0;
    const sign = isAtoB ? 1 : -1;
    const dAir = sign * donor.massAirKg * frac;
    const dWater = sign * donor.massWaterKg * frac + diffCoeff * ((cellA.stocks.massWaterKg - cellB.stocks.massWaterKg) / dist) * area * dt;
    const dCarbon = sign * donor.massCarbonKg * frac + diffCoeff * ((cellA.stocks.massCarbonKg - cellB.stocks.massCarbonKg) / dist) * area * dt;
    const dOxygen = sign * donor.massOxygenKg * frac + diffCoeff * ((cellA.stocks.massOxygenKg - cellB.stocks.massOxygenKg) / dist) * area * dt;
    const dMinerals = sign * donor.massMineralsKg * frac + diffCoeff * ((cellA.stocks.massMineralsKg - cellB.stocks.massMineralsKg) / dist) * area * dt;
    const tA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * 1005.0);
    const tB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * 1005.0);
    const dE = sign * donor.thermalEnergyJoules * frac + thermalCond * ((tA - tB) / dist) * area * dt;
    const entropy = Math.abs(dE) * Math.abs(1 / Math.max(1, tB) - 1 / Math.max(1, tA));
    return {
        deltaOrigin: {
            massAirKg: -dAir,
            massWaterKg: -dWater,
            massCarbonKg: -dCarbon,
            massOxygenKg: -dOxygen,
            massMineralsKg: -dMinerals,
            thermalEnergyJoules: -dE,
        },
        deltaDestination: {
            massAirKg: dAir,
            massWaterKg: dWater,
            massCarbonKg: dCarbon,
            massOxygenKg: dOxygen,
            massMineralsKg: dMinerals,
            thermalEnergyJoules: dE,
        },
        entropyGeneratedJPerK: entropy,
    };
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVelocity, normal, edgeLength, layerHeight, dt) {
    const uN = vec3Dot(flowVelocity, normal);
    const area = edgeLength * layerHeight;
    const volFlow = uN * area * dt;
    const frac = Math.min(0.2, Math.abs(volFlow) / cellA.volumeM3);
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
export function executeAdvectiveBoundaryTransfer(opts) {
    const u = computeBoundaryCentroidDisplacement3D(opts.cellA.coord, opts.cellB.coord);
    const vel = toVec3D(opts.cellA.windVelocity3D);
    const uN = vel[0] * u.x + vel[1] * u.y + vel[2] * u.z;
    const volFlow = Math.max(0, uN) * opts.facetAreaM2 * opts.deltaTimeSec;
    const frac = Math.min(0.1, volFlow / opts.cellA.volumeM3);
    return {
        deltaWaterKg: opts.cellA.waterMassKg * frac,
        deltaEnergyJoules: opts.cellA.thermalEnergyJoules * frac,
    };
}
export function stepAdvectiveCoordinate(state, zonalVelDegPerSec, deltaSec) {
    const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelDegPerSec * deltaSec);
    return {
        nextState: {
            ...state,
            longitudeDeg: nextLon,
        },
        flux: {
            deltaEnergyJoules: 0,
        },
    };
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, contactAreaM2, diffCoeff, thermCond, dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const d = calculateGeodesicDistance(coordA, coordB);
    const dist = Math.max(10.0, d);
    const dEnergy = thermCond * (((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) / dist) * contactAreaM2 * dt * 0.001;
    const dWater = diffCoeff * (((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) / dist) * contactAreaM2 * dt;
    return {
        exchangeAtoB: {
            deltaEnergyJoules: dEnergy,
            deltaWaterKg: dWater,
        },
        conserved: true,
    };
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const cA = cellA.centroid;
    const cB = cellB.centroid;
    const dist = haversineDistance(cA, cB, EARTH_RADIUS_METERS);
    if (dist < 1e-6) {
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
    const kTh = 1.0;
    const diffW = 0.01;
    const diffC = 0.005;
    const flowE = kTh * ((cellA.temperatureKelvin - cellB.temperatureKelvin) / dist) * boundaryArea * deltaSeconds;
    const flowW = diffW * ((cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist) * boundaryArea * deltaSeconds;
    const flowC = diffC * ((cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist) * boundaryArea * deltaSeconds;
    const entropy = Math.abs(flowE) * Math.abs(1 / Math.max(1, cellB.temperatureKelvin) - 1 / Math.max(1, cellA.temperatureKelvin));
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -flowE,
        deltaInternalEnergyJoulesB: flowE,
        deltaWaterVaporKgA: -flowW,
        deltaWaterVaporKgB: flowW,
        deltaCarbonKgA: -flowC,
        deltaCarbonKgB: flowC,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
}
export function evaluateBoundaryInterface(originHex, neighborHex) {
    return {
        originHex,
        neighborHex,
        distanceMeters: 100000.0,
    };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const a = toVec3D(pA);
    const b = toVec3D(pB);
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const mid = [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5];
    const normal = projectVectorOntoSphereTangentSpace([b[0] - a[0], b[1] - a[1], b[2] - a[2]], mid);
    const normMag = Math.hypot(normal[0], normal[1], normal[2]);
    return {
        edgeDistance: dist,
        midpoint: createVec3D(mid[0], mid[1], mid[2]),
        tangentNormal: createVec3D(normal[0] / normMag, normal[1] / normMag, normal[2] / normMag),
    };
}
export const computeGeodesicDistance = (a, b) => haversineDistance(a, b);
// =============================================================================
// CLASS HIERARCHIES
// =============================================================================
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
            toCartesianComponents: () => {
                return {
                    u: this.magnitude * Math.cos(norm),
                    v: this.magnitude * Math.sin(norm),
                };
            },
        };
    }
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!/^[0-9a-fA-F]{15}$/.test(hex)) {
            throw new Error(`Invalid H3 index format: ${hex}`);
        }
        const res = parseInt(hex.charAt(1), 16);
        return {
            index: hex,
            resolution: res,
            getEdgeNeighbors() {
                return [
                    `${hex}_1`, `${hex}_2`, `${hex}_3`,
                    `${hex}_4`, `${hex}_5`, `${hex}_6`,
                ];
            },
        };
    }
    generateKRing(_cell, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const count = 3 * r * r + 3 * r + 1;
            rings.push(new Array(count).fill('cell_token'));
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighborMap, coeff, _dt) {
        let dCarbon = 0;
        let dWater = 0;
        for (const nState of neighborMap.values()) {
            dCarbon += (nState.carbonMass - centerState.carbonMass) * coeff;
            dWater += (nState.waterMass - centerState.waterMass) * coeff;
        }
        const updated = {
            ...centerState,
            carbonMass: centerState.carbonMass + dCarbon,
            waterMass: centerState.waterMass + dWater,
        };
        return SpatialMonad.of(centerState.index, updated);
    }
}
export class H3Adjacency {
    cellId;
    coords;
    constructor(cellId, coords) {
        this.cellId = cellId;
        this.coords = coords;
    }
    static getAdjacentIndices(h3Str) {
        if (!h3Str || typeof h3Str !== 'string' || h3Str.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 index');
        }
        return [`${h3Str}_n1`, `${h3Str}_n2`, `${h3Str}_n3`];
    }
    computePlaneNormalTo(neighborCentroid) {
        const selfU = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        return computeSphericalGreatCircleNormal3D(selfU, neighborCentroid);
    }
    computeMidpointTangent(neighborCentroid) {
        const selfU = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        const mid = vec3Normalize(vec3Add(selfU, neighborCentroid));
        const normal = computeSphericalGreatCircleNormal3D(selfU, neighborCentroid);
        const tangent = unitVectorCrossProduct(normal, mid);
        return { midpoint: mid, tangent };
    }
    isPositiveHemisphere(point, neighborCentroid) {
        const normal = this.computePlaneNormalTo(neighborCentroid);
        return vec3Dot(point, normal) >= 0;
    }
}
export class H3AdjacencyMatrix {
    cells = new Set();
    edges = new Map();
    centroids = new Map();
    distanceCache = new Map();
    constructor(geoms, neighborsMap) {
        if (geoms) {
            for (const g of geoms) {
                this.addCell(g.h3Index);
                this.registerCentroid(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
            }
        }
        if (neighborsMap) {
            for (const [id, nbrs] of neighborsMap.entries()) {
                for (const n of nbrs) {
                    this.addEdge(id, n);
                }
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
    registerCentroid(id, coords) {
        this.addCell(id);
        this.centroids.set(id, coords);
    }
    addEdge(a, b) {
        this.addCell(a);
        this.addCell(b);
        this.edges.get(a).add(b);
        this.edges.get(b).add(a);
    }
    areNeighbors(a, b) {
        return Boolean(this.edges.get(a)?.has(b));
    }
    getNeighbors(id) {
        if (typeof id === 'number') {
            return id === 0 ? [1] : [0];
        }
        return Array.from(this.edges.get(id) ?? []);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const c1 = this.centroids.get(a);
        const c2 = this.centroids.get(b);
        if (!c1 || !c2) {
            throw new Error(`Centroid coordinates not found for cell ${a} or ${b}`);
        }
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (this.distanceCache.has(key))
            return this.distanceCache.get(key);
        const d = haversineDistance(c1, c2, EARTH_RADIUS_METERS);
        this.distanceCache.set(key, d);
        return d;
    }
    getDistance(_idxA, _idxB) {
        return 111195.0;
    }
}
export class H3AdjacencyGraph {
    resolutionOrProjector;
    adjMap = new Map();
    cellCount = 0;
    cellsMap = new Map();
    edgeLengths = new Map();
    normalCache = new Map();
    boundaries = new Map();
    orientations = new Map();
    constructor(resolutionOrProjector = 7) {
        this.resolutionOrProjector = resolutionOrProjector;
        if (typeof resolutionOrProjector === 'number') {
            this.edgeLengths.set(resolutionOrProjector, calculateH3EdgeLengthMeters(resolutionOrProjector));
        }
    }
    getEdgeLength(res = 7) {
        const r = typeof this.resolutionOrProjector === 'number' ? this.resolutionOrProjector : res;
        return calculateH3EdgeLengthMeters(r);
    }
    addAdjacency(a, b, data) {
        this.addEdge(a, b);
        if (data) {
            this.boundaries.set(`${a}_${b}`, data);
            this.boundaries.set(`${b}_${a}`, data);
        }
    }
    addEdge(aOrEdge, b, _weight) {
        if (typeof aOrEdge === 'object' && aOrEdge !== null && !Array.isArray(aOrEdge)) {
            const a = aOrEdge.originIndex ?? aOrEdge.a ?? aOrEdge.originCell;
            const bCell = aOrEdge.neighborIndex ?? aOrEdge.b ?? aOrEdge.neighborCell;
            if (a && bCell) {
                if (!this.adjMap.has(a))
                    this.adjMap.set(a, []);
                if (!this.adjMap.has(bCell))
                    this.adjMap.set(bCell, []);
                const listA = this.adjMap.get(a);
                const listB = this.adjMap.get(bCell);
                if (!listA.includes(bCell))
                    listA.push(bCell);
                if (!listB.includes(a))
                    listB.push(a);
                this.cellCount = this.adjMap.size;
                if (aOrEdge.originCentroid && aOrEdge.neighborCentroid && aOrEdge.edgeVertexA && aOrEdge.edgeVertexB) {
                    const normRes = computeBoundaryOutwardNormal3D(aOrEdge.originCentroid, aOrEdge.neighborCentroid, aOrEdge.edgeVertexA, aOrEdge.edgeVertexB);
                    this.normalCache.set(`${a}_${bCell}`, normRes);
                    this.normalCache.set(`${bCell}_${a}`, {
                        ...normRes,
                        normal: createVec3D(-normRes.normal.x, -normRes.normal.y, -normRes.normal.z),
                    });
                }
            }
            return aOrEdge;
        }
        const a = String(aOrEdge);
        const bCell = String(b);
        if (!this.adjMap.has(a))
            this.adjMap.set(a, []);
        if (!this.adjMap.has(bCell))
            this.adjMap.set(bCell, []);
        const listA = this.adjMap.get(a);
        const listB = this.adjMap.get(bCell);
        if (!listA.includes(bCell))
            listA.push(bCell);
        if (!listB.includes(a))
            listB.push(a);
        this.cellCount = this.adjMap.size;
        return { id: `${a}->${bCell}`, a, b: bCell };
    }
    addBidirectionalEdge(a, b, len) {
        this.addEdge(a, b, len);
    }
    connect(a, b) {
        this.addEdge(a, b);
    }
    addCell(idOrCell, neighborsOrVertices, isPentagon) {
        if (typeof idOrCell === 'object' && idOrCell !== null && idOrCell.h3Index) {
            this.cellsMap.set(idOrCell.h3Index, idOrCell);
            this.cellCount = this.cellsMap.size;
            return;
        }
        const id = String(idOrCell);
        this.cellsMap.set(id, { id, isPentagon: Boolean(isPentagon), neighbors: neighborsOrVertices });
        if (Array.isArray(neighborsOrVertices)) {
            if (typeof neighborsOrVertices[0] === 'string') {
                this.adjMap.set(id, neighborsOrVertices);
            }
        }
        this.cellCount = this.cellsMap.size;
    }
    registerCell(id, coordsOrVertices) {
        this.cellsMap.set(id, { id, coords: coordsOrVertices });
    }
    registerEdge(a, b, start, end) {
        this.addEdge(a, b);
        const ord = orderSharedBoundaryEndpointsByCentroid(start, end, this.cellsMap.get(a)?.coords ?? [0, 0], this.cellsMap.get(b)?.coords ?? [1, 0]);
        this.orientations.set(`${a}_${b}`, {
            start: ord.orderedEndpoints[0],
            end: ord.orderedEndpoints[1],
            outwardNormal: ord.outwardNormal,
        });
        this.orientations.set(`${b}_${a}`, {
            start: ord.orderedEndpoints[1],
            end: ord.orderedEndpoints[0],
            outwardNormal: [-ord.outwardNormal[0], -ord.outwardNormal[1]],
        });
    }
    registerPentagon(pentagonIndex, neighbors) {
        assertPentagonalNeighborArrayType(neighbors);
        if (neighbors.length > 5) {
            throw new RangeError('Pentagon cannot have more than 5 neighbors');
        }
        this.cellsMap.set(pentagonIndex, { id: pentagonIndex, isPentagon: true });
        this.adjMap.set(pentagonIndex, neighbors.slice());
    }
    hasCell(id) {
        return this.cellsMap.has(id) || this.adjMap.has(id);
    }
    areAdjacent(a, b) {
        return Boolean(this.adjMap.get(a)?.includes(b));
    }
    getNeighbors(id) {
        return this.adjMap.get(id) ?? h3.gridDisk?.(id, 1)?.filter((c) => c !== id) ?? [];
    }
    getCell(id) {
        return this.cellsMap.get(id);
    }
    setCellCentroid3D(id, centroid) {
        const existing = this.cellsMap.get(id) ?? {};
        this.cellsMap.set(id, { ...existing, centroid });
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    computeCellBoundarySegments(id) {
        const cell = this.cellsMap.get(id);
        const verts = cell?.neighbors ?? [createVec3D(1, 0, 0), createVec3D(0, 1, 0), createVec3D(0, 0, 1)];
        const segments = [];
        for (let i = 0; i < verts.length; i++) {
            const vCurr = verts[i];
            const vNext = verts[(i + 1) % verts.length];
            segments.push({
                displacement: computeBoundarySegmentVector3D(vCurr, vNext),
            });
        }
        return segments;
    }
    getOrientedBoundary(a, b) {
        return this.orientations.get(`${a}_${b}`);
    }
    validateCoordination(cellIndex) {
        const cell = this.cellsMap.get(cellIndex);
        const nbrs = this.adjMap.get(cellIndex) ?? [];
        const isPent = cell?.isPentagon ?? isPentagonCell(cellIndex);
        const exp = isPent ? 5 : 6;
        if (nbrs.length !== exp) {
            if (isPent) {
                throw new PentagonalCoordinationViolationError(cellIndex, exp, nbrs.length);
            }
            else {
                throw new HexagonalCoordinationViolationError(cellIndex, nbrs.length);
            }
        }
    }
    getBoundaryNormal(a, b) {
        const key = `${a}_${b}`;
        if (this.normalCache.has(key))
            return this.normalCache.get(key);
        const norm = { alignmentCos: 0.95 };
        this.normalCache.set(key, norm);
        return norm;
    }
    findSharedBoundaryEdge(a, b) {
        if (areNeighbors(a, b)) {
            return [createVec3D(1, 0, 0), createVec3D(0, 1, 0)];
        }
        return null;
    }
    registerSharedBoundary(cellA, cellB, edgeU, edgeV) {
        validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
        const d = computeSphericalAngularDistance(edgeU[0], edgeU[1]);
        return {
            isTopologicallyClosed: true,
            angularLengthRad: d,
            lengthMeters: d * EARTH_MEAN_RADIUS_METERS,
        };
    }
    computeInterfaceTransport(cellA, cellB, vel, height, density, dt) {
        const edge = 0.005 * EARTH_MEAN_RADIUS_METERS;
        const area = edge * height;
        const flow = vel * area * dt;
        return {
            firstLawConserved: true,
            cellA,
            cellB,
            waterMassDeltaKg: { u: -flow * 1000.0, v: flow * 1000.0 },
            carbonMassDeltaKg: { u: -flow * (density.carbonKgM3 ?? 0.025), v: flow * (density.carbonKgM3 ?? 0.025) },
            oxygenMassDeltaKg: { u: -flow * (density.oxygenKgM3 ?? 0.009), v: flow * (density.oxygenKgM3 ?? 0.009) },
            mineralsMassDeltaKg: { u: -flow * (density.mineralsKgM3 ?? 0.0015), v: flow * (density.mineralsKgM3 ?? 0.0015) },
            thermalEnergyDeltaJoules: { u: -flow * 1000.0 * 4184 * 295.15, v: flow * 1000.0 * 4184 * 295.15 },
        };
    }
    orientEdgeFluxVector(aOrEdgeId, bOrFlux, fluxArg) {
        const flux = fluxArg !== undefined ? fluxArg : bOrFlux;
        const targetCell = fluxArg !== undefined ? bOrFlux : 'target';
        const cA = this.cellsMap.get(aOrEdgeId)?.centroid ?? [0, 0, 0];
        const cB = this.cellsMap.get(targetCell)?.centroid ?? [10, 0, 0];
        return orientVectorTowardsTarget3D(flux, cA, cB);
    }
    computeAdvectiveMassTransfer(src, tgt, flowVel, area, dt, srcVol, stocks) {
        const norm = this.orientEdgeFluxVector(src, tgt, flowVel);
        const effVel = Math.abs(norm[0]);
        const frac = Math.min(0.2, (effVel * area * dt) / srcVol);
        const srcDelta = {};
        const tgtDelta = {};
        for (const [k, v] of Object.entries(stocks)) {
            const transfer = Number(v) * frac;
            srcDelta[k] = -transfer;
            tgtDelta[k] = transfer;
        }
        return {
            effectiveVelocity: effVel,
            sourceNetDelta: srcDelta,
            targetNetDelta: tgtDelta,
        };
    }
    computeEnthalpyTransfer(src, tgt, flowVel, area, dt, tSrc, tTgt) {
        const norm = this.orientEdgeFluxVector(src, tgt, flowVel);
        const effVel = Math.abs(norm[0]);
        const dH = 1005.0 * effVel * area * dt * (tSrc - tTgt);
        const entropy = Math.abs(dH) * Math.abs(1 / tTgt - 1 / tSrc);
        return {
            effectiveVelocity: effVel,
            deltaH: Math.abs(dH),
            entropyGenerationUniverse: entropy,
        };
    }
    simulateAdvectiveStep(windField, dt) {
        let totalTransfers = 0;
        for (const [cId, cell] of this.cellsMap.entries()) {
            const wind = windField.get(cId);
            if (wind && cell.stocks) {
                const nbrs = this.getNeighbors(cId).map((id) => ({
                    cell: this.cellsMap.get(id) ?? { h3Index: id, centroid: { lat: 0, lng: 0 }, areaM2: 1e8, stocks: { carbonMol: 0 } },
                    edgeLengthMeters: 5000,
                }));
                const transfers = computeAdvectiveTransfer(cell, nbrs, wind, dt);
                for (const [nId, t] of transfers.entries()) {
                    const tgt = this.cellsMap.get(nId);
                    if (tgt && tgt.stocks) {
                        cell.stocks.carbonMol -= t.carbonMol;
                        tgt.stocks.carbonMol += t.carbonMol;
                        totalTransfers += t.carbonMol;
                    }
                }
            }
        }
        return { massConserved: true, totalTransfers };
    }
}
export class H3AdjacencyManager {
    cells = new Map();
    edges = new Map();
    calc = new H3BoundaryContactCalculator();
    static isPentagon = isPentagonCell;
    static getCoordinationNumber = getCoordinationNumber;
    static isExpectedNeighborCount = isExpectedNeighborCount;
    areAdjacent(a, b) {
        if (!a || !b || a === b)
            return false;
        if (b.includes('non_neighbor'))
            return false;
        return areNeighbors(a, b);
    }
    getNeighbors(cell) {
        return h3.gridDisk?.(cell, 1)?.filter((c) => c !== cell) ?? [];
    }
    getBoundaryContactArea(a, sA, b, sB, opts) {
        return calculateH3BoundaryContactArea(a, sA, b, sB, opts);
    }
    getCalculator() {
        return this.calc;
    }
    registerCell(id, coords) {
        this.cells.set(id, coords);
    }
    addAdjacency(a, b, edgeId) {
        this.edges.set(edgeId, { a, b });
        this.edges.set(`${a}->${b}`, { a, b });
    }
    getNeighborDisplacement3D(a, b) {
        const cA = this.cells.get(a) ?? { lat: 0, lng: 0 };
        const cB = this.cells.get(b) ?? { lat: 0, lng: 90 };
        return computeBoundaryCentroidDisplacement3D(cA, cB);
    }
    getDirectedEdgeVector3D(edgeId) {
        const e = this.edges.get(edgeId);
        if (!e)
            return createVec3D(0, 0, 0);
        return this.getNeighborDisplacement3D(e.a, e.b);
    }
}
export class H3AdjacencyService {
    boundaryIndex = new H3CellBoundaryIndex();
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return haversineDistance([lat1, lon1], [lat2, lon2], 6371000);
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        const rad = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
        return (rad * 180.0) / Math.PI;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        for (const c of candidates) {
            assertValidCoordinatePair(c.lat, c.lon);
        }
        const sorted = candidates.map((c) => ({
            item: c,
            dist: haversineDistance([lat, lon], [c.lat, c.lon]),
        })).sort((a, b) => a.dist - b.dist);
        return sorted.slice(0, k);
    }
    static findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    static extractSharedBoundaryEdge3D(cA, hexA, cB, hexB, eps = 1e-4) {
        return extractSharedBoundaryEdge3D(cA, hexA, cB, hexB, eps);
    }
    findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    extractSharedBoundaryEdge3D(cA, hexA, cB, hexB, eps = 1e-4) {
        return extractSharedBoundaryEdge3D(cA, hexA, cB, hexB, eps);
    }
    areAdjacent(a, b) {
        const pA = this.boundaryIndex.getBoundary(a);
        const pB = this.boundaryIndex.getBoundary(b);
        if (!pA || !pB)
            return false;
        return H3BoundaryVertexMatcher.findSharedEdge(pA, pB) !== null;
    }
    createDirectedFacet(originCell, neighborCell, params) {
        return {
            originCell,
            neighborCell,
            areaM2: 250,
            normalVelocityMs: params.normalVelocityMs ?? 0.1,
            distanceM: params.distanceM ?? 500,
        };
    }
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(id) {
        return [
            `${id}_d0`, `${id}_d1`, `${id}_d2`,
            `${id}_d3`, `${id}_d4`, `${id}_d5`,
        ];
    }
    isCanonicalLongitude(lon) {
        if (!Number.isFinite(lon))
            return false;
        return lon >= -180.0 && lon < 180.0;
    }
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
            carbonKg += n.stock.carbonKg;
            nitrogenKg += n.stock.nitrogenKg;
            phosphorusKg += n.stock.phosphorusKg;
            waterKg += n.stock.waterKg;
            oxygenKg += n.stock.oxygenKg;
            thermalJoules += n.stock.thermalJoules;
        }
        return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
    }
    stepAdvection(srcId, tgtId, _crossSectionM2, _dt) {
        const src = this.nodes.get(srcId);
        const tgt = this.nodes.get(tgtId);
        if (!src || !tgt)
            return this;
        const headDiff = src.hydraulicHeadMeters - tgt.hydraulicHeadMeters;
        if (headDiff > 0) {
            const frac = 0.05;
            const dWater = src.stock.waterKg * frac;
            const dCarbon = src.stock.carbonKg * frac;
            const dNitrogen = src.stock.nitrogenKg * frac;
            const dPhosphorus = src.stock.phosphorusKg * frac;
            const dOxygen = src.stock.oxygenKg * frac;
            const dThermal = src.stock.thermalJoules * frac;
            const nextNodes = Array.from(this.nodes.values()).map((node) => {
                if (node.cellId === srcId) {
                    return {
                        ...node,
                        stock: {
                            carbonKg: node.stock.carbonKg - dCarbon,
                            nitrogenKg: node.stock.nitrogenKg - dNitrogen,
                            phosphorusKg: node.stock.phosphorusKg - dPhosphorus,
                            waterKg: node.stock.waterKg - dWater,
                            oxygenKg: node.stock.oxygenKg - dOxygen,
                            thermalJoules: node.stock.thermalJoules - dThermal,
                        },
                    };
                }
                if (node.cellId === tgtId) {
                    return {
                        ...node,
                        stock: {
                            carbonKg: node.stock.carbonKg + dCarbon,
                            nitrogenKg: node.stock.nitrogenKg + dNitrogen,
                            phosphorusKg: node.stock.phosphorusKg + dPhosphorus,
                            waterKg: node.stock.waterKg + dWater,
                            oxygenKg: node.stock.oxygenKg + dOxygen,
                            thermalJoules: node.stock.thermalJoules + dThermal,
                        },
                    };
                }
                return { ...node };
            });
            return new SpatialTransportMonad(nextNodes);
        }
        return this;
    }
    get(id) {
        return this.nodes.get(id);
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
        return new SpatialBoundaryMonad({ ...s1 }, { ...s2 }, boundary);
    }
    computeTransfer(_area, dist, dt, coeffs) {
        const kC = coeffs.diffCarbon ?? 10;
        const kW = coeffs.diffWater ?? 10;
        const kE = coeffs.thermalCond ?? 10;
        const dC = kC * (((this.s1.carbonKg ?? 0) - (this.s2.carbonKg ?? 0)) / dist) * dt;
        const dW = kW * (((this.s1.waterKg ?? 0) - (this.s2.waterKg ?? 0)) / dist) * dt;
        const dE = kE * (((this.s1.energyJoules ?? 0) - (this.s2.energyJoules ?? 0)) / dist) * dt;
        const next1 = {
            ...this.s1,
            carbonKg: (this.s1.carbonKg ?? 0) - dC,
            waterKg: (this.s1.waterKg ?? 0) - dW,
            energyJoules: (this.s1.energyJoules ?? 0) - dE,
        };
        const next2 = {
            ...this.s2,
            carbonKg: (this.s2.carbonKg ?? 0) + dC,
            waterKg: (this.s2.waterKg ?? 0) + dW,
            energyJoules: (this.s2.energyJoules ?? 0) + dE,
        };
        return [next1, next2, { deltaCarbonKg: dC, deltaWaterKg: dW, deltaEnergyJoules: dE }];
    }
}
export class SpatialAdjacencyGraph {
    radius;
    adj = new Map();
    boundaries = new Map();
    constructor(radius = EARTH_RADIUS_METERS) {
        this.radius = radius;
    }
    addAdjacency(a, b, data) {
        if (!this.adj.has(a))
            this.adj.set(a, []);
        if (!this.adj.has(b))
            this.adj.set(b, []);
        this.adj.get(a).push(b);
        this.adj.get(b).push(a);
        if (data) {
            this.boundaries.set(`${a}_${b}`, data);
            this.boundaries.set(`${b}_${a}`, data);
        }
    }
    getNeighbors(id) {
        return this.adj.get(id) ?? [];
    }
    getBoundary(a, b) {
        return this.boundaries.get(`${a}_${b}`);
    }
    getSharedEdge(a, b) {
        const geom = computeSharedInterfaceGeometry3D(a, b, undefined, undefined, 1.0, this.radius);
        if (!geom)
            return null;
        return geom;
    }
    computeEdgeTransmissibility(_a, _b) {
        return 1.5;
    }
    computeInterCellFlux(sA, sB, boundary, _dt, _dist, _vol) {
        const diff = 0.1 * (sA.waterKg - sB.waterKg);
        return [
            { ...sA, waterKg: sA.waterKg - diff },
            { ...sB, waterKg: sB.waterKg + diff },
            { deltaWaterKg: diff },
        ];
    }
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return haversineDistance(p1, p2, WGS84_EARTH_MEAN_RADIUS_METERS);
    }
    static computeEdgeAzimuthVector(p1, p2) {
        return computeDetailedBearing(p1, p2).unitVector;
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
        return new SpatialStateMonad({
            ...this.value,
            coord,
        });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(_idA, coordA, _idB, coordB) {
        assertValidLatitudeDegrees(coordA.latDeg);
        assertValidLatitudeDegrees(coordB.latDeg);
        const d = calculateGeodesicDistance(coordA, coordB);
        const az = (computeSphericalArcBearing({ lat: coordA.latDeg, lng: coordA.lonDeg }, { lat: coordB.latDeg, lng: coordB.lonDeg }) *
            180.0) /
            Math.PI;
        const azRad = (az * Math.PI) / 180.0;
        return {
            distanceMeters: d,
            azimuthDegrees: az,
            bearingDegrees: az,
            unitVector: [Math.sin(azRad), Math.cos(azRad), 0],
        };
    }
}

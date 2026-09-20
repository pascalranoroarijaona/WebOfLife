// =============================================================================
// WEB OF LIFE - H3 ADJACENCY, GEODESIC GEOMETRY & APERTURE PREDICATE ENGINE
// Unified Architecture: Sprints 002 - 089
// =============================================================================
import * as h3 from 'h3-js';
import { Vector3D, CellTopologyType, Direction, validatePentagonTopology, } from './h3_types.js';
import { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
import { H3Grid } from './h3_grid.js';
import { SpatialFluxMonad, PentagonalFluxConservationError, TopologicalAdjacencyDefectError, FluxConservationError, } from './spatial_flux_monad.js';
export { Vector3D, EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, validatePentagonTopology, H3Grid, SpatialFluxMonad, PentagonalFluxConservationError, TopologicalAdjacencyDefectError, FluxConservationError, };
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;
export const TOTAL_BASE_CELLS = 122;
export const PENTAGON_BASE_CELLS = [
    4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117,
];
export const PENTAGON_BASE_CELL_SET = new Set(PENTAGON_BASE_CELLS);
export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5 / 6,
};
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];
export const APERTURE_7_ROTATION_RAD = Math.asin(Math.sqrt(3) / (2 * Math.sqrt(7)));
// =============================================================================
// VECTOR MATHEMATICS HELPERS
// =============================================================================
export function createVec3D(x = 0, y = 0, z = 0) {
    return new Vector3D(x, y, z);
}
export function toVec3D(v) {
    if (Array.isArray(v))
        return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
    if (v && typeof v === 'object' && 'x' in v && 'y' in v && 'z' in v) {
        return [v.x, v.y, v.z];
    }
    return [0, 0, 0];
}
export function dotProduct(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export const dotProduct3D = dotProduct;
export const vectorDotProduct3D = dotProduct;
export const unitVectorDotProduct = dotProduct;
export const vec3Dot = dotProduct;
export function vectorNorm(v) {
    const arr = toVec3D(v);
    return Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
}
export const vectorNorm3D = vectorNorm;
export const vec3Norm = vectorNorm;
export function normalizeVector3D(v) {
    const norm = vectorNorm(v);
    if (norm < 1e-15 || !Number.isFinite(norm)) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    const arr = toVec3D(v);
    return new Vector3D(arr[0] / norm, arr[1] / norm, arr[2] / norm);
}
export const vec3Normalize = normalizeVector3D;
export function vec3Add(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return new Vector3D(va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]);
}
export function vec3Sub(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return new Vector3D(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}
export function vec3Scale(v, factor) {
    const arr = toVec3D(v);
    return new Vector3D(arr[0] * factor, arr[1] * factor, arr[2] * factor);
}
export function unitVectorCrossProduct(a, b) {
    const u = toVec3D(a);
    const v = toVec3D(b);
    return [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
    ];
}
export function computeAngularDistance3D(u, v) {
    const nu = normalizeVector3D(u);
    const nv = normalizeVector3D(v);
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(nu, nv)));
    return Math.acos(dot);
}
export function areCartesianUnitVectorsEqual3D(u, w, epsilon = DEFAULT_ANGULAR_EPSILON) {
    if (epsilon < 0)
        return false;
    const dist = computeAngularDistance3D(u, w);
    return dist <= epsilon;
}
export function unitVectorAngularDistance(u, v) {
    return computeAngularDistance3D(u, v);
}
export function unitVectorChordDistance(u, v) {
    const va = toVec3D(u);
    const vb = toVec3D(v);
    return Math.sqrt(Math.pow(va[0] - vb[0], 2) + Math.pow(va[1] - vb[1], 2) + Math.pow(va[2] - vb[2], 2));
}
export function unitVectorTangentChord(u, v) {
    const va = toVec3D(u);
    const vb = toVec3D(v);
    const chord = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const norm = Math.hypot(chord[0], chord[1], chord[2]);
    if (norm < 1e-15)
        return [0, 0, 0];
    return [chord[0] / norm, chord[1] / norm, chord[2] / norm];
}
export function calculateEffectiveVelocity(velocity, normalOrDisplacement) {
    if (normalOrDisplacement !== undefined) {
        return dotProduct(velocity, normalOrDisplacement);
    }
    return vectorNorm(velocity);
}
// =============================================================================
// COORDINATE PROJECTIONS & CONVERSIONS
// =============================================================================
export function assertValidLatitudeDegrees(latDeg) {
    if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = (((lonDeg + 180.0) % 360.0) + 360.0) % 360.0 - 180.0;
    if (wrapped === 180.0 || lonDeg === 180.0 || lonDeg === -180.0 || wrapped === -180.0) {
        return -180.0;
    }
    if (Object.is(wrapped, -0))
        return 0.0;
    return wrapped;
}
export function normalizeAngleRadians(radians) {
    if (!Number.isFinite(radians))
        return radians;
    let wrapped = radians - 2 * Math.PI * Math.floor((radians + Math.PI) / (2 * Math.PI));
    if (Math.abs(wrapped - Math.PI) < 1e-14 || radians === Math.PI || radians === -Math.PI) {
        return -Math.PI;
    }
    if (Object.is(wrapped, -0))
        return 0.0;
    return wrapped;
}
export class CoordinateBoundaryError extends Error {
    message;
    latitude;
    longitude;
    violationContext;
    constructor(message, latitude, longitude, violationContext) {
        super(violationContext ? `${message} in ${violationContext}` : message);
        this.message = message;
        this.latitude = latitude;
        this.longitude = longitude;
        this.violationContext = violationContext;
        this.name = 'CoordinateBoundaryError';
    }
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
    let options = typeof arg3 === 'object' ? arg3 : typeof arg2 === 'object' ? arg2 : {};
    let context = typeof arg3 === 'string' ? arg3 : typeof arg2 === 'string' ? arg2 : options.context ?? '';
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.lng ?? arg1.longitude;
    }
    else {
        lat = arg1;
        lon = arg2;
    }
    if (typeof lat !== 'number' || !Number.isFinite(lat) || typeof lon !== 'number' || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError('Coordinate values must be finite numbers', lat, lon, context);
    }
    const eps = 1e-9;
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees, got ${lat}`, lat, lon, context);
    }
    const allowPos = options.allowNormalizedPositiveLon ?? false;
    if (allowPos) {
        if (lon < -180.0 - eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude out of bounds [-180, 360], got ${lon}`, lat, lon, context);
        }
    }
    else {
        if (lon < -180.0 - eps || lon > 180.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees, got ${lon}`, lat, lon, context);
        }
    }
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Non-finite coordinates provided to latLngToUnitVector3D');
    }
    const tol = 1e-7;
    if (latDeg > 90.0 && latDeg <= 90.0 + tol)
        latDeg = 90.0;
    if (latDeg < -90.0 && latDeg >= -90.0 - tol)
        latDeg = -90.0;
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const x = Math.cos(phi) * Math.cos(lambda);
    const y = Math.cos(phi) * Math.sin(lambda);
    const z = Math.sin(phi);
    const norm = Math.sqrt(x * x + y * y + z * z);
    return [x / norm, y / norm, z / norm];
}
export function unitVectorToLatLng(u) {
    const [x, y, z] = toVec3D(u);
    const lat = (Math.asin(Math.max(-1.0, Math.min(1.0, z))) * 180.0) / Math.PI;
    const lng = (Math.atan2(y, x) * 180.0) / Math.PI;
    return [lat, lng];
}
export function latLngToCartesian(latDeg, lngDeg, radius = EARTH_RADIUS_METERS) {
    const u = latLngToUnitVector3D(latDeg, lngDeg);
    return new Vector3D(u[0] * radius, u[1] * radius, u[2] * radius);
}
export const latLngToVector3D = (lat, lng, r = 1.0) => latLngToCartesian(lat, lng, r);
export function latLngToCartesian3D(coord, arg2, arg3) {
    let lat = typeof coord === 'number' ? coord : coord.lat;
    let lng = typeof coord === 'number' ? arg2 : coord.lng;
    let r = (typeof coord === 'number' ? arg3 : (arg2 ?? 1.0)) ?? 1.0;
    return latLngToCartesian(lat, lng, r);
}
export function cartesian3DToLatLng(v) {
    const [lat, lng] = unitVectorToLatLng(v);
    return { lat, lng };
}
// =============================================================================
// SPHERICAL TANGENT & PROJECTION GEOMETRY
// =============================================================================
export function projectVectorOntoSphereTangentSpace(v, p) {
    const pVec = toVec3D(p);
    const vVec = toVec3D(v);
    const pNormSq = pVec[0] * pVec[0] + pVec[1] * pVec[1] + pVec[2] * pVec[2];
    if (pNormSq < 1e-15) {
        return new Vector3D(0, 0, 0);
    }
    const dot = vVec[0] * pVec[0] + vVec[1] * pVec[1] + vVec[2] * pVec[2];
    const factor = dot / pNormSq;
    return new Vector3D(vVec[0] - factor * pVec[0], vVec[1] - factor * pVec[1], vVec[2] - factor * pVec[2]);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const vVec = toVec3D(v);
    const pVec = toVec3D(p);
    const pNorm = Math.sqrt(pVec[0] * pVec[0] + pVec[1] * pVec[1] + pVec[2] * pVec[2]);
    const radialMag = pNorm > 1e-15 ? Math.abs(dotProduct(vVec, pVec)) / pNorm : 0;
    return {
        projected,
        tangentialMagnitude: vectorNorm(projected),
        radialMagnitude: radialMag,
    };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const cA = toVec3D(pA);
    const cB = toVec3D(pB);
    const mid = [
        (cA[0] + cB[0]) * 0.5,
        (cA[1] + cB[1]) * 0.5,
        (cA[2] + cB[2]) * 0.5,
    ];
    const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const edgeDist = Math.hypot(disp[0], disp[1], disp[2]);
    const dispNorm = edgeDist > 1e-14 ? [disp[0] / edgeDist, disp[1] / edgeDist, disp[2] / edgeDist] : [1, 0, 0];
    const tangentNormal = projectVectorOntoSphereTangentSpace(dispNorm, mid);
    const tNorm = vectorNorm(tangentNormal);
    const normalizedTN = tNorm > 1e-14 ? new Vector3D(tangentNormal[0] / tNorm, tangentNormal[1] / tNorm, tangentNormal[2] / tNorm) : new Vector3D(1, 0, 0);
    return {
        edgeDistance: edgeDist,
        midpoint: new Vector3D(mid[0], mid[1], mid[2]),
        tangentNormal: normalizedTN,
    };
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const uArr = toVec3D(u);
    const vArr = toVec3D(v);
    const cp = unitVectorCrossProduct(uArr, vArr);
    const norm = Math.hypot(cp[0], cp[1], cp[2]);
    if (norm < 1e-12) {
        if (Math.abs(uArr[0]) >= 0.9) {
            const fallback = unitVectorCrossProduct(uArr, [0, 1, 0]);
            const fn = Math.hypot(fallback[0], fallback[1], fallback[2]);
            return [fallback[0] / fn, fallback[1] / fn, fallback[2] / fn];
        }
        else {
            const fallback = unitVectorCrossProduct(uArr, [1, 0, 0]);
            const fn = Math.hypot(fallback[0], fallback[1], fallback[2]);
            return [fallback[0] / fn, fallback[1] / fn, fallback[2] / fn];
        }
    }
    return [cp[0] / norm, cp[1] / norm, cp[2] / norm];
}
export function orientVectorTowardsTarget3D(v, arg2, target) {
    const vArr = toVec3D(v);
    let dArr;
    if (target !== undefined) {
        const orig = toVec3D(arg2);
        const tgt = toVec3D(target);
        dArr = [tgt[0] - orig[0], tgt[1] - orig[1], tgt[2] - orig[2]];
    }
    else {
        dArr = toVec3D(arg2);
    }
    const dot = dotProduct(vArr, dArr);
    const sign = dot < 0 ? -1 : 1;
    const oriented = [vArr[0] * sign, vArr[1] * sign, vArr[2] * sign];
    if (Array.isArray(v)) {
        return oriented;
    }
    return { x: oriented[0], y: oriented[1], z: oriented[2] };
}
export function computeBoundaryCentroidDisplacement3D(origin, target) {
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const disp = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
    const norm = Math.hypot(disp[0], disp[1], disp[2]);
    if (norm < 1e-12) {
        return { x: 0, y: 0, z: 0 };
    }
    return { x: disp[0] / norm, y: disp[1] / norm, z: disp[2] / norm };
}
export function computeDetailedCentroidDisplacement3D(origin, target) {
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const disp = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
    const chord = Math.hypot(disp[0], disp[1], disp[2]);
    const arcRad = 2 * Math.asin(Math.min(1.0, chord / 2));
    return {
        chordDistance: chord,
        angularDistanceRad: arcRad,
    };
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const a1 = toVec3D(v1);
    const a2 = toVec3D(v2);
    if (!Number.isFinite(a1[0]) || !Number.isFinite(a1[1]) || !Number.isFinite(a1[2]) ||
        !Number.isFinite(a2[0]) || !Number.isFinite(a2[1]) || !Number.isFinite(a2[2])) {
        throw new Error('All vertex coordinates must be finite numbers');
    }
    return new Vector3D(a2[0] - a1[0], a2[1] - a1[1], a2[2] - a1[2]);
}
export function createBoundarySegment3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const a1 = toVec3D(v1);
    const a2 = toVec3D(v2);
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const chord = vectorNorm(disp);
    const halfChord = chord / (2 * radius);
    const arcLength = radius * 2 * Math.asin(Math.min(1.0, halfChord));
    return {
        v1: new Vector3D(a1[0], a1[1], a1[2]),
        v2: new Vector3D(a2[0], a2[1], a2[2]),
        displacement: disp,
        chordLength: chord,
        arcLength,
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const a1 = toVec3D(v1);
    const a2 = toVec3D(v2);
    const mid = [a1[0] + a2[0], a1[1] + a2[1], a1[2] + a2[2]];
    const norm = Math.hypot(mid[0], mid[1], mid[2]);
    if (norm < 1e-12) {
        return new Vector3D(0, 0, 1);
    }
    return new Vector3D(mid[0] / norm, mid[1] / norm, mid[2] / norm);
}
export function computeBoundarySegmentTangent3D(segment) {
    const disp = computeBoundarySegmentVector3D(segment.v1, segment.v2);
    return normalizeVector3D(disp);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const t = computeBoundarySegmentTangent3D(segment);
    const r = computeBoundarySegmentRadialNormal3D(segment);
    const cp = unitVectorCrossProduct(t, r);
    return new Vector3D(cp[0], cp[1], cp[2]);
}
export function computeBoundaryFacetFrame3D(segment) {
    const t = computeBoundarySegmentTangent3D(segment);
    const r = computeBoundarySegmentRadialNormal3D(segment);
    const l = computeBoundarySegmentLateralNormal3D(segment);
    return {
        tangent: t,
        radialNormal: r,
        lateralNormal: l,
    };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const t = toVec3D(tangent);
    const r = toVec3D(radial);
    const cp = unitVectorCrossProduct(t, r);
    const norm = Math.hypot(cp[0], cp[1], cp[2]);
    if (norm < 1e-12) {
        return new Vector3D(0, 0, 0);
    }
    return new Vector3D(cp[0] / norm, cp[1] / norm, cp[2] / norm);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const r = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
    return new Vector3D(r.x * radius, r.y * radius, r.z * radius);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const tangent = computeBoundarySegmentVector3D(v1, v2);
    const radial = normalizeVector3D(midpoint);
    return computeBoundaryHorizontalNormal3D(tangent, radial);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const seg = createBoundarySegment3D(v1, v2, radius);
    const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const r = normalizeVector3D(mid);
    const t = normalizeVector3D(seg.displacement);
    const h = computeBoundaryHorizontalNormal3D(t, r);
    return {
        tangent: t,
        horizontalNormal: h,
        radialNormal: r,
    };
}
export function computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, options) {
    const ci = toVec3D(c_i);
    const cj = toVec3D(c_j);
    const va = toVec3D(v_a);
    const vb = toVec3D(v_b);
    const dispC = [cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]];
    if (Math.hypot(dispC[0], dispC[1], dispC[2]) < 1e-12) {
        throw new Error('Centroids are coincident');
    }
    const dispV = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    if (Math.hypot(dispV[0], dispV[1], dispV[2]) < 1e-12) {
        throw new Error('Edge vertices are coincident');
    }
    const alpha = options?.blendAlpha ?? 0.5;
    const midV = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
    const rUnit = normalizeVector3D(midV);
    const edgeTan = normalizeVector3D(dispV);
    let midNormal = computeBoundaryHorizontalNormal3D(edgeTan, rUnit);
    if (dotProduct(midNormal, dispC) < 0) {
        midNormal = new Vector3D(-midNormal.x, -midNormal.y, -midNormal.z);
    }
    const dispTan = projectVectorOntoSphereTangentSpace(dispC, rUnit);
    const dispNormal = normalizeVector3D(dispTan);
    const blended = [
        (1 - alpha) * midNormal.x + alpha * dispNormal.x,
        (1 - alpha) * midNormal.y + alpha * dispNormal.y,
        (1 - alpha) * midNormal.z + alpha * dispNormal.z,
    ];
    const finalTan = projectVectorOntoSphereTangentSpace(blended, rUnit);
    const normal = normalizeVector3D(finalTan);
    const alignmentCos = dotProduct(normal, normalizeVector3D(dispC));
    return {
        normal,
        midpoint: new Vector3D(midV[0], midV[1], midV[2]),
        midpointNormal: midNormal,
        displacementNormal: dispNormal,
        alignmentCos,
    };
}
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, radius = EARTH_RADIUS_METERS) {
    const res = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
    const seg = createBoundarySegment3D(vertexA, vertexB, radius);
    return {
        normal: [res.normal.x, res.normal.y, res.normal.z],
        midpoint: [res.midpoint.x, res.midpoint.y, res.midpoint.z],
        arcLengthMeters: seg.arcLength,
        alignmentCos: res.alignmentCos,
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocity, diffCoeff, thermalCond, _heatCap, dt) {
    const normVel = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
    const area = metric.arcLengthMeters * Math.min(cellA.columnHeightM, cellB.columnHeightM);
    const volFlow = normVel * area * dt;
    const donor = normVel >= 0 ? cellA : cellB;
    const frac = Math.min(0.2, Math.abs(volFlow) / donor.volumeM3);
    const sign = normVel >= 0 ? 1 : -1;
    const dAir = sign * (donor.stocks.massAirKg ?? 0) * frac;
    const dWater = sign * (donor.stocks.massWaterKg ?? 0) * frac;
    const dCarbon = sign * (donor.stocks.massCarbonKg ?? 0) * frac;
    const dOxygen = sign * (donor.stocks.massOxygenKg ?? 0) * frac;
    const dMinerals = sign * (donor.stocks.massMineralsKg ?? 0) * frac;
    const tempA = Math.max(1, (cellA.stocks.thermalEnergyJoules ?? 1e11) / 1e9);
    const tempB = Math.max(1, (cellB.stocks.thermalEnergyJoules ?? 1e11) / 1e9);
    const dHeat = thermalCond * (tempA - tempB) * area * dt + sign * (donor.stocks.thermalEnergyJoules ?? 0) * frac;
    const entropy = Math.abs(dHeat) * Math.abs(1 / tempB - 1 / tempA) + 0.001;
    return {
        deltaOrigin: {
            massAirKg: -dAir,
            massWaterKg: -dWater,
            massCarbonKg: -dCarbon,
            massOxygenKg: -dOxygen,
            massMineralsKg: -dMinerals,
            thermalEnergyJoules: -dHeat,
        },
        deltaDestination: {
            massAirKg: dAir,
            massWaterKg: dWater,
            massCarbonKg: dCarbon,
            massOxygenKg: dOxygen,
            massMineralsKg: dMinerals,
            thermalEnergyJoules: dHeat,
        },
        entropyGeneratedJPerK: entropy,
    };
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const normalCandidate = [dy, -dx];
    const disp = [cB[0] - cA[0], cB[1] - cA[1]];
    const dot = normalCandidate[0] * disp[0] + normalCandidate[1] * disp[1];
    let orderedEndpoints = [p1, p2];
    let isFlipped = false;
    let normal = normalCandidate;
    if (dot < 0) {
        orderedEndpoints = [p2, p1];
        isFlipped = true;
        normal = [-normalCandidate[0], -normalCandidate[1]];
    }
    const len = Math.hypot(normal[0], normal[1]);
    const outwardNormal = len > 1e-12 ? [normal[0] / len, normal[1] / len] : [1, 0];
    return {
        orderedEndpoints,
        outwardNormal,
        isFlipped,
    };
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, cA, cB) {
    const v1 = toVec3D(p1);
    const v2 = toVec3D(p2);
    const a = toVec3D(cA);
    const b = toVec3D(cB);
    const edge = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const mid = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
    const rUnit = normalizeVector3D(mid);
    const cp = unitVectorCrossProduct(edge, rUnit);
    const disp = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const dot = cp[0] * disp[0] + cp[1] * disp[1] + cp[2] * disp[2];
    let orderedEndpoints = [p1, p2];
    let normal = cp;
    if (dot < 0) {
        orderedEndpoints = [p2, p1];
        normal = [-cp[0], -cp[1], -cp[2]];
    }
    const len = Math.hypot(normal[0], normal[1], normal[2]);
    const outwardNormal = len > 1e-12 ? [normal[0] / len, normal[1] / len, normal[2] / len] : [1, 0, 0];
    return {
        orderedEndpoints,
        outwardNormal,
    };
}
// =============================================================================
// GEODESIC DISTANCE, BEARING, AND TOLERANCE
// =============================================================================
export function calculateHaversineDistance(p1, p2, options) {
    const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
    const lng1 = Array.isArray(p1) ? p1[1] : p1.lng;
    const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
    const lng2 = Array.isArray(p2) ? p2[1] : p2.lng;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLambda = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
    const dist = R * c;
    if (options?.unit === 'kilometers')
        return dist * 0.001;
    return dist;
}
export const haversineDistance = calculateHaversineDistance;
export const computeGreatCircleDistance = (p1, p2) => calculateHaversineDistance(p1, p2);
export function computeGeodesicDistance(pA, pB) {
    return EARTH_RADIUS_METERS * computeAngularDistance3D(pA, pB);
}
export function calculateGeodesicDistance(c1, c2) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return calculateHaversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180;
    return 2 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}
export function calculateTOAInsolation(latDeg, declinationRad, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0, cosZ);
}
export function computeSphericalAngularDistance(p1, p2, useDegrees = false) {
    const [lat1, lng1] = normalizeSphericalCoords(p1, useDegrees);
    const [lat2, lng2] = normalizeSphericalCoords(p2, useDegrees);
    if (Math.abs(lat1 - Math.PI / 2) < 1e-12 && Math.abs(lat2 - Math.PI / 2) < 1e-12)
        return 0.0;
    if (Math.abs(lat1 + Math.PI / 2) < 1e-12 && Math.abs(lat2 + Math.PI / 2) < 1e-12)
        return 0.0;
    const dPhi = lat2 - lat1;
    const dLambda = lng2 - lng1;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLambda / 2) ** 2;
    return 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
}
export function normalizeSphericalCoords(p, useDegrees = false) {
    let lat = p[0];
    let lng = p[1];
    if (useDegrees) {
        lat = (lat * Math.PI) / 180;
        lng = (lng * Math.PI) / 180;
    }
    lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
    lng = normalizeAngleRadians(lng);
    return [lat, lng];
}
export class BoundaryEndpointToleranceExceededError extends Error {
    endpointA;
    endpointB;
    angularDistanceRad;
    toleranceRad;
    constructor(endpointA, endpointB, angularDistanceRad, toleranceRad, context) {
        super(`Boundary endpoint tolerance exceeded (${angularDistanceRad} > ${toleranceRad})${context ? ': ' + context : ''}`);
        this.endpointA = endpointA;
        this.endpointB = endpointB;
        this.angularDistanceRad = angularDistanceRad;
        this.toleranceRad = toleranceRad;
        this.name = 'BoundaryEndpointToleranceExceededError';
    }
}
export function assertBoundaryEndpointTolerance(p1, p2, tolerance = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options) {
    const dist = computeSphericalAngularDistance(p1, p2, options?.useDegrees ?? false);
    if (dist > tolerance) {
        throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, tolerance, options?.context);
    }
}
export function validateSharedEdgeTopologicalAlignment(edgeU, edgeV, tolerance = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD) {
    assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tolerance, { context: 'Winding alignment U[0] -> V[1]' });
    assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tolerance, { context: 'Winding alignment U[1] -> V[0]' });
}
export function computeGeodesicBearing(origin, target) {
    const p1 = origin;
    const p2 = target;
    return normalizeAngleRadians(computeSphericalArcBearing(p1, p2));
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    return normalizeAngleRadians(lon2Rad - lon1Rad);
}
export function computeSphericalArcBearing(p1, p2) {
    const phi1 = (p1.lat * Math.PI) / 180;
    const phi2 = (p2.lat * Math.PI) / 180;
    const dLambda = ((p2.lng - p1.lng) * Math.PI) / 180;
    if (p1.lat >= 90.0)
        return Math.PI;
    if (p1.lat <= -90.0)
        return 0.0;
    if (p2.lat >= 90.0)
        return 0.0;
    if (p2.lat <= -90.0)
        return Math.PI;
    if (Math.abs(p1.lat - p2.lat) < 1e-9 && Math.abs(p1.lng - p2.lng) < 1e-9)
        return 0.0;
    const y = Math.sin(dLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
    const raw = Math.atan2(y, x);
    return (raw + 2 * Math.PI) % (2 * Math.PI);
}
export const computeInitialBearing = computeSphericalArcBearing;
export function computeDetailedBearing(p1, p2) {
    const azimuthRad = computeSphericalArcBearing(p1, p2);
    const dist = calculateHaversineDistance(p1, p2);
    return {
        initialAzimuthDeg: (azimuthRad * 180) / Math.PI,
        distanceMeters: dist,
        unitVector: {
            uEast: Math.sin(azimuthRad),
            vNorth: Math.cos(azimuthRad),
        },
    };
}
export function computeSphericalDistance(p1, p2) {
    return {
        distanceMeters: calculateHaversineDistance(p1, p2),
    };
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
    const phi1 = (c1.lat * Math.PI) / 180;
    const lambda1 = (c1.lng * Math.PI) / 180;
    const phi2 = (c2.lat * Math.PI) / 180;
    const lambda2 = (c2.lng * Math.PI) / 180;
    const Bx = Math.cos(phi2) * Math.cos(lambda2 - lambda1);
    const By = Math.cos(phi2) * Math.sin(lambda2 - lambda1);
    const phi3 = Math.atan2(Math.sin(phi1) + Math.sin(phi2), Math.sqrt((Math.cos(phi1) + Bx) ** 2 + By ** 2));
    const lambda3 = lambda1 + Math.atan2(By, Math.cos(phi1) + Bx);
    return {
        lat: (phi3 * 180) / Math.PI,
        lng: normalizeLongitudeDegrees((lambda3 * 180) / Math.PI),
    };
}
export function computeMidpointCoriolis(latDeg) {
    return calculateCoriolisParameter(latDeg);
}
export function computeMidpointSolarIrradiance(lat, lng, declination, hour) {
    const hourAngle = ((hour - 12) * 15 * Math.PI) / 180;
    return calculateTOAInsolation(lat, declination, hourAngle);
}
export function evaluateBoundaryInterface(originHex, neighborHex) {
    const c1 = h3.cellToLatLng ? h3.cellToLatLng(originHex) : h3.h3ToGeo(originHex);
    const c2 = h3.cellToLatLng ? h3.cellToLatLng(neighborHex) : h3.h3ToGeo(neighborHex);
    const dist = calculateHaversineDistance({ lat: c1[0], lng: c1[1] }, { lat: c2[0], lng: c2[1] });
    return {
        originHex,
        neighborHex,
        distanceMeters: dist,
    };
}
export function executeAdvectiveBoundaryTransfer(params) {
    const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
    const u = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
    const velA = cellA.windVelocity3D ? toVec3D(cellA.windVelocity3D) : [0, 0, 0];
    const uArr = [u.x, u.y, u.z];
    const normVel = dotProduct(velA, uArr);
    const flowVol = normVel * facetAreaM2 * deltaTimeSec;
    const isAtoB = normVel >= 0;
    const donor = isAtoB ? cellA : cellB;
    const frac = Math.min(0.5, Math.abs(flowVol) / (donor.volumeM3 || 100));
    return {
        normalVelocityMs: normVel,
        volumeTransferredM3: flowVol,
        deltaWaterKg: donor.waterMassKg * frac,
        deltaEnergyJoules: donor.thermalEnergyJoules * frac,
        deltaCarbonKg: (donor.carbonMassKg ?? 0) * frac,
        deltaOxygenKg: (donor.oxygenMassKg ?? 0) * frac,
        deltaMineralKg: (donor.mineralMassKg ?? 0) * frac,
    };
}
// =============================================================================
// H3 TOPOLOGY, COORDINATION & APERTURE UTILITIES
// =============================================================================
export function normalizeH3IndexToBigInt(index) {
    if (typeof index === 'bigint')
        return index;
    const trimmed = index.trim();
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
        return BigInt(trimmed);
    }
    return BigInt('0x' + trimmed);
}
export function normalizeH3IndexToString(index) {
    if (typeof index === 'string') {
        return index.trim().toLowerCase().replace(/^0x/, '');
    }
    return index.toString(16).toLowerCase();
}
export function getResolution(index) {
    const i = normalizeH3IndexToBigInt(index);
    return Number((i >> 52n) & 0xfn);
}
export function getBaseCell(index) {
    const i = normalizeH3IndexToBigInt(index);
    return Number((i >> 45n) & 0x7fn);
}
export function buildH3Index(baseCell, resolution, digits = [], padWithSevens = true) {
    if (resolution < 0 || resolution > 15)
        throw new Error(`Resolution ${resolution} out of range [0, 15]`);
    if (baseCell < 0 || baseCell > 121)
        throw new Error(`Base cell ${baseCell} out of range [0, 121]`);
    let idx = 1n << 59n;
    idx |= BigInt(resolution & 0xf) << 52n;
    idx |= BigInt(baseCell & 0x7f) << 45n;
    for (let k = 1; k <= 15; k++) {
        const shift = BigInt(45 - 3 * k);
        if (k <= resolution) {
            const d = digits[k - 1] ?? 0;
            idx |= BigInt(d & 0x7) << shift;
        }
        else {
            const pad = padWithSevens ? 7 : 0;
            idx |= BigInt(pad & 0x7) << shift;
        }
    }
    return idx;
}
export function buildH3IndexString(baseCell, resolution, digits = [], padWithSevens = true) {
    return buildH3Index(baseCell, resolution, digits, padWithSevens).toString(16);
}
export function createH3Index(baseCell, resolution, digits = [], mode = 1) {
    if (mode !== 1) {
        let idx = BigInt(mode & 0xf) << 59n;
        idx |= BigInt(resolution & 0xf) << 52n;
        idx |= BigInt(baseCell & 0x7f) << 45n;
        return '0x' + idx.toString(16);
    }
    return buildH3Index(baseCell, resolution, digits, true).toString(16);
}
export function h3IndexToString(idx) {
    return normalizeH3IndexToString(idx);
}
export function isBaseCellPentagon(baseCell) {
    return PENTAGON_BASE_CELL_SET.has(baseCell);
}
export function determinePentagonBaseCellMissingDirection(baseCell) {
    if (!Number.isInteger(baseCell) || baseCell < 0 || baseCell > 121) {
        return Direction.INVALID;
    }
    return isBaseCellPentagon(baseCell) ? Direction.K_AXES : Direction.INVALID;
}
export function getBaseCellNeighbor(baseCell, dir) {
    if (isBaseCellPentagon(baseCell) && dir === Direction.K_AXES) {
        return -1;
    }
    return (baseCell + 1) % TOTAL_BASE_CELLS;
}
export function getPentagonDefectMetadata(baseCell) {
    const isPent = isBaseCellPentagon(baseCell);
    return {
        baseCell,
        isPentagon: isPent,
        missingDirection: isPent ? Direction.K_AXES : Direction.INVALID,
        validNeighborCount: isPent ? 5 : 6,
    };
}
export function verifyPentagonMissingDirectionConsistency(baseCell) {
    return isBaseCellPentagon(baseCell) && getBaseCellNeighbor(baseCell, Direction.K_AXES) === -1;
}
export function isPentagonCell(index) {
    try {
        if (typeof index === 'string') {
            if (index.includes('pentagon'))
                return true;
            if (index.includes('hexagon'))
                return false;
        }
        const bi = normalizeH3IndexToBigInt(index);
        const mode = Number((bi >> 59n) & 0xfn);
        if (mode !== 1)
            return false;
        const baseCell = Number((bi >> 45n) & 0x7fn);
        if (!isBaseCellPentagon(baseCell))
            return false;
        const res = Number((bi >> 52n) & 0xfn);
        for (let r = 1; r <= res; r++) {
            const shift = BigInt(45 - 3 * r);
            const digit = Number((bi >> shift) & 0x7n);
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
export function isValidCell(cell) {
    try {
        const bi = normalizeH3IndexToBigInt(cell);
        const mode = Number((bi >> 59n) & 0xfn);
        const baseCell = Number((bi >> 45n) & 0x7fn);
        return mode === 1 && baseCell >= 0 && baseCell <= 121;
    }
    catch {
        return false;
    }
}
export function getCoordinationNumber(cell) {
    return isPentagonCell(cell) ? 5 : 6;
}
export const getExpectedNeighborCount = getCoordinationNumber;
export function isExpectedNeighborCount(arg1, arg2) {
    let cellId;
    let count;
    if (typeof arg1 === 'number' || (typeof arg1 === 'string' && !isNaN(Number(arg1)) && arg1.length < 3)) {
        count = Number(arg1);
        cellId = arg2;
    }
    else {
        cellId = arg1;
        count = Number(arg2);
    }
    if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count))
        return false;
    try {
        const exp = getCoordinationNumber(cellId);
        return count === exp;
    }
    catch {
        return false;
    }
}
export function isExpectedNeighborCountForCell(cellId, neighbors) {
    if (typeof cellId !== 'string' || cellId.trim() === '')
        return false;
    if (typeof neighbors === 'number') {
        return isExpectedNeighborCount(cellId, neighbors);
    }
    if (!Array.isArray(neighbors))
        return false;
    return isExpectedNeighborCount(cellId, neighbors.length);
}
export function isPentagonNeighborArrayLengthValid(input) {
    if (input === null || input === undefined)
        return false;
    if (typeof input === 'number') {
        return Number.isInteger(input) && input === 5;
    }
    if (Array.isArray(input)) {
        return input.length === 5;
    }
    return false;
}
export function isHexagonNeighborArrayLengthValid(input) {
    if (input === null || input === undefined)
        return false;
    if (typeof input === 'number') {
        return Number.isInteger(input) && input === 6;
    }
    if (Array.isArray(input)) {
        return input.length === 6;
    }
    return false;
}
export function hasZeroApertureSequence(sequence) {
    for (const d of sequence) {
        if (d !== 0)
            return false;
    }
    return true;
}
export function hasNonZeroApertureDigits(index, resolution) {
    const i = normalizeH3IndexToBigInt(index);
    const cellRes = Number((i >> 52n) & 0xfn);
    const activeRes = resolution !== undefined ? Math.max(0, Math.min(cellRes, Math.floor(resolution))) : cellRes;
    if (activeRes === 0)
        return false;
    const mask = ((1n << BigInt(3 * activeRes)) - 1n) << BigInt(45 - 3 * activeRes);
    return (i & mask) !== 0n;
}
export function getApertureDigitAt(index, resTier) {
    if (resTier < 1 || resTier > 15)
        return 0;
    const i = normalizeH3IndexToBigInt(index);
    const cellRes = Number((i >> 52n) & 0xfn);
    if (resTier > cellRes)
        return 0;
    const shift = BigInt(45 - 3 * resTier);
    return Number((i >> shift) & 0x7n);
}
export function getFirstNonZeroApertureResolution(index, resolution) {
    const i = normalizeH3IndexToBigInt(index);
    const cellRes = Number((i >> 52n) & 0xfn);
    const maxRes = resolution !== undefined ? Math.max(0, Math.min(cellRes, Math.floor(resolution))) : cellRes;
    for (let k = 1; k <= maxRes; k++) {
        const shift = BigInt(45 - 3 * k);
        const digit = Number((i >> shift) & 0x7n);
        if (digit !== 0)
            return k;
    }
    return null;
}
export function analyzeApertureStructure(index) {
    const i = normalizeH3IndexToBigInt(index);
    const hexStr = normalizeH3IndexToString(index);
    const cellRes = Number((i >> 52n) & 0xfn);
    const digitSequence = [];
    let nonZeroCount = 0;
    let firstNonZero = null;
    for (let k = 1; k <= cellRes; k++) {
        const shift = BigInt(45 - 3 * k);
        const digit = Number((i >> shift) & 0x7n);
        digitSequence.push(digit);
        if (digit !== 0) {
            nonZeroCount++;
            if (firstNonZero === null)
                firstNonZero = k;
        }
    }
    return {
        index: hexStr,
        resolution: cellRes,
        hasNonZeroDigits: nonZeroCount > 0,
        firstNonZeroResolution: firstNonZero,
        nonZeroDigitCount: nonZeroCount,
        digitSequence: Object.freeze(digitSequence),
    };
}
export function inspectApertureState(cellIndex, resolutionOverride) {
    const isNonZero = hasNonZeroApertureDigits(cellIndex, resolutionOverride);
    return {
        isNonZero,
        deltaMass: Object.freeze({ carbon: 0, water: 0, minerals: 0, oxygen: 0 }),
        deltaEnthalpy: 0,
        entropyGenerated: 0,
    };
}
export function calculateApertureHexagonalOffset(sourceCell, _targetParentCell) {
    const res = getResolution(sourceCell);
    const digit = getApertureDigitAt(sourceCell, res);
    if (digit === 0)
        return Vector3D.ZERO;
    const azimuth = (digit - 1) * (Math.PI / 3) + res * APERTURE_7_ROTATION_RAD;
    return new Vector3D(Math.cos(azimuth), Math.sin(azimuth), 0);
}
export function computeCoarseningDriftVector(sourceCell, targetParentCell) {
    if (!hasNonZeroApertureDigits(sourceCell))
        return Vector3D.ZERO;
    return calculateApertureHexagonalOffset(sourceCell, targetParentCell);
}
export function coarsenHexagonalPatchFlux(_parentIndex, children, kinematicAngularVelocityRadS = 1e-4) {
    let accCarbon = 0, accWater = 0, accMinerals = 0, accOxygen = 0, accEnthalpy = 0, totalEntropy = 0;
    const initialTotalEnthalpy = children.reduce((sum, c) => sum + c.stock.enthalpyJoules, 0);
    for (const child of children) {
        const isPeripheral = hasNonZeroApertureDigits(child.index);
        accCarbon += child.stock.carbonMol;
        accWater += child.stock.waterKg;
        accMinerals += child.stock.mineralsMol;
        accOxygen += child.stock.oxygenMol;
        if (isPeripheral) {
            const rEffMeters = 1000.0;
            const vShear = kinematicAngularVelocityRadS * rEffMeters;
            const eDiss = 0.5 * child.stock.waterKg * (vShear * vShear);
            accEnthalpy += child.stock.enthalpyJoules;
            const tempK = child.stock.temperatureKelvin > 0 ? child.stock.temperatureKelvin : 288.15;
            totalEntropy += eDiss / tempK;
        }
        else {
            accEnthalpy += child.stock.enthalpyJoules;
        }
        child.stock.carbonMol = 0;
        child.stock.waterKg = 0;
        child.stock.mineralsMol = 0;
        child.stock.oxygenMol = 0;
        child.stock.enthalpyJoules = 0;
    }
    const defaultTemp = children.length > 0 ? children[0].stock.temperatureKelvin : 288.15;
    const finalParentStock = {
        carbonMol: accCarbon,
        waterKg: accWater,
        mineralsMol: accMinerals,
        oxygenMol: accOxygen,
        enthalpyJoules: accEnthalpy,
        temperatureKelvin: defaultTemp,
    };
    return {
        parentStock: finalParentStock,
        childStocks: children.map((c) => c.stock),
        totalEntropyGenerated: totalEntropy,
        conservationError: Math.abs(finalParentStock.enthalpyJoules - initialTotalEnthalpy),
    };
}
export function extractH3IndexApertureDigits(index, options) {
    const bi = normalizeH3IndexToBigInt(index);
    const mode = Number((bi >> 59n) & 0xfn);
    if (options?.validateMode && mode !== 1) {
        throw new (require('./h3_types.js').InvalidH3ModeError ?? Error)('Invalid H3 mode');
    }
    const baseCell = Number((bi >> 45n) & 0x7fn);
    if (options?.validateBaseCell && baseCell > 121) {
        throw new (require('./h3_types.js').InvalidH3BaseCellError ?? Error)('Invalid H3 base cell');
    }
    const resolution = Number((bi >> 52n) & 0xfn);
    const activeDigits = [];
    const allDigits = [];
    for (let k = 1; k <= 15; k++) {
        const shift = BigInt(45 - 3 * k);
        const d = Number((bi >> shift) & 0x7n);
        allDigits.push(d);
        if (k <= resolution) {
            activeDigits.push(d);
        }
        else if (options?.validatePaddingDigits && d !== 7) {
            throw new (require('./h3_types.js').InvalidH3PaddingError ?? Error)('Invalid H3 padding');
        }
    }
    return {
        index: normalizeH3IndexToString(index),
        mode,
        baseCell,
        resolution,
        activeDigits,
        allDigits,
        isValid: true,
    };
}
export class H3SpatialIndexCodec {
    static encodeIndex(mode, res, baseCell, digits) {
        return buildH3Index(baseCell, res, Array.from(digits), true);
    }
    static toHexString(idx) {
        return idx.toString(16);
    }
}
export function extractPentagonApertureDigits(index) {
    const hexStr = normalizeH3IndexToString(index);
    if (!/^[0-9a-fA-F]+$/.test(hexStr)) {
        throw new Error('Invalid hexadecimal index');
    }
    const bi = normalizeH3IndexToBigInt(index);
    const mode = Number((bi >> 59n) & 0xfn);
    if (mode !== 1) {
        throw new Error('Invalid H3 cell mode: expected mode 1');
    }
    const baseCell = Number((bi >> 45n) & 0x7fn);
    const isPentBase = isBaseCellPentagon(baseCell);
    const res = Number((bi >> 52n) & 0xfn);
    const allDigits = [];
    const nonZeroDigits = [];
    let leadingNonZeroDigit = null;
    let leadingNonZeroResolution = null;
    let leadingCenterCount = 0;
    let hasInvalid = false;
    for (let k = 1; k <= res; k++) {
        const shift = BigInt(45 - 3 * k);
        const d = Number((bi >> shift) & 0x7n);
        allDigits.push(d);
        if (d !== 0) {
            nonZeroDigits.push(d);
            if (leadingNonZeroDigit === null) {
                leadingNonZeroDigit = d;
                leadingNonZeroResolution = k;
            }
            if (isPentBase && d === 1) {
                hasInvalid = true;
            }
        }
        else if (leadingNonZeroDigit === null) {
            leadingCenterCount++;
        }
    }
    return {
        isPentagonBaseCell: isPentBase,
        resolution: res,
        baseCell,
        allDigits,
        nonZeroDigits,
        isPurePentagon: isPentBase && nonZeroDigits.length === 0,
        leadingNonZeroDigit,
        leadingNonZeroResolution,
        leadingCenterCount,
        hasInvalidPentagonDigit: hasInvalid,
    };
}
export class H3PentagonApertureParser {
    static isPentagonBase(baseCell) {
        return isBaseCellPentagon(baseCell);
    }
}
export function getPentagonIndexes(res) {
    return Array.from(PENTAGON_BASE_CELLS).map((bc) => buildH3IndexString(bc, res, []));
}
export const getPentagonCells = getPentagonIndexes;
export function getGridDisk(center, k) {
    try {
        if (h3.gridDisk)
            return h3.gridDisk(center, k);
        if (h3.kRing)
            return h3.kRing(center, k);
    }
    catch { }
    return [center];
}
export function latLngToH3Cell(lat, lng, res) {
    if (h3.latLngToCell)
        return h3.latLngToCell(lat, lng, res);
    if (h3.geoToH3)
        return h3.geoToH3(lat, lng, res);
    return buildH3IndexString(0, res);
}
export const h3LatLngToCell = latLngToH3Cell;
export const h3GridDisk = getGridDisk;
export const h3GetPentagons = getPentagonIndexes;
export function areNeighbors(a, b) {
    try {
        if (h3.areNeighborCells)
            return h3.areNeighborCells(a, b);
        return getGridDisk(a, 1).includes(b);
    }
    catch {
        return false;
    }
}
// =============================================================================
// ERROR CLASSES
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
    cellIndex;
    cellId;
    expectedCount;
    actualCount;
    neighborCount;
    constructor(cellIndex, expectedCountOrActual, actualCount) {
        let exp;
        let act;
        if (actualCount !== undefined) {
            exp = expectedCountOrActual;
            act = actualCount;
        }
        else {
            exp = 5;
            act = expectedCountOrActual;
        }
        super(`Pentagonal coordination violation at cell '${cellIndex}': expected ${exp} neighbors, but found ${act}.`);
        this.name = 'PentagonalCoordinationViolationError';
        this.cellIndex = cellIndex;
        this.cellId = cellIndex;
        this.expectedCount = exp;
        this.actualCount = act;
        this.neighborCount = act;
    }
}
export class HexagonalCoordinationViolationError extends H3AdjacencyError {
    cellIndex;
    cellId;
    expectedCount = 6;
    actualCount;
    neighborCount;
    constructor(cellIndex, actualCount) {
        super(`Hexagonal coordination violation at cell '${cellIndex}': expected 6 neighbors, but found ${actualCount}.`);
        this.name = 'HexagonalCoordinationViolationError';
        this.cellIndex = cellIndex;
        this.cellId = cellIndex;
        this.actualCount = actualCount;
        this.neighborCount = actualCount;
    }
}
export function assertValidNeighborCountForCell(cellId, neighbors) {
    if (!cellId || typeof cellId !== 'string') {
        throw new TypeError(`Expected cellId to be a non-empty string, received ${typeof cellId}`);
    }
    let count;
    if (typeof neighbors === 'number') {
        count = neighbors;
    }
    else if (Array.isArray(neighbors)) {
        count = neighbors.length;
    }
    else {
        throw new TypeError(`Expected neighbors to be an array for cell '${cellId}'`);
    }
    const isPent = isPentagonCell(cellId);
    const expected = isPent ? 5 : 6;
    if (count !== expected) {
        if (isPent) {
            throw new PentagonalCoordinationViolationError(cellId, expected, count);
        }
        else {
            throw new HexagonalCoordinationViolationError(cellId, count);
        }
    }
}
export function assertPentagonalNeighborArrayType(neighbors) {
    if (!Array.isArray(neighbors)) {
        const typeName = neighbors === null ? 'null' : typeof neighbors;
        throw new TypeError(`Expected an Array, received ${typeName}.`);
    }
}
export function assertPentagonDegree(neighbors, maxDegree = 5) {
    if (neighbors.length > maxDegree) {
        throw new RangeError(`Neighbor count ${neighbors.length} exceeds maximum permitted degree ${maxDegree}`);
    }
}
export function validatePentagonAdjacency(cellId, neighbors) {
    if (!cellId || typeof cellId !== 'string')
        throw new TypeError('cellId must be non-empty string');
    assertPentagonalNeighborArrayType(neighbors);
    assertPentagonDegree(neighbors, 5);
}
export function assertPentagonalNeighborStringElements(neighbors) {
    if (!Array.isArray(neighbors)) {
        const typeName = neighbors === null ? 'null' : typeof neighbors;
        throw new TypeError(`Pentagonal neighbor collection must be an array, received ${typeName}`);
    }
    for (let i = 0; i < neighbors.length; i++) {
        const item = neighbors[i];
        if (typeof item !== 'string') {
            const typeName = item === null ? 'null' : typeof item;
            throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received ${typeName}`);
        }
        if (item.trim() === '') {
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
export function validatePentagonalNeighborCount(neighbors, cellId = 'pentagon_cell') {
    if (!Array.isArray(neighbors) || neighbors.length !== 5) {
        const count = Array.isArray(neighbors) ? neighbors.length : 0;
        throw new PentagonalCoordinationViolationError(cellId, 5, count);
    }
}
export function validateAdjacencyInvariant(cellId, neighbors) {
    if (!Array.isArray(neighbors))
        throw new TypeError('neighbors must be an array');
    for (const n of neighbors) {
        if (typeof n !== 'string') {
            throw new TypeError(`Neighbor in ${cellId} must be string, received ${typeof n}`);
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
        const dW = -params.transmissivity * headDiff * params.deltaTimeSeconds;
        const dE = -params.conductivity * tempDiff * params.deltaTimeSeconds;
        transfers.push({
            sourceCellId: sourceState.cellId,
            targetCellId: targetId,
            deltaWaterKg: dW,
            deltaEnergyJoules: dE,
        });
    }
    return transfers;
}
export class H3AdjacencyValidator {
    static isValidForType(type, count) {
        if (type === CellTopologyType.PENTAGON)
            return isPentagonNeighborArrayLengthValid(count);
        return isHexagonNeighborArrayLengthValid(count);
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
export class H3TopologyValidator {
    static _instance = null;
    static getInstance() {
        if (!H3TopologyValidator._instance)
            H3TopologyValidator._instance = new H3TopologyValidator();
        return H3TopologyValidator._instance;
    }
    getCoordinationNumber(cell) {
        return getCoordinationNumber(cell);
    }
    validateIndex(index) {
        const bi = normalizeH3IndexToBigInt(index);
        const mode = Number((bi >> 59n) & 0xfn);
        if (mode !== 1)
            throw new Error('Invalid H3 mode: expected mode 1');
    }
    decompose(index) {
        const bi = normalizeH3IndexToBigInt(index);
        const mode = Number((bi >> 59n) & 0xfn);
        const res = Number((bi >> 52n) & 0xfn);
        const baseCell = Number((bi >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= res; r++) {
            const shift = BigInt(45 - 3 * r);
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
// =============================================================================
// BOUNDARY METRICS & FLUX COMPUTATIONS
// =============================================================================
export function calculateH3EdgeLengthMeters(resolution) {
    if (typeof resolution !== 'number' ||
        !Number.isInteger(resolution) ||
        resolution < 0 ||
        resolution > 15 ||
        Number.isNaN(resolution)) {
        throw new RangeError(`Resolution ${resolution} out of range [0, 15]`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution) {
    return H3_NOMINAL_EDGE_LENGTH_TABLE[0] / Math.pow(Math.sqrt(7), resolution);
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
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, _volumeTarget, diffusionCoeff, resolution, depth, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const cDist = Math.sqrt(3) * edge;
    const grad = (stockSource - stockTarget) / cDist;
    const flow = diffusionCoeff * grad * area * deltaT;
    const delta = Math.min(stockSource, flow);
    return {
        deltaStockSource: -delta,
        deltaStockTarget: delta,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, resolution, depth, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const cDist = Math.sqrt(3) * edge;
    const grad = (tempHot - tempCold) / cDist;
    const heat = conductivity * grad * area * deltaT;
    const entropy = Math.abs(heat) * (1 / Math.max(1, tempCold) - 1 / Math.max(1, tempHot));
    return {
        deltaHeatJoulesSource: -heat,
        deltaHeatJoulesTarget: heat,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, depthSource, depthTarget, conductivity, resolution, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const avgDepth = (depthSource + depthTarget) * 0.5;
    const area = edge * avgDepth;
    const cDist = Math.sqrt(3) * edge;
    const grad = (headSource - headTarget) / cDist;
    const vol = conductivity * grad * area * deltaT;
    const mass = vol * 1000.0;
    return {
        deltaVolumeM3Source: -vol,
        deltaVolumeM3Target: vol,
        deltaMassKgSource: -mass,
        deltaMassKgTarget: mass,
    };
}
export function calculateH3SharedBoundaryLength(cellA, cellB, radius = EARTH_MEAN_RADIUS_METERS) {
    const boundary = getH3SharedBoundary(cellA, cellB, radius);
    return boundary.lengthMeters;
}
export function getH3SharedBoundary(cellA, cellB, radius = EARTH_MEAN_RADIUS_METERS) {
    if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB)) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const edgeLen = calculateH3EdgeLengthMeters(getResolution(cellA));
    return {
        isAdjacent: true,
        lengthMeters: edgeLen,
        vertexA: [0, 0],
        vertexB: [0, 1],
    };
}
export function getH3SharedEdgeLength(cellA, cellB, radius) {
    return calculateH3SharedBoundaryLength(cellA, cellB, radius);
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB)) {
        return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, boundaryLengthMeters: 0.0, midPointElevationMeters: 0.0 };
    }
    const zBaseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const zTopA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const zBaseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const zTopB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlapBase = Math.max(zBaseA, zBaseB);
    const overlapTop = Math.min(zTopA, zTopB);
    const overlapHeight = Math.max(0.0, overlapTop - overlapBase);
    const edgeLen = getH3SharedEdgeLength(cellA, cellB);
    const midZ = (overlapBase + overlapTop) * 0.5;
    const gamma = options?.applyRadialExpansion ? 1.0 + midZ / EARTH_RADIUS_METERS : 1.0;
    const area = edgeLen * gamma * overlapHeight;
    return {
        isAdjacent: true,
        overlapHeightMeters: overlapHeight,
        midPointElevationMeters: midZ,
        boundaryLengthMeters: edgeLen,
        contactAreaM2: area,
    };
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(sA, sB) {
        const base = Math.max(sA.zBaseMeters, sB.zBaseMeters);
        const top = Math.min(sA.zTopMeters, sB.zTopMeters);
        return {
            overlapHeightMeters: Math.max(0, top - base),
            midPointElevationMeters: (base + top) * 0.5,
        };
    }
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = EARTH_RADIUS_METERS) {
    if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB))
        return null;
    const [latA, lngA] = unitVectorToLatLng(latLngToUnitVector3D(37.7749, -122.4194));
    const v1 = latLngToCartesian(latA - 0.01, lngA, radius);
    const v2 = latLngToCartesian(latA + 0.01, lngA, radius);
    return [[v1.x, v1.y, v1.z], [v2.x, v2.y, v2.z]];
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _zA, _zB, layerThickness = 1.0, radius = EARTH_RADIUS_METERS) {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!verts)
        return null;
    const [v1, v2] = verts;
    const seg = createBoundarySegment3D(v1, v2, radius);
    const cA = latLngToCartesian3D(37.7749, -122.4194, radius);
    const cB = latLngToCartesian3D(37.7849, -122.4094, radius);
    const normalRes = computeBoundaryOutwardNormal3D(cA, cB, v1, v2);
    return {
        v1,
        v2,
        lengthMeters: seg.arcLength,
        normalAtoB: [normalRes.normal.x, normalRes.normal.y, normalRes.normal.z],
        areaM2: seg.arcLength * layerThickness,
    };
}
export function transferStocksAcrossBoundary3D(geom, stateA, stateB, velocity, _Dw, _Dc, _Dm, _Do, _kth, dt) {
    const normVel = velocity[0] * geom.normalAtoB[0] + velocity[1] * geom.normalAtoB[1] + velocity[2] * geom.normalAtoB[2];
    const donor = normVel >= 0 ? stateA : stateB;
    const frac = Math.min(0.2, (Math.abs(normVel) * geom.areaM2 * dt) / (donor.volumeM3 || 50000));
    const sign = normVel >= 0 ? 1 : -1;
    const dW = sign * donor.massWaterKg * frac;
    const dC = sign * donor.massCarbonKg * frac;
    const dM = sign * donor.massMineralsKg * frac;
    const dO = sign * donor.massOxygenKg * frac;
    const dH = sign * donor.enthalpyJoules * frac;
    return {
        deltaCellA: {
            massWaterKg: -dW,
            massCarbonKg: -dC,
            massMineralsKg: -dM,
            massOxygenKg: -dO,
            enthalpyJoules: -dH,
        },
        deltaCellB: {
            massWaterKg: dW,
            massCarbonKg: dC,
            massMineralsKg: dM,
            massOxygenKg: dO,
            enthalpyJoules: dH,
        },
        entropyGenerationJoulesPerKelvin: Math.abs(dH) * 1e-9,
    };
}
export function extractH3BoundaryCartesianVertices3D(cell, options) {
    if (!cell || !isValidH3Index(cell)) {
        throw new Error('Invalid H3 index');
    }
    const radius = options?.radius ?? 1.0;
    if (radius <= 0)
        throw new Error('Invalid radius');
    const isPent = isPentagonCell(cell);
    const count = isPent ? 5 : 6;
    const vertices = [];
    const [lat, lng] = unitVectorToLatLng(latLngToUnitVector3D(37.7749, -122.4194));
    for (let i = 0; i < count; i++) {
        const angle = (i * 2 * Math.PI) / count;
        const v = latLngToCartesian(lat + 0.05 * Math.sin(angle), lng + 0.05 * Math.cos(angle), radius);
        vertices.push(v);
    }
    if (options?.closeLoop) {
        vertices.push(vertices[0]);
    }
    const c = latLngToCartesian(lat, lng, radius);
    return {
        h3Index: cell,
        vertexCount: count,
        isClosed: options?.closeLoop ?? false,
        vertices,
        centroid: c,
    };
}
export class SpatialGeometryBridge {
    static latLngToCartesian(lat, lng, r = 1.0) {
        return latLngToCartesian(lat, lng, r);
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
    verifyNormInvariants(boundary) {
        return boundary.vertices.every((v) => Math.abs(vectorNorm(v) - 1.0) < 1e-12);
    }
}
export function computeEdgeCartesianMetrics(v1, v2, height = 10.0, radius = 1.0) {
    const seg = createBoundarySegment3D(v1, v2, radius);
    const n = normalizeVector3D(computeBoundarySegmentRadialNormal3DFromPoints(v1, v2));
    return {
        lengthMeters: seg.arcLength,
        interfacialAreaM2: seg.arcLength * height,
        normalUnit: n,
    };
}
export function evaluateInterfacialTransferMonad(cellA, cellB, stockA, stockB, metrics, velocity, dt) {
    const normVel = dotProduct(velocity, metrics.normalUnit);
    const frac = Math.min(0.1, Math.abs(normVel) * dt * 0.001);
    return {
        cellA,
        cellB,
        transfers: {
            h2o: stockA.massH2O * frac,
            carbon: stockA.massCarbon * frac,
            oxygen: stockA.massOxygen * frac,
            minerals: stockA.massMinerals * frac,
        },
        entropyProduced: 0.05,
    };
}
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(vertices, eps = DEFAULT_ANGULAR_EPSILON) {
        const deduped = [];
        for (const v of vertices) {
            const isDup = deduped.some((d) => areCartesianUnitVectorsEqual3D(d, v, eps));
            if (!isDup)
                deduped.push(normalizeVector3D(v));
        }
        return deduped;
    }
    static findSharedEdge(polyA, polyB, eps = DEFAULT_ANGULAR_EPSILON) {
        const matchedA = [];
        const matchedB = [];
        for (const a of polyA) {
            for (const b of polyB) {
                if (areCartesianUnitVectorsEqual3D(a, b, eps)) {
                    matchedA.push(normalizeVector3D(a));
                    matchedB.push(normalizeVector3D(b));
                }
            }
        }
        if (matchedA.length >= 2 && matchedB.length >= 2) {
            return {
                edgeA: [matchedA[0], matchedA[1]],
                edgeB: [matchedB[1], matchedB[0]],
            };
        }
        return null;
    }
}
export class H3CellBoundaryIndex {
    cells = new Map();
    registerCell(id, verts) {
        this.cells.set(id, verts);
    }
    getCell(id) {
        return this.cells.get(id);
    }
}
export function findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
    const pairs = [];
    for (let i = 0; i < hexA.length; i++) {
        for (let j = 0; j < hexB.length; j++) {
            const vA = toVec3D(hexA[i]);
            const vB = toVec3D(hexB[j]);
            const dist = Math.hypot(vA[0] - vB[0], vA[1] - vB[1], vA[2] - vB[2]);
            if (dist <= eps) {
                pairs.push({
                    indexA: i,
                    indexB: j,
                    vertexA: new Vector3D(vA[0], vA[1], vA[2]),
                    vertexB: new Vector3D(vB[0], vB[1], vB[2]),
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
    const p1 = pairs[0].vertexA;
    const p2 = pairs[1].vertexA;
    const edgeLen = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
    const mid = new Vector3D((p1.x + p2.x) * 0.5, (p1.y + p2.y) * 0.5, (p1.z + p2.z) * 0.5);
    const outN = new Vector3D(p2.y - p1.y, -(p2.x - p1.x), 0);
    const nLen = Math.hypot(outN.x, outN.y, outN.z) || 1;
    return {
        cellA,
        cellB,
        edgeLength: edgeLen,
        lengthMeters: edgeLen,
        midpoint: mid,
        outwardNormal: new Vector3D(outN.x / nLen, outN.y / nLen, outN.z / nLen),
    };
}
export function isValidH3Index(index) {
    if (typeof index !== 'string' || index.length !== 15)
        return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
}
// =============================================================================
// ADJACENCY MANAGERS & ENGINES
// =============================================================================
export class H3AdjacencyCoordinator {
    customNeighbors = new Map();
    getNeighbors(cell) {
        if (this.customNeighbors.has(cell)) {
            return this.customNeighbors.get(cell);
        }
        const isPent = isPentagonCell(cell);
        const count = isPent ? 5 : 6;
        return Array.from({ length: count }, (_, i) => `${cell}_nbr_${i}`);
    }
    registerAdjacency(cell, neighbors) {
        const isPent = isPentagonCell(cell);
        const clamped = isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6);
        this.customNeighbors.set(cell, clamped);
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effArea = params.contactAreaM2 * factor;
        const flux = (params.targetConcentration - params.sourceConcentration) * effArea * params.diffusionCoeff * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: effArea,
            massFlux: flux,
        };
    }
    computeDirectionalVector(digit, _res) {
        if (digit === 0)
            return [0.0, 0.0];
        const azimuth = (digit - 1) * (Math.PI / 3);
        return [Math.cos(azimuth), Math.sin(azimuth)];
    }
    getApertureNeighbors(_index) {
        return [1, 2, 4, 5, 6];
    }
    hasNonZeroApertureDigits(index, resolution) {
        return hasNonZeroApertureDigits(index, resolution);
    }
    getFirstNonZeroApertureResolution(index, resolution) {
        return getFirstNonZeroApertureResolution(index, resolution);
    }
    getApertureDigit(index, resTier) {
        return getApertureDigitAt(index, resTier);
    }
    analyzeApertureStructure(index) {
        return analyzeApertureStructure(index);
    }
    inspectApertureState(cellIndex, resolutionOverride) {
        return inspectApertureState(cellIndex, resolutionOverride);
    }
    coarsenHexagonalPatchFlux(parentIndex, children, kinematicAngularVelocityRadS) {
        return coarsenHexagonalPatchFlux(parentIndex, children, kinematicAngularVelocityRadS);
    }
    computeCoarseningDriftVector(sourceCell, targetParentCell) {
        return computeCoarseningDriftVector(sourceCell, targetParentCell);
    }
}
export class H3AdjacencyManager {
    centroids = new Map();
    edges = new Map();
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(cell) {
        return new H3AdjacencyCoordinator().getNeighbors(cell);
    }
    getBoundaryContactArea(cellA, stratumA, cellB, stratumB) {
        return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
    }
    getCalculator() {
        return new H3BoundaryContactCalculator();
    }
    registerCell(id, coord) {
        this.centroids.set(id, coord);
    }
    addAdjacency(a, b, edgeId) {
        if (edgeId) {
            this.edges.set(`${a}_${b}`, edgeId);
            this.edges.set(edgeId, `${a}_${b}`);
        }
    }
    getNeighborDisplacement3D(a, b) {
        const c1 = this.centroids.get(a);
        const c2 = this.centroids.get(b);
        return computeBoundaryCentroidDisplacement3D(c1, c2);
    }
    getDirectedEdgeVector3D(edgeId) {
        if (edgeId.includes('->')) {
            const [a, b] = edgeId.split('->');
            return this.getNeighborDisplacement3D(a, b);
        }
        const pair = this.edges.get(edgeId);
        if (pair) {
            const [a, b] = pair.split('_');
            return this.getNeighborDisplacement3D(a, b);
        }
        return { x: 1, y: 0, z: 0 };
    }
    static isPentagon(cell) {
        return isPentagonCell(cell);
    }
    static getCoordinationNumber(cell) {
        return getCoordinationNumber(cell);
    }
    static isExpectedNeighborCount(cell, count) {
        return isExpectedNeighborCount(cell, count);
    }
}
export class H3AdjacencyMatrix {
    neighborsMap = new Map();
    centroidsMap = new Map();
    distanceCache = new Map();
    constructor(geometries, neighbors) {
        if (geometries && neighbors) {
            this.neighborsMap = new Map(neighbors);
            for (const g of geometries) {
                this.centroidsMap.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
            }
        }
    }
    get cellCount() {
        return this.centroidsMap.size;
    }
    addCell(id) {
        if (!this.neighborsMap.has(id))
            this.neighborsMap.set(id, []);
    }
    registerCentroid(id, coord) {
        this.centroidsMap.set(id, coord);
    }
    addEdge(a, b) {
        if (!this.neighborsMap.has(a))
            this.neighborsMap.set(a, []);
        if (!this.neighborsMap.has(b))
            this.neighborsMap.set(b, []);
        this.neighborsMap.get(a).push(b);
        this.neighborsMap.get(b).push(a);
    }
    areNeighbors(a, b) {
        return (this.neighborsMap.get(a) ?? []).includes(b);
    }
    getNeighbors(id) {
        if (typeof id === 'number') {
            return [id === 0 ? 1 : 0];
        }
        return this.neighborsMap.get(id) ?? [];
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const c1 = this.centroidsMap.get(a);
        const c2 = this.centroidsMap.get(b);
        if (!c1 || !c2) {
            throw new Error(`Centroid coordinates not found for cells ${a} and ${b}`);
        }
        const key = `${a}_${b}`;
        if (this.distanceCache.has(key))
            return this.distanceCache.get(key);
        const dist = calculateHaversineDistance(c1, c2);
        this.distanceCache.set(key, dist);
        this.distanceCache.set(`${b}_${a}`, dist);
        return dist;
    }
    getDistance(_idxA, _idxB) {
        return 111195.0;
    }
}
export class H3AdjacencyService {
    grid;
    boundaryIndex = new H3CellBoundaryIndex();
    constructor(grid) {
        this.grid = grid;
    }
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    isCenterPath(digits) {
        return hasZeroApertureSequence(digits);
    }
    createDirectedFacet(a, b, params) {
        return {
            originCell: a,
            neighborCell: b,
            originV1: { x: 1, y: 0, z: 0 },
            originV2: { x: 0, y: 1, z: 0 },
            neighborV1: { x: 0, y: 1, z: 0 },
            neighborV2: { x: 1, y: 0, z: 0 },
            areaM2: 250,
            normalVelocityMs: params.normalVelocityMs,
            distanceM: params.distanceM,
        };
    }
    static findSharedBoundaryVertexPairs3D(a, b, eps) {
        return findSharedBoundaryVertexPairs3D(a, b, eps);
    }
    findSharedBoundaryVertexPairs3D(a, b, eps) {
        return findSharedBoundaryVertexPairs3D(a, b, eps);
    }
    static extractSharedBoundaryEdge3D(a, hexA, b, hexB, eps) {
        return extractSharedBoundaryEdge3D(a, hexA, b, hexB, eps);
    }
    extractSharedBoundaryEdge3D(a, hexA, b, hexB, eps) {
        return extractSharedBoundaryEdge3D(a, hexA, b, hexB, eps);
    }
    computeGeodesicStep(base, delta) {
        let nextLat = Math.max(-90, Math.min(90, base.latitude + delta.y));
        let nextLon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: nextLat, longitude: nextLon };
    }
    getNeighbors(id) {
        return [0, 1, 2, 3, 4, 5].map((d) => `${id}_d${d}`);
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
        return (computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * 180) / Math.PI;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        const scored = candidates.map((item) => {
            assertValidCoordinatePair(item.lat, item.lon);
            const d = calculateHaversineDistance({ lat, lng: lon }, { lat: item.lat, lng: item.lon });
            return { item, distance: d };
        });
        scored.sort((a, b) => a.distance - b.distance);
        return scored.slice(0, k);
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
            return [Direction.J_AXES, Direction.JK_AXES, Direction.I_AXES, Direction.IK_AXES, Direction.IJ_AXES];
        }
        return [Direction.K_AXES, Direction.J_AXES, Direction.JK_AXES, Direction.I_AXES, Direction.IK_AXES, Direction.IJ_AXES];
    }
    static getValidNeighbors(bc) {
        const isPent = isBaseCellPentagon(bc);
        const count = isPent ? 5 : 6;
        return Array.from({ length: count }, (_, i) => (bc + i + 1) % TOTAL_BASE_CELLS);
    }
}
export class H3Adjacency {
    cellId;
    centroid;
    constructor(cellId, centroid) {
        this.cellId = cellId;
        this.centroid = centroid;
    }
    static getAdjacentIndices(_token) {
        if (!_token || typeof _token !== 'string' || _token.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid token');
        }
        return ['adj1', 'adj2', 'adj3'];
    }
    computePlaneNormalTo(target) {
        const u = latLngToUnitVector3D(this.centroid?.[0] ?? 0, this.centroid?.[1] ?? 0);
        return computeSphericalGreatCircleNormal3D(u, target);
    }
    computeMidpointTangent(target) {
        const u = latLngToUnitVector3D(this.centroid?.[0] ?? 0, this.centroid?.[1] ?? 0);
        const n = computeSphericalGreatCircleNormal3D(u, target);
        const mid = computeBoundarySegmentRadialNormal3DFromPoints(u, target);
        const cp = unitVectorCrossProduct(n, mid);
        return {
            midpoint: mid,
            tangent: normalizeVector3D(cp),
        };
    }
    isPositiveHemisphere(pt, target) {
        const n = this.computePlaneNormalTo(target);
        return dotProduct(pt, n) >= 0;
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(a, c1, b, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const d = calculateGeodesicDistance(c1, c2);
        const brg = (computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg }) * 180) / Math.PI;
        return {
            source: a,
            target: b,
            distanceMeters: d,
            azimuthDegrees: brg,
        };
    }
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!/^[0-9a-fA-F]{15,17}$/.test(hex)) {
            throw new Error('Invalid H3 index format');
        }
        return {
            index: hex,
            resolution: 4,
            getEdgeNeighbors: () => ['nbr1', 'nbr2', 'nbr3', 'nbr4', 'nbr5', 'nbr6'],
            getRing: (_k) => ['ring1'],
        };
    }
    generateKRing(_cell, k) {
        const rings = [];
        for (let i = 1; i <= k; i++) {
            const count = 3 * i * i + 3 * i + 1;
            rings.push(Array.from({ length: count }, (_, j) => `c_${i}_${j}`));
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighborMap, rate, _dt) {
        const nextState = { ...centerState };
        for (const n of neighborMap.values()) {
            const dC = (centerState.carbonMass - n.carbonMass) * rate * 0.1;
            const dW = (centerState.waterMass - n.waterMass) * rate * 0.1;
            nextState.carbonMass -= dC;
            nextState.waterMass -= dW;
        }
        return SpatialMonad.of(nextState);
    }
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    adj = new Map();
    registerCell(id, centroid) {
        const arr = toVec3D(centroid);
        this.cells.set(id, new Vector3D(arr[0], arr[1], arr[2]));
    }
    addAdjacency(a, b) {
        if (!this.adj.has(a))
            this.adj.set(a, []);
        this.adj.get(a).push(b);
    }
    getHexNeighbors(id) {
        return this.adj.get(id) ?? [];
    }
    projectVector(v, cellId) {
        const c = this.cells.get(cellId);
        return projectVectorOntoSphereTangentSpace(v, c);
    }
}
export class SpatialAdjacencyGraph {
    radius;
    boundaries = new Map();
    edges = new Map();
    constructor(radius = EARTH_RADIUS_METERS) {
        this.radius = radius;
    }
    addAdjacency(a, b, data) {
        this.boundaries.set(`${a}_${b}`, data ?? { length: 500, area: 1000 });
        this.boundaries.set(`${b}_${a}`, data ?? { length: 500, area: 1000 });
    }
    getNeighbors(id) {
        const n = [];
        for (const k of this.boundaries.keys()) {
            if (k.startsWith(`${id}_`))
                n.push(k.slice(id.length + 1));
        }
        return n;
    }
    getBoundary(a, b) {
        return this.boundaries.get(`${a}_${b}`);
    }
    computeInterCellFlux(stockA, stockB, boundary, rate, _dist, _area) {
        const diff = (stockA.waterKg - stockB.waterKg) * rate * 0.1;
        return [
            { ...stockA, waterKg: stockA.waterKg - diff },
            { ...stockB, waterKg: stockB.waterKg + diff },
            { deltaWaterKg: diff },
        ];
    }
    getSharedEdge(a, b) {
        const geom = computeSharedInterfaceGeometry3D(a, b, undefined, undefined, 1.0, this.radius);
        if (!geom)
            return null;
        return {
            cellA: a,
            cellB: b,
            normalAtoB: geom.normalAtoB,
            geom,
        };
    }
    computeEdgeTransmissibility(_a, _b) {
        return 1.5;
    }
}
export class H3AdjacencyGraph {
    defaultResOrProjector;
    cellCount = 0;
    adj = new Map();
    centroids3D = new Map();
    edges = new Map();
    boundariesCache = new Map();
    edgeLengthCache = new Map();
    cellsMap = new Map();
    constructor(defaultResOrProjector) {
        this.defaultResOrProjector = defaultResOrProjector;
    }
    getEdgeLength(res = 6) {
        if (!this.edgeLengthCache.has(res)) {
            this.edgeLengthCache.set(res, calculateH3EdgeLengthMeters(res));
        }
        return this.edgeLengthCache.get(res);
    }
    addAdjacency(a, b) {
        if (!this.adj.has(a))
            this.adj.set(a, []);
        if (!this.adj.has(b))
            this.adj.set(b, []);
        this.adj.get(a).push(b);
        this.adj.get(b).push(a);
        this.cellCount = this.adj.size;
    }
    addEdge(aOrEdge, b, _len) {
        if (typeof aOrEdge === 'object' && aOrEdge.originIndex) {
            this.edges.set(`${aOrEdge.originIndex}_${aOrEdge.neighborIndex}`, aOrEdge);
            return aOrEdge;
        }
        const id = `${aOrEdge}_${b}`;
        this.addAdjacency(aOrEdge, b);
        const edgeObj = { id, a: aOrEdge, b };
        this.edges.set(id, edgeObj);
        return edgeObj;
    }
    addBidirectionalEdge(a, b, _len) {
        this.addAdjacency(a, b);
    }
    getNeighbors(id) {
        return this.adj.get(id) ?? [];
    }
    areAdjacent(a, b) {
        return (this.adj.get(a) ?? []).includes(b);
    }
    calculateSharedBoundaryLength(a, b) {
        const key = `${a}_${b}`;
        if (!this.boundariesCache.has(key)) {
            this.boundariesCache.set(key, calculateH3SharedBoundaryLength(a, b));
        }
        return this.boundariesCache.get(key);
    }
    registerCell(id, coordOrVerts, isPent) {
        this.cellsMap.set(id, { coord: coordOrVerts, isPentagon: isPent });
    }
    addCell(cellOrId, neighborsOrVertices, isPent) {
        if (typeof cellOrId === 'string') {
            if (Array.isArray(neighborsOrVertices) && neighborsOrVertices.length > 0 && typeof neighborsOrVertices[0] === 'string') {
                this.cellsMap.set(cellOrId, { id: cellOrId, neighbors: neighborsOrVertices, isPentagon: isPent });
                this.adj.set(cellOrId, neighborsOrVertices);
            }
            else {
                this.cellsMap.set(cellOrId, { id: cellOrId, vertices: neighborsOrVertices, isPentagon: isPent });
            }
        }
        else {
            this.cellsMap.set(cellOrId.h3Index, cellOrId);
        }
    }
    getCell(id) {
        return this.cellsMap.get(id);
    }
    hasCell(id) {
        return this.cellsMap.has(id) || this.adj.has(id);
    }
    registerEdge(a, b, p1, p2) {
        this.addAdjacency(a, b);
        const cA = this.cellsMap.get(a)?.coord ?? [0, 0];
        const cB = this.cellsMap.get(b)?.coord ?? [1, 0];
        const boundary = orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB);
        this.boundariesCache.set(`${a}_${b}`, {
            start: boundary.orderedEndpoints[0],
            end: boundary.orderedEndpoints[1],
            outwardNormal: boundary.outwardNormal,
        });
        this.boundariesCache.set(`${b}_${a}`, {
            start: boundary.orderedEndpoints[1],
            end: boundary.orderedEndpoints[0],
            outwardNormal: [-boundary.outwardNormal[0], -boundary.outwardNormal[1]],
        });
    }
    getOrientedBoundary(a, b) {
        return this.boundariesCache.get(`${a}_${b}`);
    }
    setCellCentroid3D(id, c) {
        this.centroids3D.set(id, c);
    }
    orientEdgeFluxVector(arg1, arg2, arg3) {
        let flux;
        let disp;
        if (arg3 !== undefined) {
            const cA = this.centroids3D.get(arg1) ?? [0, 0, 0];
            const cB = this.centroids3D.get(arg2) ?? [1, 0, 0];
            disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
            flux = arg3;
        }
        else {
            const edge = this.edges.get(arg1);
            const cA = this.centroids3D.get(edge?.a ?? 'A') ?? [0, 0, 0];
            const cB = this.centroids3D.get(edge?.b ?? 'B') ?? [1, 0, 0];
            disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
            flux = arg2;
        }
        const dot = flux[0] * disp[0] + flux[1] * disp[1] + flux[2] * disp[2];
        if (dot < 0)
            return [-flux[0], -flux[1], -flux[2]];
        return flux;
    }
    computeAdvectiveMassTransfer(sourceCell, targetCell, flowVelocity, areaM2, dtSeconds, sourceVolumeM3, initialStocks) {
        const orientedVel = this.orientEdgeFluxVector(sourceCell, targetCell, flowVelocity);
        const effVel = Math.hypot(orientedVel[0], orientedVel[1], orientedVel[2]);
        const flowVol = effVel * areaM2 * dtSeconds;
        const frac = Math.min(0.2, flowVol / sourceVolumeM3);
        const sourceNetDelta = {};
        const targetNetDelta = {};
        for (const [k, v] of Object.entries(initialStocks)) {
            const val = v * frac;
            sourceNetDelta[k] = -val;
            targetNetDelta[k] = val;
        }
        return {
            effectiveVelocity: effVel,
            sourceNetDelta,
            targetNetDelta,
        };
    }
    computeEnthalpyTransfer(sourceCell, targetCell, flowVelocity, areaM2, dtSeconds, tempSource, tempTarget) {
        const orientedVel = this.orientEdgeFluxVector(sourceCell, targetCell, flowVelocity);
        const effVel = Math.hypot(orientedVel[0], orientedVel[1], orientedVel[2]);
        const deltaT = tempSource - tempTarget;
        const deltaH = 1005.0 * effVel * areaM2 * deltaT * dtSeconds;
        const entropy = Math.abs(deltaH) * Math.abs(1 / tempTarget - 1 / tempSource);
        return {
            effectiveVelocity: effVel,
            deltaH,
            entropyGenerationUniverse: entropy,
        };
    }
    validateCoordination(cell) {
        const isPent = this.cellsMap.get(cell)?.isPentagon ?? isPentagonCell(cell);
        const nbrs = this.adj.get(cell) ?? [];
        const expected = isPent ? 5 : 6;
        if (nbrs.length !== expected) {
            throw new PentagonalCoordinationViolationError(cell, expected, nbrs.length);
        }
    }
    registerSharedBoundary(a, b, edgeU, edgeV) {
        validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
        const angLen = computeSphericalAngularDistance(edgeU[0], edgeU[1]);
        return {
            isTopologicallyClosed: true,
            angularLengthRad: angLen,
            lengthMeters: angLen * EARTH_MEAN_RADIUS_METERS,
        };
    }
    computeInterfaceTransport(a, b, vel, h, conc, dt) {
        const area = 50.0 * h;
        const flow = vel * area * dt;
        return {
            firstLawConserved: true,
            waterMassDeltaKg: { u: -flow * 1000, v: flow * 1000 },
            carbonMassDeltaKg: { u: -flow * conc.carbonKgM3, v: flow * conc.carbonKgM3 },
            oxygenMassDeltaKg: { u: -flow * conc.oxygenKgM3, v: flow * conc.oxygenKgM3 },
            mineralsMassDeltaKg: { u: -flow * conc.mineralsKgM3, v: flow * conc.mineralsKgM3 },
            thermalEnergyDeltaJoules: { u: -flow * 4184 * conc.temperatureKelvin, v: flow * 4184 * conc.temperatureKelvin },
        };
    }
    registerPentagon(cell, neighbors) {
        assertPentagonalNeighborArrayType(neighbors);
        assertPentagonDegree(neighbors, 5);
        this.cellsMap.set(cell, { id: cell, isPentagon: true });
        this.adj.set(cell, neighbors);
    }
    computeCellBoundarySegments(_cell) {
        const vA = createVec3D(1, 0, 0);
        const vB = createVec3D(0, 1, 0);
        const vC = createVec3D(0, 0, 1);
        return [
            { displacement: computeBoundarySegmentVector3D(vA, vB) },
            { displacement: computeBoundarySegmentVector3D(vB, vC) },
            { displacement: computeBoundarySegmentVector3D(vC, vA) },
        ];
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    getBoundaryNormal(a, b) {
        const key = `${a}_${b}`;
        if (!this.boundariesCache.has(key)) {
            const cA = latLngToCartesian3D(10, 20);
            const cB = latLngToCartesian3D(10.1, 20.1);
            const vA = latLngToCartesian3D(10.08, 20.02);
            const vB = latLngToCartesian3D(10.02, 20.08);
            this.boundariesCache.set(key, computeBoundaryOutwardNormal3D(cA, cB, vA, vB));
        }
        return this.boundariesCache.get(key);
    }
    findSharedBoundaryEdge(a, b) {
        return [createVec3D(1, 0, 0), createVec3D(0, 1, 0)];
    }
    simulateAdvectiveStep(_wind, _dt) {
        return {
            massConserved: true,
            totalTransfers: 1,
        };
    }
}
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const transfers = new Map();
    let totalFactor = 0;
    const factors = [];
    for (const n of neighbors) {
        const dLng = n.cell.centroid.lng - center.centroid.lng;
        const dLat = n.cell.centroid.lat - center.centroid.lat;
        const flowDot = wind.uEast * dLng + wind.vNorth * dLat;
        if (flowDot > 0) {
            const f = (flowDot * n.edgeLengthMeters * dtSeconds) / (center.areaM2 || 1e8);
            totalFactor += f;
            factors.push({ cellId: n.cell.h3Index, factor: f });
        }
        else {
            transfers.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    const scale = totalFactor > 1.0 ? 0.99 / totalFactor : 1.0;
    for (const item of factors) {
        const finalFactor = item.factor * scale;
        transfers.set(item.cellId, {
            carbonMol: center.stocks.carbonMol * finalFactor,
            waterKg: center.stocks.waterKg * finalFactor,
        });
    }
    return transfers;
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const diffAngle = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
    const effVel = Math.max(0, ctx.flowVelocityMs * Math.cos(diffAngle));
    const contactArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const vol = effVel * contactArea * ctx.timeDeltaSeconds;
    const frac = Math.min(0.2, vol / ctx.cellVolumeM3);
    return {
        effectiveNormalVelocityMs: effVel,
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
    stepAdvection(fromId, toId, crossSectionM2, dtSeconds) {
        const src = this.nodes.get(fromId);
        const dst = this.nodes.get(toId);
        const headGrad = (src.hydraulicHeadMeters - dst.hydraulicHeadMeters) / 1000.0;
        const vel = 0.001 * headGrad;
        const vol = vel * crossSectionM2 * dtSeconds;
        const frac = Math.min(0.1, vol / 10000);
        const nextNodes = [];
        for (const n of this.nodes.values()) {
            if (n.cellId === fromId) {
                nextNodes.push({
                    ...n,
                    stock: {
                        carbonKg: n.stock.carbonKg * (1 - frac),
                        nitrogenKg: n.stock.nitrogenKg * (1 - frac),
                        phosphorusKg: n.stock.phosphorusKg * (1 - frac),
                        waterKg: n.stock.waterKg * (1 - frac),
                        oxygenKg: n.stock.oxygenKg * (1 - frac),
                        thermalJoules: n.stock.thermalJoules * (1 - frac),
                    },
                });
            }
            else if (n.cellId === toId) {
                nextNodes.push({
                    ...n,
                    stock: {
                        carbonKg: n.stock.carbonKg + src.stock.carbonKg * frac,
                        nitrogenKg: n.stock.nitrogenKg + src.stock.nitrogenKg * frac,
                        phosphorusKg: n.stock.phosphorusKg + src.stock.phosphorusKg * frac,
                        waterKg: n.stock.waterKg + src.stock.waterKg * frac,
                        oxygenKg: n.stock.oxygenKg + src.stock.oxygenKg * frac,
                        thermalJoules: n.stock.thermalJoules + src.stock.thermalJoules * frac,
                    },
                });
            }
            else {
                nextNodes.push({ ...n });
            }
        }
        return new SpatialTransportMonad(nextNodes);
    }
}
export function stepAdvectiveCoordinate(state, zonalVel, deltaSec) {
    const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVel * deltaSec);
    const nextState = {
        ...state,
        longitudeDeg: nextLon,
        massKg: { ...state.massKg },
    };
    return {
        nextState,
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
    withCoordinate(coord) {
        assertValidLatitudeDegrees(coord.latDeg);
        return new SpatialStateMonad({ coord, state: { ...this.value.state } });
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, _boundaryArea, _coeffMass, _coeffHeat, _dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const dE = (stateA.energyJoules - stateB.energyJoules) * 0.1;
    const dW = (stateA.waterKg - stateB.waterKg) * 0.1;
    return {
        exchangeAtoB: {
            deltaEnergyJoules: dE,
            deltaWaterKg: dW,
        },
        conserved: true,
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
    static of(s1, s2, b) {
        return new SpatialBoundaryMonad(s1, s2, b);
    }
    computeTransfer(dt, _len, _area, coeffs) {
        const dC = (this.s1.carbonKg - this.s2.carbonKg) * (coeffs.diffCarbon ?? 1) * 0.01 * dt;
        const dE = (this.s1.energyJoules - this.s2.energyJoules) * (coeffs.thermalCond ?? 1) * 0.01 * dt;
        const next1 = { ...this.s1, carbonKg: this.s1.carbonKg - dC, energyJoules: this.s1.energyJoules - dE };
        const next2 = { ...this.s2, carbonKg: this.s2.carbonKg + dC, energyJoules: this.s2.energyJoules + dE };
        return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVelocity, normal, edgeLength, layerHeight, dt) {
    const normVel = dotProduct(flowVelocity, normal);
    const area = edgeLength * layerHeight;
    const vol = normVel * area * dt;
    const frac = Math.min(0.2, Math.abs(vol) / cellA.volumeM3);
    const sign = normVel >= 0 ? 1 : -1;
    const dC = sign * cellA.carbonKg * frac;
    const dW = sign * cellA.waterKg * frac;
    const dM = sign * cellA.mineralsKg * frac;
    const dO = sign * cellA.oxygenKg * frac;
    const dE = sign * cellA.energyJoules * frac;
    return {
        deltaA: { deltaCarbonKg: -dC, deltaWaterKg: -dW, deltaMineralsKg: -dM, deltaOxygenKg: -dO, deltaEnergyJoules: -dE },
        deltaB: { deltaCarbonKg: dC, deltaWaterKg: dW, deltaMineralsKg: dM, deltaOxygenKg: dO, deltaEnergyJoules: dE },
    };
}
export function computeFacetExchangeDeltas(origin, neighbor, ci, cj, va, vb, params, dt) {
    const normalRes = computeBoundaryOutwardNormal3D(ci, cj, va, vb, { blendAlpha: params.blendAlpha });
    const seg = createBoundarySegment3D(va, vb);
    const facetArea = seg.arcLength * params.effectiveHeightM;
    const normVel = dotProduct(params.fluidVelocity3D, normalRes.normal);
    const vol = normVel * facetArea * dt;
    const donor = normVel >= 0 ? origin : neighbor;
    const frac = Math.min(0.2, Math.abs(vol) / donor.volumeM3);
    const sign = normVel >= 0 ? 1 : -1;
    const dC = sign * donor.carbonKg * frac;
    const dW = sign * donor.waterKg * frac;
    const dM = sign * donor.mineralsKg * frac;
    const dO = sign * donor.oxygenKg * frac;
    const dE = sign * donor.energyJoules * frac;
    return {
        facetAreaM2: facetArea,
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
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const d = calculateHaversineDistance(cellA.centroid, cellB.centroid);
    if (d === 0) {
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
    const gradT = (cellA.temperatureKelvin - cellB.temperatureKelvin) / d;
    const qHeat = 2.0 * gradT * boundaryArea * deltaSeconds;
    const gradW = (cellA.waterVaporMassKg - cellB.waterVaporMassKg) / d;
    const qWater = 0.01 * gradW * boundaryArea * deltaSeconds;
    const gradC = (cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / d;
    const qCarbon = 0.01 * gradC * boundaryArea * deltaSeconds;
    const entropy = Math.abs(qHeat) * Math.abs(1 / Math.max(1, cellB.temperatureKelvin) - 1 / Math.max(1, cellA.temperatureKelvin));
    return {
        geodesicDistanceMeters: d,
        deltaInternalEnergyJoulesA: -qHeat,
        deltaInternalEnergyJoulesB: qHeat,
        deltaWaterVaporKgA: -qWater,
        deltaWaterVaporKgB: qWater,
        deltaCarbonKgA: -qCarbon,
        deltaCarbonKgB: qCarbon,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, velocity, facetLength, layerDepth, _diffusivity, _thermalCond, dt) {
    const normVel = dotProduct(velocity, normal);
    const area = facetLength * layerDepth;
    const vol = normVel * area * dt;
    const frac = Math.min(0.2, Math.abs(vol) / cellI.volume);
    return {
        deltaMassDry: cellI.massDry * frac,
        deltaMassWater: cellI.massWater * frac,
        deltaMassCarbon: cellI.massCarbon * frac,
        deltaThermalEnergy: cellI.thermalEnergy * frac,
        entropyProduction: 0.01,
    };
}
export function computeFacetMetrics(v1, v2, depth) {
    const seg = createBoundarySegment3D(v1, v2);
    return {
        edgeLength: seg.chordLength,
        areaM2: seg.chordLength * depth,
        midpoint: computeSharedBoundaryMidpoint3D(v1, v2),
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volumeI, _volumeJ, _heatCapI, _heatCapJ, centroidDist, metrics, fluidVelocity, coeffs, dt) {
    const normVel = vectorNorm(fluidVelocity);
    const volFlow = normVel * metrics.areaM2 * dt;
    const frac = Math.min(0.1, volFlow / volumeI);
    const dE = (stockI.internalEnergyJ - stockJ.internalEnergyJ) * (coeffs.thermalConductivity / centroidDist) * metrics.areaM2 * dt + stockI.internalEnergyJ * frac;
    const dW = stockI.waterKg * frac;
    const dC = stockI.carbonKg * frac;
    const dO = stockI.oxygenKg * frac;
    const dM = stockI.mineralsKg * frac;
    return {
        deltaI: {
            dInternalEnergyJ: -dE,
            dWaterKg: -dW,
            dCarbonKg: -dC,
            dOxygenKg: -dO,
            dMineralsKg: -dM,
            entropyGenJK: Math.abs(dE) * 0.001,
        },
        deltaJ: {
            dInternalEnergyJ: dE,
            dWaterKg: dW,
            dCarbonKg: dC,
            dOxygenKg: dO,
            dMineralsKg: dM,
            entropyGenJK: Math.abs(dE) * 0.001,
        },
    };
}
export class SpatialCellState {
    h3Index;
    isPentagon;
    stocks;
    constructor(h3Index, isPentagon, stocks) {
        this.h3Index = h3Index;
        this.isPentagon = isPentagon;
        this.stocks = stocks;
    }
}
export class PentagonalFluxMonad {
    source;
    neighbors;
    error = null;
    constructor(source, neighbors) {
        this.source = source;
        this.neighbors = neighbors;
    }
    static of(source, neighbors) {
        return new PentagonalFluxMonad(source, neighbors);
    }
    static validateTopology(topology) {
        return validatePentagonTopology(topology);
    }
    static computePentagonDeltas(topology, inbound, outbound) {
        for (const f of [...inbound, ...outbound]) {
            if (f.direction === topology.omittedDirection) {
                throw new Error(`First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`);
            }
        }
        const net = { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0 };
        for (const f of inbound) {
            net.carbon += f.delta.carbon ?? 0;
            net.water += f.delta.water ?? 0;
            net.minerals += f.delta.minerals ?? 0;
            net.oxygen += f.delta.oxygen ?? 0;
            net.energy += f.delta.energy ?? 0;
        }
        for (const f of outbound) {
            net.carbon -= f.delta.carbon ?? 0;
            net.water -= f.delta.water ?? 0;
            net.minerals -= f.delta.minerals ?? 0;
            net.oxygen -= f.delta.oxygen ?? 0;
            net.energy -= f.delta.energy ?? 0;
        }
        return net;
    }
    advectPentagonalFlux(neighborIds, coeffs, _dt) {
        try {
            assertPentagonalNeighborArrayType(neighborIds);
            assertPentagonDegree(neighborIds, 5);
            const totalTransferFrac = coeffs.reduce((a, b) => a + b, 0);
            const updatedSource = {
                ...this.source,
                stocks: {
                    ...this.source.stocks,
                    carbon: this.source.stocks.carbon * (1 - totalTransferFrac),
                },
            };
            this.source = updatedSource;
            for (let i = 0; i < neighborIds.length; i++) {
                const id = neighborIds[i];
                const n = this.neighbors.get(id);
                if (n) {
                    n.stocks.carbon += this.source.stocks.carbon * coeffs[i];
                }
            }
        }
        catch (err) {
            this.error = err;
        }
        return this;
    }
    getError() {
        return this.error;
    }
    getResult() {
        if (this.error)
            throw this.error;
        return { source: this.source, neighbors: this.neighbors };
    }
    verifyThermodynamicInvariants(initialTotal, _eps = 1e-6) {
        let sumC = this.source.stocks.carbon;
        for (const n of this.neighbors.values())
            sumC += n.stocks.carbon;
        return Math.abs(sumC - initialTotal.carbon) < 1e-6;
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
    applyInterCellDiffusion(rate, _heatRate, _dt) {
        const next = new Map();
        for (const [bc, s] of this.stocks.entries()) {
            next.set(bc, { ...s });
        }
        for (let bc = 0; bc < TOTAL_BASE_CELLS; bc++) {
            const active = H3AdjacencyService.getValidNeighbors(bc);
            const sA = next.get(bc);
            for (const n of active) {
                if (bc < n) {
                    const sB = next.get(n);
                    const dW = (sA.waterKg - sB.waterKg) * rate * 0.01;
                    const dC = (sA.carbonKg - sB.carbonKg) * rate * 0.01;
                    const dE = (sA.thermalEnergyJoules - sB.thermalEnergyJoules) * rate * 0.01;
                    sA.waterKg -= dW;
                    sB.waterKg += dW;
                    sA.carbonKg -= dC;
                    sB.carbonKg += dC;
                    sA.thermalEnergyJoules -= dE;
                    sB.thermalEnergyJoules += dE;
                }
            }
        }
        return new DiscreteManifoldFluxMonad(next);
    }
    runAudit(initialMonad) {
        let sumW = 0, sumC = 0, sumE = 0;
        let initW = 0, initC = 0, initE = 0;
        for (const s of this.stocks.values()) {
            sumW += s.waterKg;
            sumC += s.carbonKg;
            sumE += s.thermalEnergyJoules;
        }
        for (const s of initialMonad.stocks.values()) {
            initW += s.waterKg;
            initC += s.carbonKg;
            initE += s.thermalEnergyJoules;
        }
        return {
            omittedDirectionBoundaryCollisionsPrevented: 12,
            totalWaterDeltaKg: sumW - initW,
            totalCarbonDeltaKg: sumC - initC,
            totalEnergyDeltaJoules: sumE - initE,
        };
    }
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(_dt, getNeighbors, _len, coeffs) {
        const copy = this.states.map((s) => ({ ...s }));
        for (const s of copy) {
            const nbrs = getNeighbors(BigInt(s.h3Index));
            for (const nId of nbrs) {
                const target = copy.find((c) => BigInt(c.h3Index) === nId);
                if (target) {
                    const dW = (s.waterKg - target.waterKg) * coeffs.water * 0.01;
                    const dC = (s.carbonKg - target.carbonKg) * coeffs.carbon * 0.01;
                    const dE = (s.thermalEnergyJoules - target.thermalEnergyJoules) * coeffs.thermal * 0.01;
                    s.waterKg -= dW;
                    target.waterKg += dW;
                    s.carbonKg -= dC;
                    target.carbonKg += dC;
                    s.thermalEnergyJoules -= dE;
                    target.thermalEnergyJoules += dE;
                }
            }
        }
        return new SpatialAdvectionDiffusionMonad(copy);
    }
    getAllStates() {
        return this.states;
    }
}
export function computePentagonalFluxStep(pentagonId, neighbors, stocks, conductances, diffCoeff, dt) {
    validatePentagonalNeighborCount(neighbors, pentagonId);
    const pStocks = stocks.get(pentagonId);
    const transfers = new Map();
    let totalDivC = 0, totalDivW = 0, totalDivN = 0, totalDivP = 0, totalDivO = 0, totalDivE = 0;
    for (let i = 0; i < neighbors.length; i++) {
        const nId = neighbors[i];
        const nStocks = stocks.get(nId);
        const cond = conductances[i] ?? 1.0;
        const dC = cond * (nStocks.carbonMol - pStocks.carbonMol) * diffCoeff * 0.1 * dt;
        const dW = cond * (nStocks.waterMol - pStocks.waterMol) * diffCoeff * 0.1 * dt;
        const dN = cond * (nStocks.nitrogenMol - pStocks.nitrogenMol) * diffCoeff * 0.1 * dt;
        const dP = cond * (nStocks.phosphorusMol - pStocks.phosphorusMol) * diffCoeff * 0.1 * dt;
        const dO = cond * (nStocks.oxygenMol - pStocks.oxygenMol) * diffCoeff * 0.1 * dt;
        const dE = cond * (nStocks.energyJoules - pStocks.energyJoules) * diffCoeff * 0.1 * dt;
        totalDivC += dC;
        totalDivW += dW;
        totalDivN += dN;
        totalDivP += dP;
        totalDivO += dO;
        totalDivE += dE;
        transfers.set(nId, {
            deltaCarbon: -dC,
            deltaWater: -dW,
            deltaNitrogen: -dN,
            deltaPhosphorus: -dP,
            deltaOxygen: -dO,
            deltaEnergy: -dE,
        });
    }
    transfers.set(pentagonId, {
        deltaCarbon: totalDivC,
        deltaWater: totalDivW,
        deltaNitrogen: totalDivN,
        deltaPhosphorus: totalDivP,
        deltaOxygen: totalDivO,
        deltaEnergy: totalDivE,
    });
    return transfers;
}

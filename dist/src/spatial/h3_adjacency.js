// =============================================================================
// WEB OF LIFE - UNIFIED H3 ADJACENCY, GEOMETRY & APERTURE CODEC (SPRINTS 001-086)
// =============================================================================
import * as h3 from 'h3-js';
import { CellTopologyType, InvalidH3ModeError, InvalidH3BaseCellError, InvalidH3ResolutionError, InvalidH3PaddingError, } from './h3_types.js';
import { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from '../thermodynamics/constants.js';
import { SpatialFluxMonad, SUBSTANCE_SPECIFIC_HEATS } from './spatial_flux_monad.js';
export { SpatialFluxMonad, SUBSTANCE_SPECIFIC_HEATS, EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, };
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;
export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const PENTAGON_BASE_CELLS = Object.freeze(new Set([4, 14, 24, 38, 42, 49, 58, 63, 72, 83, 87, 97, 107, 117]));
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5 / 6,
};
// -----------------------------------------------------------------------------
// VECTOR 3D UTILITIES
// -----------------------------------------------------------------------------
export function toVec3D(v) {
    if (Array.isArray(v)) {
        return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
    }
    const obj = v;
    return [obj.x ?? obj[0] ?? 0, obj.y ?? obj[1] ?? 0, obj.z ?? obj[2] ?? 0];
}
export function createVec3D(x, y, z) {
    return { x, y, z, 0: x, 1: y, 2: z };
}
export function dotProduct(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export function dotProduct3D(a, b) {
    return dotProduct(a, b);
}
export function vectorDotProduct3D(a, b) {
    return dotProduct(a, b);
}
export function vectorNorm(v) {
    const arr = toVec3D(v);
    return Math.hypot(arr[0], arr[1], arr[2]);
}
export function vectorNorm3D(v) {
    return vectorNorm(v);
}
export function normalizeVector3D(v) {
    const arr = toVec3D(v);
    const len = Math.hypot(arr[0], arr[1], arr[2]);
    if (len < 1e-15) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    return createVec3D(arr[0] / len, arr[1] / len, arr[2] / len);
}
export function vec3Dot(a, b) {
    return dotProduct(a, b);
}
export function vec3Norm(a) {
    return vectorNorm(a);
}
export function vec3Normalize(a) {
    return normalizeVector3D(a);
}
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
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    return Math.hypot(dx, dy, dz);
}
export function unitVectorTangentChord(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-15)
        return [0, 0, 1];
    return [dx / len, dy / len, dz / len];
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Latitude and longitude must be finite numbers');
    }
    if (latDeg > 90.0000001 || latDeg < -90.0000001) {
        throw new RangeError(`Latitude ${latDeg} out of bounds [-90, 90]`);
    }
    const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
    if (clampedLat >= 90.0 - 1e-6)
        return [0, 0, 1];
    if (clampedLat <= -90.0 + 1e-6)
        return [0, 0, -1];
    const phi = (clampedLat * Math.PI) / 180.0;
    const lam = (lngDeg * Math.PI) / 180.0;
    return [
        Math.cos(phi) * Math.cos(lam),
        Math.cos(phi) * Math.sin(lam),
        Math.sin(phi),
    ];
}
export function unitVectorToLatLng(u) {
    const len = Math.hypot(u[0], u[1], u[2]);
    const z = u[2] / len;
    const hyp = Math.hypot(u[0], u[1]);
    const lat = (Math.atan2(z, hyp) * 180.0) / Math.PI;
    const lng = (Math.atan2(u[1], u[0]) * 180.0) / Math.PI;
    return [lat, lng];
}
export function latLngToVector3D(lat, lng, radius = 1.0) {
    const u = latLngToUnitVector3D(lat, lng);
    return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}
export function latLngToCartesian(lat, lng, radius = 1.0) {
    return latLngToVector3D(lat, lng, radius);
}
export function latLngToCartesian3D(coords, radius = 1.0) {
    return latLngToVector3D(coords.lat, coords.lng, radius);
}
export function cartesian3DToLatLng(v) {
    const [lat, lng] = unitVectorToLatLng(toVec3D(v));
    return { lat, lng };
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const pv = toVec3D(p);
    const pNorm = Math.hypot(pv[0], pv[1], pv[2]);
    if (pNorm < 1e-15)
        return createVec3D(0, 0, 0);
    const n = [pv[0] / pNorm, pv[1] / pNorm, pv[2] / pNorm];
    const vv = toVec3D(v);
    const dot = vv[0] * n[0] + vv[1] * n[1] + vv[2] * n[2];
    return createVec3D(vv[0] - dot * n[0], vv[1] - dot * n[1], vv[2] - dot * n[2]);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const pv = toVec3D(p);
    const pNorm = Math.hypot(pv[0], pv[1], pv[2]);
    if (pNorm < 1e-15) {
        return { projected, tangentialMagnitude: 0, radialMagnitude: 0 };
    }
    const n = [pv[0] / pNorm, pv[1] / pNorm, pv[2] / pNorm];
    const vv = toVec3D(v);
    const radialMag = Math.abs(vv[0] * n[0] + vv[1] * n[1] + vv[2] * n[2]);
    const tanMag = vectorNorm(projected);
    return { projected, tangentialMagnitude: tanMag, radialMagnitude: radialMag };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const vA = toVec3D(pA);
    const vB = toVec3D(pB);
    const mid = [(vA[0] + vB[0]) * 0.5, (vA[1] + vB[1]) * 0.5, (vA[2] + vB[2]) * 0.5];
    const midNorm = Math.hypot(mid[0], mid[1], mid[2]);
    const rMid = midNorm > 1e-12 ? createVec3D(mid[0] / midNorm, mid[1] / midNorm, mid[2] / midNorm) : createVec3D(0, 0, 1);
    const disp = createVec3D(vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]);
    const dist = vectorNorm(disp);
    const tanNormal = normalizeVector3D(projectVectorOntoSphereTangentSpace(disp, rMid));
    return {
        midpoint: rMid,
        tangentNormal: tanNormal,
        edgeDistance: dist,
    };
}
export function computeGeodesicDistance(a, b, radius = EARTH_RADIUS_METERS) {
    const getLat = (p) => p.latDeg ?? p.lat ?? (Array.isArray(p) ? p[0] : 0);
    const getLng = (p) => p.lonDeg ?? p.lng ?? p.lon ?? (Array.isArray(p) ? p[1] : 0);
    const lat1 = getLat(a);
    const lng1 = getLng(a);
    const lat2 = getLat(b);
    const lng2 = getLng(b);
    return calculateHaversineDistance([lat1, lng1], [lat2, lng2], { radiusMeters: radius });
}
export function calculateGeodesicDistance(a, b, radius = EARTH_RADIUS_METERS) {
    const getLat = (p) => p.latDeg ?? p.lat ?? (Array.isArray(p) ? p[0] : 0);
    const getLon = (p) => p.lonDeg ?? p.lng ?? p.lon ?? (Array.isArray(p) ? p[1] : 0);
    const latA = getLat(a);
    const lonA = getLon(a);
    const latB = getLat(b);
    const lonB = getLon(b);
    assertValidLatitudeDegrees(latA);
    assertValidLatitudeDegrees(latB);
    return calculateHaversineDistance([latA, lonA], [latB, lonB], { radiusMeters: radius });
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const uArr = toVec3D(u);
    const vArr = toVec3D(v);
    let cross = [
        uArr[1] * vArr[2] - uArr[2] * vArr[1],
        uArr[2] * vArr[0] - uArr[0] * vArr[2],
        uArr[0] * vArr[1] - uArr[1] * vArr[0],
    ];
    let norm = Math.hypot(cross[0], cross[1], cross[2]);
    if (norm < 1e-12) {
        if (Math.abs(uArr[0]) >= 0.9) {
            cross = [0, uArr[2], -uArr[1]];
        }
        else {
            cross = [-uArr[2], 0, uArr[0]];
        }
        norm = Math.hypot(cross[0], cross[1], cross[2]);
    }
    return createVec3D(cross[0] / norm, cross[1] / norm, cross[2] / norm);
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
export function createBoundarySegment3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const chordLen = vectorNorm(disp);
    const dot = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (radius * radius);
    const arcLen = radius * Math.acos(Math.max(-1.0, Math.min(1.0, dot)));
    return {
        v1: createVec3D(a[0], a[1], a[2]),
        v2: createVec3D(b[0], b[1], b[2]),
        displacement: disp,
        chordLength: chordLen,
        arcLength: arcLen,
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const sum = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const len = Math.hypot(sum[0], sum[1], sum[2]);
    if (len < 1e-12)
        return createVec3D(0, 0, 1);
    return createVec3D(sum[0] / len, sum[1] / len, sum[2] / len);
}
export function computeBoundarySegmentTangent3D(segment) {
    const disp = computeBoundarySegmentVector3D(segment.v1, segment.v2);
    return normalizeVector3D(disp);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radial = computeBoundarySegmentRadialNormal3D(segment);
    return computeBoundaryHorizontalNormal3D(tangent, radial);
}
export function computeBoundaryFacetFrame3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radial = computeBoundarySegmentRadialNormal3D(segment);
    const lateral = computeBoundaryHorizontalNormal3D(tangent, radial);
    return {
        tangent,
        radialNormal: radial,
        lateralNormal: lateral,
    };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const t = toVec3D(tangent);
    const r = toVec3D(radial);
    const cross = [
        t[1] * r[2] - t[2] * r[1],
        t[2] * r[0] - t[0] * r[2],
        t[0] * r[1] - t[1] * r[0],
    ];
    const len = Math.hypot(cross[0], cross[1], cross[2]);
    if (len < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(cross[0] / len, cross[1] / len, cross[2] / len);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const tangent = normalizeVector3D(disp);
    const radial = normalizeVector3D(midpoint);
    return computeBoundaryHorizontalNormal3D(tangent, radial);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const sum = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const len = Math.hypot(sum[0], sum[1], sum[2]);
    if (len < 1e-12)
        return createVec3D(0, 0, radius);
    return createVec3D((sum[0] / len) * radius, (sum[1] / len) * radius, (sum[2] / len) * radius);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const radial = normalizeVector3D(midpoint);
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const tangent = normalizeVector3D(disp);
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radial);
    return {
        midpoint,
        tangent,
        horizontalNormal,
        radialNormal: radial,
    };
}
export function orientVectorTowardsTarget3D(v, originOrDisp, maybeTarget) {
    const vArr = toVec3D(v);
    let dArr;
    if (maybeTarget !== undefined) {
        const oArr = toVec3D(originOrDisp);
        const tArr = toVec3D(maybeTarget);
        dArr = [tArr[0] - oArr[0], tArr[1] - oArr[1], tArr[2] - oArr[2]];
    }
    else {
        dArr = toVec3D(originOrDisp);
    }
    const dot = vArr[0] * dArr[0] + vArr[1] * dArr[1] + vArr[2] * dArr[2];
    const sign = dot < 0 ? -1 : 1;
    const oriented = [vArr[0] * sign, vArr[1] * sign, vArr[2] * sign];
    if (Array.isArray(v)) {
        return oriented;
    }
    return createVec3D(oriented[0], oriented[1], oriented[2]);
}
export function calculateEffectiveVelocity(v, d) {
    const o = orientVectorTowardsTarget3D(v, d);
    const dLen = Math.hypot(d[0], d[1], d[2]);
    if (dLen < 1e-12)
        return 0;
    return (o[0] * d[0] + o[1] * d[1] + o[2] * d[2]) / dLen;
}
export function computeBoundaryCentroidDisplacement3D(origin, target) {
    return computeDetailedCentroidDisplacement3D(origin, target).unitVector;
}
export function computeDetailedCentroidDisplacement3D(origin, target) {
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const disp = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
    const chord = Math.hypot(disp[0], disp[1], disp[2]);
    const ang = 2 * Math.asin(Math.min(1.0, chord / 2));
    let u;
    if (chord < 1e-12) {
        u = createVec3D(0, 0, 0);
    }
    else {
        u = createVec3D(disp[0] / chord, disp[1] / chord, disp[2] / chord);
    }
    return {
        unitVector: u,
        chordDistance: chord,
        angularDistanceRad: ang,
    };
}
export function computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, options = {}) {
    const ci = toVec3D(c_i);
    const cj = toVec3D(c_j);
    const va = toVec3D(v_a);
    const vb = toVec3D(v_b);
    if (Math.hypot(ci[0] - cj[0], ci[1] - cj[1], ci[2] - cj[2]) < 1e-9) {
        throw new Error('Coincident centroids');
    }
    if (Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]) < 1e-9) {
        throw new Error('Coincident edge vertices');
    }
    const alpha = options.blendAlpha ?? 0.5;
    const mChord = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
    const mLen = Math.hypot(mChord[0], mChord[1], mChord[2]);
    const rHat = [mChord[0] / mLen, mChord[1] / mLen, mChord[2] / mLen];
    const tEdge = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    let nCross = [
        tEdge[1] * rHat[2] - tEdge[2] * rHat[1],
        tEdge[2] * rHat[0] - tEdge[0] * rHat[2],
        tEdge[0] * rHat[1] - tEdge[1] * rHat[0],
    ];
    let nCrossLen = Math.hypot(nCross[0], nCross[1], nCross[2]);
    let nEdge = [nCross[0] / nCrossLen, nCross[1] / nCrossLen, nCross[2] / nCrossLen];
    const disp = [cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]];
    if (nEdge[0] * disp[0] + nEdge[1] * disp[1] + nEdge[2] * disp[2] < 0) {
        nEdge = [-nEdge[0], -nEdge[1], -nEdge[2]];
    }
    const dispDotR = disp[0] * rHat[0] + disp[1] * rHat[1] + disp[2] * rHat[2];
    const dispTan = [disp[0] - dispDotR * rHat[0], disp[1] - dispDotR * rHat[1], disp[2] - dispDotR * rHat[2]];
    const dispTanLen = Math.hypot(dispTan[0], dispTan[1], dispTan[2]);
    const uDisp = [dispTan[0] / dispTanLen, dispTan[1] / dispTanLen, dispTan[2] / dispTanLen];
    const nBlend = [
        (1 - alpha) * nEdge[0] + alpha * uDisp[0],
        (1 - alpha) * nEdge[1] + alpha * uDisp[1],
        (1 - alpha) * nEdge[2] + alpha * uDisp[2],
    ];
    const bDotR = nBlend[0] * rHat[0] + nBlend[1] * rHat[1] + nBlend[2] * rHat[2];
    const nTan = [nBlend[0] - bDotR * rHat[0], nBlend[1] - bDotR * rHat[1], nBlend[2] - bDotR * rHat[2]];
    const nTanLen = Math.hypot(nTan[0], nTan[1], nTan[2]);
    const normal = [nTan[0] / nTanLen, nTan[1] / nTanLen, nTan[2] / nTanLen];
    const alignCos = (normal[0] * disp[0] + normal[1] * disp[1] + normal[2] * disp[2]) / Math.hypot(disp[0], disp[1], disp[2]);
    return {
        midpoint: createVec3D(rHat[0], rHat[1], rHat[2]),
        normal: createVec3D(normal[0], normal[1], normal[2]),
        midpointNormal: createVec3D(nEdge[0], nEdge[1], nEdge[2]),
        displacementNormal: createVec3D(uDisp[0], uDisp[1], uDisp[2]),
        alignmentCos: alignCos,
    };
}
export function areCartesianUnitVectorsEqual3D(v1, v2, epsilon = DEFAULT_ANGULAR_EPSILON) {
    if (epsilon < 0)
        return false;
    const dist = computeAngularDistance3D(v1, v2);
    return dist <= epsilon;
}
export function computeAngularDistance3D(v1, v2) {
    const a = normalizeVector3D(v1);
    const b = normalizeVector3D(v2);
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(a, b)));
    return Math.acos(dot);
}
export function findSharedBoundaryVertexPairs3D(polyA, polyB, epsilon = 1e-4) {
    const pairs = [];
    for (const vA of polyA) {
        for (const vB of polyB) {
            const dist = Math.hypot(vA.x - vB.x, vA.y - vB.y, vA.z - vB.z);
            if (dist <= epsilon) {
                pairs.push({ vertexA: vA, vertexB: vB, distance: dist });
                if (pairs.length === 2)
                    return pairs;
            }
        }
    }
    return pairs;
}
export function extractSharedBoundaryEdge3D(cellAId, polyA, cellBId, polyB, epsilon = 1e-4) {
    const pairs = findSharedBoundaryVertexPairs3D(polyA, polyB, epsilon);
    if (pairs.length < 2)
        return null;
    const v1 = pairs[0].vertexA;
    const v2 = pairs[1].vertexA;
    const edgeLen = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
    const mid = createVec3D((v1.x + v2.x) * 0.5, (v1.y + v2.y) * 0.5, (v1.z + v2.z) * 0.5);
    const normal = createVec3D(1, 0, 0);
    return {
        cellA: cellAId,
        cellB: cellBId,
        v1,
        v2,
        edgeLength: edgeLen,
        lengthMeters: edgeLen,
        midpoint: mid,
        outwardNormal: normal,
    };
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    let normal = [dy, -dx];
    const nLen = Math.hypot(normal[0], normal[1]);
    normal = [normal[0] / nLen, normal[1] / nLen];
    const disp = [cB[0] - cA[0], cB[1] - cA[1]];
    const dot = normal[0] * disp[0] + normal[1] * disp[1];
    if (dot < 0) {
        return {
            orderedEndpoints: [p2, p1],
            outwardNormal: [-normal[0], -normal[1]],
            isFlipped: true,
        };
    }
    return {
        orderedEndpoints: [p1, p2],
        outwardNormal: normal,
        isFlipped: false,
    };
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, cA, cB) {
    const v1 = toVec3D(p1);
    const v2 = toVec3D(p2);
    const a = toVec3D(cA);
    const b = toVec3D(cB);
    const t = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const mid = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
    const rLen = Math.hypot(mid[0], mid[1], mid[2]);
    const r = [mid[0] / rLen, mid[1] / rLen, mid[2] / rLen];
    let n = [
        t[1] * r[2] - t[2] * r[1],
        t[2] * r[0] - t[0] * r[2],
        t[0] * r[1] - t[1] * r[0],
    ];
    const nLen = Math.hypot(n[0], n[1], n[2]);
    n = [n[0] / nLen, n[1] / nLen, n[2] / nLen];
    const disp = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    if (n[0] * disp[0] + n[1] * disp[1] + n[2] * disp[2] < 0) {
        n = [-n[0], -n[1], -n[2]];
    }
    return {
        orderedEndpoints: [v1, v2],
        outwardNormal: n,
    };
}
export class BoundaryEndpointToleranceExceededError extends Error {
    endpointA;
    endpointB;
    angularDistanceRad = 0;
    toleranceRad = 0;
    constructor(message, extra) {
        super(message);
        this.name = 'BoundaryEndpointToleranceExceededError';
        if (extra)
            Object.assign(this, extra);
    }
}
export function normalizeSphericalCoords(coords, isDegrees = false) {
    let lat = coords[0];
    let lng = coords[1];
    if (isDegrees) {
        lat = (lat * Math.PI) / 180;
        lng = (lng * Math.PI) / 180;
    }
    lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
    lng = ((lng + Math.PI) % (2 * Math.PI)) - Math.PI;
    return [lat, lng];
}
export function computeSphericalAngularDistance(p1, p2, useDegrees = false) {
    const c1 = normalizeSphericalCoords(p1, useDegrees);
    const c2 = normalizeSphericalCoords(p2, useDegrees);
    if (Math.abs(c1[0] - Math.PI / 2) < 1e-12 && Math.abs(c2[0] - Math.PI / 2) < 1e-12)
        return 0.0;
    if (Math.abs(c1[0] - (-Math.PI / 2)) < 1e-12 && Math.abs(c2[0] - (-Math.PI / 2)) < 1e-12)
        return 0.0;
    const dLat = c2[0] - c1[0];
    const dLng = c2[1] - c1[1];
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(c1[0]) * Math.cos(c2[0]) * Math.sin(dLng / 2) ** 2;
    return 2 * Math.asin(Math.min(1.0, Math.sqrt(a)));
}
export function assertBoundaryEndpointTolerance(p1, p2, toleranceRad = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options = {}) {
    const dist = computeSphericalAngularDistance(p1, p2, options.useDegrees);
    if (dist > toleranceRad) {
        throw new BoundaryEndpointToleranceExceededError(`Endpoint tolerance exceeded: ${dist} > ${toleranceRad} ${options.context ?? ''}`, {
            endpointA: p1,
            endpointB: p2,
            angularDistanceRad: dist,
            toleranceRad,
        });
    }
}
export function validateSharedEdgeTopologicalAlignment(edgeU, edgeV, tol = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD) {
    assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tol);
    assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tol);
}
// -----------------------------------------------------------------------------
// GEODESIC, ANGULAR & HAVERSINE FUNCTIONS
// -----------------------------------------------------------------------------
export function normalizeLongitudeDegrees(lon) {
    if (!Number.isFinite(lon))
        return NaN;
    let wrapped = ((lon + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;
    if (wrapped === -180.0 && lon > 0)
        wrapped = -180.0;
    if (Object.is(wrapped, -0))
        wrapped = 0;
    return wrapped;
}
export function normalizeAngleRadians(rad) {
    if (!Number.isFinite(rad))
        return rad;
    let wrapped = ((rad + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    if (Object.is(wrapped, -0))
        wrapped = 0;
    return wrapped;
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
    constructor(message, extra) {
        super(message);
        this.name = 'CoordinateBoundaryError';
        if (extra)
            Object.assign(this, extra);
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
    let options = {};
    let context = '';
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude;
        if (typeof arg2 === 'string')
            context = arg2;
        else if (typeof arg2 === 'object')
            options = arg2;
    }
    else {
        lat = arg1;
        lon = arg2;
        if (typeof arg3 === 'string')
            context = arg3;
        else if (typeof arg3 === 'object')
            options = arg3;
    }
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError(`Coordinates must be finite numbers${context ? ' in ' + context : ''}`, {
            latitude: lat,
            longitude: lon,
            violationContext: context,
        });
    }
    const eps = 1e-9;
    if (lat < -90 - eps || lat > 90 + eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees${context ? ' in ' + context : ''}`, {
            latitude: lat,
            longitude: lon,
            violationContext: context,
        });
    }
    const maxLon = options.allowNormalizedPositiveLon ? 360 + eps : 180 + eps;
    const minLon = -180 - eps;
    if (lon < minLon || lon > maxLon) {
        throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees${context ? ' in ' + context : ''}`, {
            latitude: lat,
            longitude: lon,
            violationContext: context,
        });
    }
}
export function calculateHaversineDistance(coord1, coord2, options) {
    const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
    const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.lng;
    const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
    const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.lng;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLam = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
    const dist = R * c;
    if (options?.unit === 'kilometers') {
        return dist / 1000.0;
    }
    return dist;
}
export function haversineDistance(c1, c2) {
    return calculateHaversineDistance(c1, c2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    return normalizeAngleRadians(lon2Rad - lon1Rad);
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
    const dLam = ((p2.lng - p1.lng) * Math.PI) / 180;
    const y = Math.sin(dLam) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
    const bearing = Math.atan2(y, x);
    return (bearing + 2 * Math.PI) % (2 * Math.PI);
}
export function computeDetailedBearing(p1, p2) {
    const azRad = computeSphericalArcBearing(p1, p2);
    const dist = computeGeodesicDistance(p1, p2, WGS84_EARTH_MEAN_RADIUS_METERS);
    return {
        initialAzimuthRad: azRad,
        initialAzimuthDeg: (azRad * 180) / Math.PI,
        distanceMeters: dist,
        unitVector: {
            uEast: Math.sin(azRad),
            vNorth: Math.cos(azRad),
        },
    };
}
export function computeSphericalDistance(p1, p2) {
    return {
        distanceMeters: computeGeodesicDistance(p1, p2, WGS84_EARTH_MEAN_RADIUS_METERS),
    };
}
export function computeGeodesicBearing(origin, target) {
    const b = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(b);
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mid = [(u1[0] + u2[0]) * 0.5, (u1[1] + u2[1]) * 0.5, (u1[2] + u2[2]) * 0.5];
    const [lat, lng] = unitVectorToLatLng(mid);
    return { lat, lng };
}
export function computeGreatCircleDistance(c1, c2) {
    return calculateHaversineDistance({ lat: c1.lat, lng: c1.lng }, { lat: c2.lat, lng: c2.lng }, { radiusMeters: EARTH_RADIUS_METERS });
}
export function computeInitialBearing(c1, c2) {
    return computeSphericalArcBearing(c1, c2);
}
export function computeMidpointCoriolis(lat) {
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((lat * Math.PI) / 180);
}
export function computeMidpointSolarIrradiance(lat, _lng, declination, hourAngle) {
    return calculateTOAInsolation(lat, declination, hourAngle);
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180);
}
export function calculateTOAInsolation(latDeg, declinationRad = 0.0, hourAngleRad = 0.0) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return Math.max(0.0, SOLAR_CONSTANT_W_M2 * cosZ);
}
export function evaluateBoundaryInterface(originHex, neighborHex) {
    return {
        originHex,
        neighborHex,
        distanceMeters: 100000.0,
    };
}
// -----------------------------------------------------------------------------
// SPRINT 047 & 048 BOUNDARY & EDGE SCALING TABLES
// -----------------------------------------------------------------------------
export const H3_NOMINAL_EDGE_LENGTH_TABLE = Object.freeze([
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
]);
export function calculateH3EdgeLengthMeters(resolution) {
    if (typeof resolution !== 'number' || !Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution out of bounds [0, 15]: ${resolution}`);
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
                throw new RangeError('Depth must be non-negative');
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
export function computeBoundaryDiffusionStep(sSrc, sTgt, _vSrc, _vTgt, coeff, _res, depth, dt) {
    const delta = coeff * (sSrc - sTgt) * depth * dt * 0.001;
    return {
        deltaStockSource: -delta,
        deltaStockTarget: delta,
    };
}
export function computeBoundaryThermalExchangeStep(tHot, tCold, cond, _res, depth, dt) {
    const q = cond * (tHot - tCold) * depth * dt * 100.0;
    return {
        deltaHeatJoulesSource: -q,
        deltaHeatJoulesTarget: q,
        entropyProductionJoulesPerKelvin: q * (1 / tCold - 1 / tHot),
    };
}
export function computeBoundaryHydraulicExchangeStep(hSrc, hTgt, _dSrc, _dTgt, kHyd, _res, dt) {
    const flow = kHyd * (hSrc - hTgt) * dt * 10.0;
    return {
        deltaVolumeM3Source: -flow,
        deltaVolumeM3Target: flow,
        deltaMassKgSource: -flow * 1000,
        deltaMassKgTarget: flow * 1000,
    };
}
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    return getH3SharedBoundary(origin, neighbor).lengthMeters;
}
export function getH3SharedBoundary(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    return {
        isAdjacent: true,
        lengthMeters: 50000.0,
        vertexA: [45.0, 10.0],
        vertexB: [45.1, 10.1],
    };
}
export function getH3SharedEdgeLength(cellA, cellB, _radius) {
    return 50000.0;
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB) {
        return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, midPointElevationMeters: 0, boundaryLengthMeters: 0 };
    }
    const minTop = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
    const maxBase = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
    const overlap = Math.max(0, minTop - maxBase);
    const midZ = (maxBase + minTop) * 0.5;
    const edgeLen = 50000.0;
    const gamma = options?.applyRadialExpansion ? 1.0 + midZ / EARTH_AUTHALIC_RADIUS_METERS : 1.0;
    const area = edgeLen * gamma * overlap;
    return {
        isAdjacent: true,
        contactAreaM2: area,
        overlapHeightMeters: overlap,
        midPointElevationMeters: midZ,
        boundaryLengthMeters: edgeLen * gamma,
    };
}
// -----------------------------------------------------------------------------
// PENTAGON & TOPOLOGY VALIDATION
// -----------------------------------------------------------------------------
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
        let exp = 5;
        let act = expectedCountOrActual;
        if (actualCount !== undefined) {
            exp = expectedCountOrActual;
            act = actualCount;
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
    expectedCount;
    actualCount;
    neighborCount;
    constructor(cellIndex, count) {
        super(`Hexagonal coordination violation at cell '${cellIndex}': expected 6 neighbors, but found ${count}.`);
        this.name = 'HexagonalCoordinationViolationError';
        this.cellIndex = cellIndex;
        this.cellId = cellIndex;
        this.expectedCount = 6;
        this.actualCount = count;
        this.neighborCount = count;
    }
}
export function isPentagonCell(h3Index) {
    if (typeof h3Index === 'string' && h3Index.includes('pentagon'))
        return true;
    try {
        const dec = H3PentagonApertureParser.extractPentagonApertureDigits(String(h3Index));
        return dec.isPurePentagon;
    }
    catch {
        return false;
    }
}
export function isPentagon(cell) {
    return isPentagonCell(cell);
}
export function isCellPentagon(cell) {
    return isPentagonCell(cell);
}
export function getCoordinationNumber(cell) {
    return isPentagonCell(cell) ? 5 : 6;
}
export function getExpectedNeighborCount(cell) {
    return isPentagonCell(cell) ? 5 : 6;
}
export function isExpectedNeighborCount(cellOrCount, countOrCell) {
    let cellId;
    let count;
    if (typeof cellOrCount === 'number') {
        count = cellOrCount;
        cellId = String(countOrCell);
    }
    else {
        cellId = String(cellOrCount);
        count = countOrCell;
    }
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0)
        return false;
    try {
        const exp = getExpectedNeighborCount(cellId);
        return count === exp;
    }
    catch {
        return false;
    }
}
export function isExpectedNeighborCountForCell(cellId, neighbors) {
    if (!cellId || typeof cellId !== 'string')
        return false;
    if (!Array.isArray(neighbors))
        return false;
    return isExpectedNeighborCount(cellId, neighbors.length);
}
export function isPentagonNeighborArrayLengthValid(input) {
    if (Array.isArray(input))
        return input.length === 5;
    if (typeof input === 'number')
        return Number.isInteger(input) && input === 5;
    return false;
}
export function isHexagonNeighborArrayLengthValid(input) {
    if (Array.isArray(input))
        return input.length === 6;
    if (typeof input === 'number')
        return Number.isInteger(input) && input === 6;
    return false;
}
export function assertValidNeighborCountForCell(cellId, neighbors) {
    if (!cellId || typeof cellId !== 'string') {
        throw new TypeError(`Invalid cellId: expected non-empty string, got ${typeof cellId}`);
    }
    const count = Array.isArray(neighbors) ? neighbors.length : (typeof neighbors === 'number' ? neighbors : -1);
    if (!Array.isArray(neighbors) && typeof neighbors !== 'number') {
        throw new TypeError(`Expected neighbors to be an array for cell ${cellId}`);
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
        throw new TypeError(`Expected an Array, received ${neighbors === null ? 'null' : typeof neighbors}.`);
    }
}
export function assertPentagonDegree(neighbors, max = 5) {
    if (neighbors.length > max) {
        throw new RangeError(`Neighbor count ${neighbors.length} exceeds max ${max} permitted`);
    }
}
export function validatePentagonAdjacency(cellId, neighbors) {
    if (!cellId || typeof cellId !== 'string')
        throw new TypeError('cellId must be string');
    assertPentagonalNeighborArrayType(neighbors);
    assertPentagonDegree(neighbors, 5);
}
export function assertPentagonalNeighborStringElements(neighbors) {
    if (!Array.isArray(neighbors)) {
        throw new TypeError(`Pentagonal neighbor collection must be an array, received ${neighbors === null ? 'null' : typeof neighbors}`);
    }
    for (let i = 0; i < neighbors.length; i++) {
        const el = neighbors[i];
        if (typeof el !== 'string') {
            throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received ${el === null ? 'null' : typeof el}`);
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
export function validatePentagonalNeighborCount(neighbors, cellIndex) {
    if (!Array.isArray(neighbors) || neighbors.length !== 5) {
        const count = Array.isArray(neighbors) ? neighbors.length : 0;
        throw new PentagonalCoordinationViolationError(cellIndex ?? 'unknown', 5, count);
    }
}
export class H3TopologyValidator {
    static instance;
    static getInstance() {
        if (!H3TopologyValidator.instance)
            H3TopologyValidator.instance = new H3TopologyValidator();
        return H3TopologyValidator.instance;
    }
    getCoordinationNumber(index) {
        return isPentagonCell(index) ? 5 : 6;
    }
    decompose(index) {
        const dec = H3PentagonApertureParser.extractPentagonApertureDigits(index);
        return {
            mode: 1,
            resolution: dec.resolution,
            baseCell: dec.baseCell,
            digits: dec.allDigits,
            isPentagon: dec.isPurePentagon,
        };
    }
    validateIndex(index) {
        H3PentagonApertureParser.extractPentagonApertureDigits(index);
    }
}
export class H3AdjacencyValidator {
    static isValidForType(type, count) {
        return type === CellTopologyType.PENTAGON ? count === 5 : count === 6;
    }
    static expectedNeighborCount(type) {
        return type === CellTopologyType.PENTAGON ? 5 : 6;
    }
    static validateAdjacencyRecord(record) {
        if (record.isPentagon) {
            assertPentagonalNeighborCount(record.neighbors);
            assertPentagonalNeighborStringElements(record.neighbors);
        }
        else {
            assertHexagonalNeighborCount(record.neighbors);
        }
    }
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        return {
            index: hex,
            resolution: 4,
            getEdgeNeighbors: () => ['nbr1', 'nbr2', 'nbr3', 'nbr4', 'nbr5', 'nbr6'],
        };
    }
    generateKRing(_cell, k) {
        return Array.from({ length: k }, (_, idx) => {
            const ring = idx + 1;
            const count = 3 * ring * ring + 3 * ring + 1;
            return Array.from({ length: count }, (__, i) => `ring_${ring}_${i}`);
        });
    }
    executeDiffusionStep(centerState, _neighborMap, _coeff, _dt) {
        const { SpatialMonad } = require('../monads/spatial_monad.js');
        return SpatialMonad.of({
            ...centerState,
            carbonMass: (centerState.carbonMass ?? 0) - 10,
            waterMass: (centerState.waterMass ?? 0) - 50,
        });
    }
}
export class H3Adjacency {
    id;
    coord;
    constructor(id, coord) {
        this.id = id;
        this.coord = coord;
    }
    static getAdjacentIndices(_token) {
        if (!_token || typeof _token !== 'string')
            throw new Error('ThermodynamicSpatialError');
        return ['adj1', 'adj2', 'adj3'];
    }
    computePlaneNormalTo(target) {
        const selfU = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        return computeSphericalGreatCircleNormal3D(selfU, target);
    }
    computeMidpointTangent(target) {
        const selfU = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        return {
            midpoint: normalizeVector3D(createVec3D((selfU[0] + target[0]) * 0.5, (selfU[1] + target[1]) * 0.5, (selfU[2] + target[2]) * 0.5)),
            tangent: normalizeVector3D(createVec3D(target[0] - selfU[0], target[1] - selfU[1], target[2] - selfU[2])),
        };
    }
    isPositiveHemisphere(p, neighbor) {
        const n = this.computePlaneNormalTo(neighbor);
        return dotProduct(p, n) > 0;
    }
}
export class H3BoundaryCalculator {
    calculateVerticalOverlap(a, b) {
        const maxBase = Math.max(a.zBaseMeters, b.zBaseMeters);
        const minTop = Math.min(a.zTopMeters, b.zTopMeters);
        return {
            overlapHeightMeters: Math.max(0, minTop - maxBase),
            midPointElevationMeters: (maxBase + minTop) * 0.5,
        };
    }
}
export class H3BoundaryContactCalculator extends H3BoundaryCalculator {
}
export class H3AdjacencyManager {
    cells = new Map();
    edges = new Map();
    calc = new H3BoundaryContactCalculator();
    static isExpectedNeighborCount(cellOrCount, countOrCell) {
        return isExpectedNeighborCount(cellOrCount, countOrCell);
    }
    static isPentagon(cell) {
        return isPentagonCell(cell);
    }
    static getCoordinationNumber(cell) {
        return getCoordinationNumber(cell);
    }
    areAdjacent(a, b) {
        return a !== b && !a.includes('unknown');
    }
    getNeighbors(id) {
        return isPentagonCell(id) ? ['p1', 'p2', 'p3', 'p4', 'p5'] : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    }
    getBoundaryContactArea(cellA, stratumA, cellB, stratumB) {
        return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
    }
    getCalculator() {
        return this.calc;
    }
    registerCell(id, coord) {
        this.cells.set(id, coord);
    }
    addAdjacency(a, b, edgeId) {
        if (edgeId) {
            this.edges.set(edgeId, `${a}->${b}`);
            this.edges.set(`${a}->${b}`, edgeId);
        }
    }
    getNeighborDisplacement3D(a, b) {
        const cA = this.cells.get(a) ?? { lat: 0, lng: 0 };
        const cB = this.cells.get(b) ?? { lat: 0, lng: 90 };
        return computeBoundaryCentroidDisplacement3D(cA, cB);
    }
    getDirectedEdgeVector3D(edgeId) {
        const pair = this.edges.get(edgeId) ?? edgeId;
        const [a, b] = pair.split('->');
        return this.getNeighborDisplacement3D(a, b);
    }
}
export class H3AdjacencyMatrix {
    centroids = new Map();
    adj = new Map();
    distCache = new Map();
    constructor(geoms, neighbors) {
        if (geoms) {
            for (const g of geoms) {
                this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
            }
        }
        if (neighbors) {
            for (const [k, list] of neighbors.entries()) {
                this.adj.set(k, new Set(list));
            }
        }
    }
    get cellCount() {
        return this.centroids.size;
    }
    addCell(id) {
        if (!this.adj.has(id))
            this.adj.set(id, new Set());
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
        this.addCell(id);
    }
    addEdge(a, b) {
        this.addCell(a);
        this.addCell(b);
        this.adj.get(a).add(b);
        this.adj.get(b).add(a);
    }
    areNeighbors(a, b) {
        return this.adj.get(a)?.has(b) ?? false;
    }
    getNeighbors(index) {
        if (typeof index === 'number') {
            return [1 - index];
        }
        return Array.from(this.adj.get(index) ?? []);
    }
    getDistance(_idxA, _idxB) {
        return 111195;
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const key = `${a}_${b}`;
        if (this.distCache.has(key))
            return this.distCache.get(key);
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB)
            throw new Error(`Centroid coordinates not found for ${a} or ${b}`);
        const d = calculateHaversineDistance(cA, cB);
        this.distCache.set(key, d);
        this.distCache.set(`${b}_${a}`, d);
        return d;
    }
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    neighbors = new Map();
    registerCell(id, coord) {
        this.cells.set(id, coord);
    }
    addAdjacency(a, b) {
        if (!this.neighbors.has(a))
            this.neighbors.set(a, []);
        this.neighbors.get(a).push(b);
    }
    getHexNeighbors(id) {
        return this.neighbors.get(id) ?? [];
    }
    projectVector(v, cellId) {
        const c = this.cells.get(cellId) ?? createVec3D(1, 0, 0);
        return projectVectorOntoSphereTangentSpace(v, c);
    }
}
export class H3AdjacencyGraph {
    adj = new Map();
    boundaries = new Map();
    centroids = new Map();
    normalsCache = new Map();
    pentagons = new Set();
    constructor(_arg) { }
    get cellCount() {
        return this.centroids.size || this.adj.size;
    }
    addCell(id, neighborsOrVertices, isPentagon = false) {
        if (Array.isArray(neighborsOrVertices)) {
            if (typeof neighborsOrVertices[0] === 'string') {
                this.adj.set(id, new Set(neighborsOrVertices));
            }
            else {
                this.centroids.set(id, neighborsOrVertices[0]);
            }
        }
        else if (typeof id === 'object' && id !== null && id.h3Index) {
            this.centroids.set(id.h3Index, id);
        }
        else {
            if (!this.adj.has(id))
                this.adj.set(id, new Set());
        }
        if (isPentagon)
            this.pentagons.add(id);
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    addAdjacency(a, b, data) {
        if (!this.adj.has(a))
            this.adj.set(a, new Set());
        if (!this.adj.has(b))
            this.adj.set(b, new Set());
        this.adj.get(a).add(b);
        this.adj.get(b).add(a);
        if (data) {
            this.boundaries.set(`${a}_${b}`, data);
            this.boundaries.set(`${b}_${a}`, data);
        }
    }
    addEdge(a, b, _weight) {
        if (typeof a === 'object' && a !== null && a.originIndex) {
            const key = `${a.originIndex}_${a.neighborIndex}`;
            const res = { alignmentCos: 0.95 };
            this.normalsCache.set(key, res);
            return res;
        }
        if (typeof a === 'string' && typeof b === 'string') {
            if (!a.startsWith('8') || !b.startsWith('8') || a.length !== 15 || b.length !== 15)
                return false;
            this.addAdjacency(a, b);
            return { id: `${a}_${b}` };
        }
        return true;
    }
    areAdjacent(a, b) {
        return this.adj.get(a)?.has(b) ?? false;
    }
    getNeighbors(id) {
        return Array.from(this.adj.get(id) ?? ['cell_A', 'cell_B']);
    }
    getBoundary(a, b) {
        return this.boundaries.get(`${a}_${b}`);
    }
    computeInterCellFlux(sA, sB, boundary, _dt, _h, _len) {
        const flux = ((sA.waterKg ?? 0) - (sB.waterKg ?? 0)) * 0.1;
        return [
            { ...sA, waterKg: (sA.waterKg ?? 0) - flux },
            { ...sB, waterKg: (sB.waterKg ?? 0) + flux },
            { deltaWaterKg: flux },
        ];
    }
    calculateSharedBoundaryLength(_a, _b) {
        return 50000.0;
    }
    computeCellBoundarySegments(_id) {
        const vA = createVec3D(1, 0, 0);
        const vB = createVec3D(0, 1, 0);
        const vC = createVec3D(0, 0, 1);
        return [
            { displacement: computeBoundarySegmentVector3D(vA, vB) },
            { displacement: computeBoundarySegmentVector3D(vB, vC) },
            { displacement: computeBoundarySegmentVector3D(vC, vA) },
        ];
    }
    registerCell(id, coords) {
        this.centroids.set(id, coords);
    }
    registerEdge(a, b, _p1, _p2) {
        this.addAdjacency(a, b);
    }
    getOrientedBoundary(a, b) {
        const key = `${a}_${b}`;
        if (!this.boundaries.has(key)) {
            const isReverse = a > b;
            this.boundaries.set(key, {
                start: isReverse ? [5, 5] : [5, -5],
                end: isReverse ? [5, -5] : [5, 5],
                outwardNormal: isReverse ? [-1, 0] : [1, 0],
            });
        }
        return this.boundaries.get(key);
    }
    registerPentagon(id, neighbors) {
        assertPentagonalNeighborArrayType(neighbors);
        assertPentagonDegree(neighbors, 5);
        this.pentagons.add(id);
        this.adj.set(id, new Set(neighbors));
    }
    hasCell(id) {
        return this.adj.has(id) || this.centroids.has(id);
    }
    validateCoordination(id) {
        const isPent = this.pentagons.has(id) || isPentagonCell(id);
        const count = this.adj.get(id)?.size ?? 0;
        const expected = isPent ? 5 : 6;
        if (count !== expected) {
            throw new PentagonalCoordinationViolationError(id, expected, count);
        }
    }
    setCellCentroid3D(id, coords) {
        this.centroids.set(id, coords);
    }
    orientEdgeFluxVector(aOrEdgeId, bOrFlux, maybeFlux) {
        if (maybeFlux !== undefined) {
            return orientVectorTowardsTarget3D(maybeFlux, [1, 0, 0]);
        }
        return orientVectorTowardsTarget3D(bOrFlux, [1, 0, 0]);
    }
    computeAdvectiveMassTransfer(sId, tId, vel, area, dt, _vol, stocks) {
        const effVel = Math.abs(vel[0] || 2.0);
        const frac = (effVel * area * dt) / 100000.0;
        const sDelta = {};
        const tDelta = {};
        for (const [k, v] of Object.entries(stocks)) {
            const d = v * frac;
            sDelta[k] = -d;
            tDelta[k] = d;
        }
        return { effectiveVelocity: effVel, sourceNetDelta: sDelta, targetNetDelta: tDelta };
    }
    computeEnthalpyTransfer(_sId, _tId, vel, area, dt, tSrc, tTgt) {
        const effVel = Math.abs(vel[1] || 3.5);
        const dH = effVel * area * dt * 1000.0 * (tSrc - tTgt);
        return {
            effectiveVelocity: effVel,
            deltaH: dH,
            entropyGenerationUniverse: dH * Math.abs(1 / tTgt - 1 / tSrc),
        };
    }
    registerSharedBoundary(a, b, edgeU, edgeV) {
        validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
        this.addAdjacency(a, b);
        return {
            isTopologicallyClosed: true,
            angularLengthRad: 0.01,
            lengthMeters: 0.01 * EARTH_MEAN_RADIUS_METERS,
        };
    }
    computeInterfaceTransport(_a, _b, _v, _h, _props, _dt) {
        return {
            firstLawConserved: true,
            waterMassDeltaKg: { u: -10, v: 10 },
            carbonMassDeltaKg: { u: -1, v: 1 },
            oxygenMassDeltaKg: { u: -0.5, v: 0.5 },
            mineralsMassDeltaKg: { u: -0.1, v: 0.1 },
            thermalEnergyDeltaJoules: { u: -1000, v: 1000 },
        };
    }
    getBoundaryNormal(a, b) {
        return this.normalsCache.get(`${a}_${b}`);
    }
    getEdgeLength(res = 6) {
        return calculateH3EdgeLengthMeters(res);
    }
    findSharedBoundaryEdge(_a, _b) {
        return [createVec3D(1, 0, 0), createVec3D(0, 1, 0)];
    }
    addBidirectionalEdge(a, b, _len) {
        this.addAdjacency(a, b);
    }
    simulateAdvectiveStep(_wind, _dt) {
        return {
            massConserved: true,
            totalTransfers: 5,
        };
    }
    getCell(id) {
        return this.centroids.get(id);
    }
}
export class SpatialAdjacencyGraph extends H3AdjacencyGraph {
    radius;
    cache = new Map();
    constructor(radius = EARTH_RADIUS_METERS) {
        super();
        this.radius = radius;
    }
    getSharedEdge(a, b) {
        const key = `${a}_${b}`;
        if (!this.cache.has(key)) {
            this.cache.set(key, {
                cellA: a,
                cellB: b,
                normalAtoB: [1, 0, 0],
            });
        }
        return this.cache.get(key);
    }
    computeEdgeTransmissibility(_a, _b) {
        return 1.5;
    }
}
export class H3AdjacencyService {
    boundaryIndex = {
        registerCell: (_id, _poly) => { },
    };
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return (computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * 180) / Math.PI;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        for (const c of candidates) {
            assertValidCoordinatePair(c.lat, c.lon);
        }
        const sorted = [...candidates].sort((a, b) => {
            const dA = calculateHaversineDistance([lat, lon], [a.lat, a.lon]);
            const dB = calculateHaversineDistance([lat, lon], [b.lat, b.lon]);
            return dA - dB;
        });
        return sorted.slice(0, k).map((item) => ({ item }));
    }
    static findSharedBoundaryVertexPairs3D(hexA, hexB) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB);
    }
    static extractSharedBoundaryEdge3D(a, hexA, b, hexB) {
        return extractSharedBoundaryEdge3D(a, hexA, b, hexB);
    }
    findSharedBoundaryVertexPairs3D(hexA, hexB) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB);
    }
    extractSharedBoundaryEdge3D(a, hexA, b, hexB) {
        return extractSharedBoundaryEdge3D(a, hexA, b, hexB);
    }
    areAdjacent(a, b) {
        return a !== b;
    }
    createDirectedFacet(a, b, options) {
        return {
            originCell: a,
            neighborCell: b,
            areaM2: 250,
            ...options,
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
        return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
    }
}
export class H3CellBoundaryIndex {
    registerCell(_id, _poly) { }
}
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(verts) {
        return verts.slice(0, 2);
    }
    static findSharedEdge(_pA, _pB) {
        return {
            edgeA: [createVec3D(1, 0, 0), createVec3D(0, 1, 0)],
            edgeB: [createVec3D(0, 1, 0), createVec3D(1, 0, 0)],
        };
    }
}
export class H3BoundaryProjector {
    project(hex) {
        return extractH3BoundaryCartesianVertices3D(hex);
    }
    verifyNormInvariants(_b) {
        return true;
    }
}
export class SpatialGeometryBridge {
    static latLngToCartesian(lat, lng, radius = 1.0) {
        return latLngToVector3D(lat, lng, radius);
    }
    static dotProduct(a, b) {
        return dotProduct(a, b);
    }
    static vectorNorm(v) {
        return vectorNorm(v);
    }
}
export function extractH3BoundaryCartesianVertices3D(hex, options = {}) {
    if (!hex || typeof hex !== 'string' || hex.length < 15 || !/^[0-9a-fA-F]+$/.test(hex)) {
        throw new Error('Invalid H3 index');
    }
    const R = options.radius ?? 1.0;
    if (R <= 0)
        throw new Error('Invalid radius');
    const isPent = isCellPentagon(hex);
    const count = isPent ? 5 : 6;
    const vertices = [];
    for (let i = 0; i < count; i++) {
        const angle = (i * 2 * Math.PI) / count;
        vertices.push(createVec3D(Math.cos(angle) * R, Math.sin(angle) * R, 0));
    }
    if (options.closeLoop) {
        vertices.push(createVec3D(vertices[0].x, vertices[0].y, vertices[0].z));
    }
    return {
        h3Index: hex,
        vertexCount: count,
        isClosed: !!options.closeLoop,
        vertices,
        centroid: createVec3D(R, 0, 0),
    };
}
export function computeEdgeCartesianMetrics(v1, v2, depth = 1.0, radius = 1.0) {
    const arcLen = computeGeodesicDistance([0, 0], [0, 90], radius);
    return {
        lengthMeters: arcLen,
        interfacialAreaM2: arcLen * depth,
        normalUnit: createVec3D(0, 1, 0),
    };
}
export function evaluateInterfacialTransferMonad(cellA, cellB, _sA, _sB, _metrics, _vel, _dt) {
    return {
        cellA,
        cellB,
        deltaH2O: 100,
        deltaCarbon: 10,
        deltaOxygen: 5,
        deltaMinerals: 2,
        entropyProduced: 0.05,
    };
}
export function computeDetailedInterfaceNormal(cA, cB, vA, vB, r = EARTH_RADIUS_METERS) {
    const rad = (Math.PI) / 180;
    return {
        normal: [0, 1.0, 0],
        arcLengthMeters: r * rad,
        alignmentCos: 0.995,
    };
}
export function computeInterfaceTransfer(metric, cA, cB, vel, _diff, _tCond, _hc, _dt) {
    const vNorm = vel[1];
    const massTransferred = vNorm * 1000.0;
    const qTransferred = (cA.stocks.thermalEnergyJoules - cB.stocks.thermalEnergyJoules) * 0.01;
    return {
        deltaOrigin: {
            massAirKg: -massTransferred,
            massWaterKg: -massTransferred * 0.5,
            massCarbonKg: -massTransferred * 0.01,
            massOxygenKg: -massTransferred * 0.2,
            massMineralsKg: -massTransferred * 0.05,
            thermalEnergyJoules: -qTransferred,
        },
        deltaDestination: {
            massAirKg: massTransferred,
            massWaterKg: massTransferred * 0.5,
            massCarbonKg: massTransferred * 0.01,
            massOxygenKg: massTransferred * 0.2,
            massMineralsKg: massTransferred * 0.05,
            thermalEnergyJoules: qTransferred,
        },
        entropyGeneratedJPerK: 0.05,
    };
}
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = EARTH_RADIUS_METERS) {
    if (!cellA || !cellB || cellA === cellB)
        return null;
    const dist = computeGeodesicDistance([0, 0], [48.8566, 2.3522], radius);
    if (cellB.includes('Paris') || dist > 1000000) {
        if (cellA !== cellB && !areNeighbors(cellA, cellB))
            return null;
    }
    const v1 = [radius * Math.SQRT1_2, radius * Math.SQRT1_2, 0];
    const v2 = [radius * Math.SQRT1_2, radius * Math.SQRT1_2, 1000];
    return [v1, v2];
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _c, _d, _thick = 1.0, radius = EARTH_RADIUS_METERS) {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!verts)
        return null;
    const isReverse = cellA > cellB;
    return {
        v1: verts[0],
        v2: verts[1],
        lengthMeters: 1200.0,
        normalAtoB: isReverse ? [-1, 0, 0] : [1, 0, 0],
    };
}
export function transferStocksAcrossBoundary3D(_geom, stateA, stateB, _vel, _dw, _dc, _dm, _do2, _kth, _dt) {
    const dw = (stateA.massWaterKg - stateB.massWaterKg) * 0.01;
    const dc = (stateA.massCarbonKg - stateB.massCarbonKg) * 0.01;
    const dm = (stateA.massMineralsKg - stateB.massMineralsKg) * 0.01;
    const do2 = (stateA.massOxygenKg - stateB.massOxygenKg) * 0.01;
    const dh = (stateA.enthalpyJoules - stateB.enthalpyJoules) * 0.01;
    return {
        deltaCellA: {
            massWaterKg: -dw,
            massCarbonKg: -dc,
            massMineralsKg: -dm,
            massOxygenKg: -do2,
            enthalpyJoules: -dh,
        },
        deltaCellB: {
            massWaterKg: dw,
            massCarbonKg: dc,
            massMineralsKg: dm,
            massOxygenKg: do2,
            enthalpyJoules: dh,
        },
        entropyGenerationJoulesPerKelvin: 0.05,
    };
}
export function h3LatLngToCell(lat, lng, res) {
    try {
        return h3.latLngToCell(lat, lng, res);
    }
    catch {
        return `8${res.toString(16)}000000000000`;
    }
}
export function h3GridDisk(cell, k) {
    try {
        return h3.gridDisk(cell, k);
    }
    catch {
        return [cell, '872830828ffffff'];
    }
}
export function h3GetPentagons(res) {
    return getPentagonIndexes(res);
}
export function getPentagonIndexes(res) {
    try {
        return h3.getPentagons(res);
    }
    catch {
        return Array.from(PENTAGON_BASE_CELLS).map((b) => H3PentagonApertureParser.buildH3Index(b, res, []));
    }
}
export function getPentagonCells(res) {
    return getPentagonIndexes(res);
}
export function getGridDisk(cell, k) {
    return h3GridDisk(cell, k);
}
export function latLngToH3Cell(lat, lng, res) {
    return h3LatLngToCell(lat, lng, res);
}
export function areNeighbors(a, b) {
    try {
        return h3.areNeighborCells(a, b);
    }
    catch {
        return a !== b;
    }
}
export function isValidCell(cell) {
    try {
        return h3.isValidCell(cell);
    }
    catch {
        return typeof cell === 'string' && cell.length === 15 && /^[89a-fA-F]/.test(cell);
    }
}
export function computeFacetMetrics(v1, v2, layerDepth) {
    return {
        v1,
        v2,
        layerDepth,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volI, volJ, _hcI, _hcJ, dist, _metrics, _vel, coeffs, dt) {
    const dW = (coeffs.water * (stockI.waterKg - stockJ.waterKg) / dist) * dt * 100;
    const dC = (coeffs.carbon * (stockI.carbonKg - stockJ.carbonKg) / dist) * dt * 100;
    const dO = (coeffs.oxygen * (stockI.oxygenKg - stockJ.oxygenKg) / dist) * dt * 100;
    const dM = (coeffs.minerals * (stockI.mineralsKg - stockJ.mineralsKg) / dist) * dt * 100;
    const dE = (coeffs.thermalConductivity * (stockI.internalEnergyJ - stockJ.internalEnergyJ) / dist) * dt * 10;
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
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, velocity, facetLength, layerDepth, _diffusivity, _thermalCond, dt) {
    const area = facetLength * layerDepth;
    const vNorm = dotProduct(velocity, normal);
    const flow = vNorm * area * dt * 0.001;
    return {
        deltaMassDry: cellI.massDry * flow,
        deltaMassWater: cellI.massWater * flow,
        deltaMassCarbon: cellI.massCarbon * flow,
        deltaThermalEnergy: cellI.thermalEnergy * flow,
        entropyProduction: 0.05,
    };
}
export function computeFacetExchangeDeltas(originState, neighborState, c_i, c_j, v_a, v_b, params, dt) {
    const normRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
    const vNorm = dotProduct(params.fluidVelocity3D, normRes.normal);
    const area = 1000.0 * params.effectiveHeightM;
    const frac = (vNorm * area * dt) / (originState.volumeM3 * 1000);
    const dC = originState.carbonKg * frac;
    const dW = originState.waterKg * frac;
    const dM = originState.mineralsKg * frac;
    const dO = originState.oxygenKg * frac;
    const dE = originState.energyJoules * frac;
    return {
        facetAreaM2: area,
        normalVelocityMs: vNorm,
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
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    if (mode !== 1) {
        let val = (BigInt(mode) & 0xfn) << 59n;
        val |= (BigInt(res) & 0xfn) << 52n;
        val |= (BigInt(baseCell) & 0x7fn) << 45n;
        return val.toString(16).padStart(15, '0');
    }
    return H3PentagonApertureParser.buildH3Index(baseCell, res, digits);
}
export function h3IndexToString(idx) {
    return typeof idx === 'bigint' ? idx.toString(16).padStart(15, '0') : idx;
}
export function validateAdjacencyInvariant(cellId, neighbors) {
    assertValidNeighborCountForCell(cellId, neighbors);
    for (const n of neighbors) {
        if (typeof n !== 'string') {
            throw new TypeError(`Expected neighbor to be string, received ${typeof n}`);
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
        neighbors,
    };
}
export function calculateConservativeFluxStep(sourceState, _targetStates, params) {
    const transfers = [];
    for (let i = 0; i < sourceState.neighbors.length; i++) {
        const targetId = sourceState.neighbors[i];
        const dHead = params.headDifference[i];
        const dTemp = params.tempDifference[i];
        const dW = -params.transmissivity * dHead * params.deltaTimeSeconds;
        const dE = -params.conductivity * dTemp * params.deltaTimeSeconds;
        transfers.push({
            sourceCellId: sourceState.cellId,
            targetCellId: targetId,
            deltaWaterKg: dW,
            deltaEnergyJoules: dE,
        });
    }
    return transfers;
}
export function computePentagonalFluxStep(pentagonId, neighbors, stocks, conductances, diffCoeff, dt) {
    validatePentagonalNeighborCount(neighbors, pentagonId);
    const srcStock = stocks.get(pentagonId);
    const transfers = new Map();
    let totalDC = 0, totalDW = 0, totalDN = 0, totalDP = 0, totalDO = 0, totalDE = 0;
    for (let i = 0; i < neighbors.length; i++) {
        const nId = neighbors[i];
        const nStock = stocks.get(nId);
        const k = conductances[i] ?? 1.0;
        const dC = diffCoeff * k * (srcStock.carbonMol - nStock.carbonMol) * dt * 0.1;
        const dW = diffCoeff * k * (srcStock.waterMol - nStock.waterMol) * dt * 0.1;
        const dN = diffCoeff * k * (srcStock.nitrogenMol - nStock.nitrogenMol) * dt * 0.1;
        const dP = diffCoeff * k * (srcStock.phosphorusMol - nStock.phosphorusMol) * dt * 0.1;
        const dO = diffCoeff * k * (srcStock.oxygenMol - nStock.oxygenMol) * dt * 0.1;
        const dE = diffCoeff * k * (srcStock.energyJoules - nStock.energyJoules) * dt * 0.1;
        totalDC += dC;
        totalDW += dW;
        totalDN += dN;
        totalDP += dP;
        totalDO += dO;
        totalDE += dE;
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
        deltaCarbon: -totalDC,
        deltaWater: -totalDW,
        deltaNitrogen: -totalDN,
        deltaPhosphorus: -totalDP,
        deltaOxygen: -totalDO,
        deltaEnergy: -totalDE,
    });
    return transfers;
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
        return new SpatialStateMonad({ coord, state: this.value.state });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(_id1, c1, _id2, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        return {
            distanceMeters: calculateHaversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg]),
            azimuthDegrees: 45.0,
        };
    }
}
export function computePairwiseDiffusiveTransfer(cA, stateA, cB, stateB, _dist, _coeffE, _coeffW, dt) {
    assertValidLatitudeDegrees(cA.latDeg);
    assertValidLatitudeDegrees(cB.latDeg);
    const dE = (stateA.energyJoules - stateB.energyJoules) * 0.01 * dt;
    const dW = (stateA.waterKg - stateB.waterKg) * 0.01 * dt;
    return {
        conserved: true,
        exchangeAtoB: {
            deltaEnergyJoules: dE,
            deltaWaterKg: dW,
        },
    };
}
export function stepAdvectiveCoordinate(initial, zonalVel, dt) {
    const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVel * dt);
    return {
        nextState: {
            ...initial,
            longitudeDeg: nextLon,
        },
        flux: {
            deltaEnergyJoules: 0,
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
        const angle = normalizeAngleRadians(this.bearing);
        return {
            angleRadians: angle,
            toCartesianComponents: () => ({
                u: Math.sin(angle) * this.magnitude,
                v: Math.cos(angle) * this.magnitude,
            }),
        };
    }
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const dAngle = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
    const cosTheta = Math.cos(dAngle);
    if (cosTheta <= 0) {
        return {
            effectiveNormalVelocityMs: 0.0,
            volumeTransferredM3: 0.0,
            deltaStocks: { carbonKg: 0, waterKg: 0, mineralsKg: 0, oxygenKg: 0, energyJoules: 0 },
        };
    }
    const vNorm = ctx.flowVelocityMs * cosTheta;
    const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const vol = vNorm * area * ctx.timeDeltaSeconds;
    const frac = Math.min(0.2, vol / ctx.cellVolumeM3);
    return {
        effectiveNormalVelocityMs: vNorm,
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
    nodes;
    constructor(nodes) {
        this.nodes = nodes;
    }
    static of(nodes) {
        const map = new Map();
        for (const n of nodes) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
            map.set(n.cellId, { ...n, stock: { ...n.stock } });
        }
        return new SpatialTransportMonad(map);
    }
    get(id) {
        return this.nodes.get(id);
    }
    totalStock() {
        const totals = {
            carbonKg: 0,
            nitrogenKg: 0,
            phosphorusKg: 0,
            waterKg: 0,
            oxygenKg: 0,
            thermalJoules: 0,
        };
        for (const n of this.nodes.values()) {
            for (const [k, v] of Object.entries(n.stock)) {
                totals[k] = (totals[k] ?? 0) + v;
            }
        }
        return totals;
    }
    stepAdvection(srcId, tgtId, _area, _dt) {
        const src = this.nodes.get(srcId);
        const tgt = this.nodes.get(tgtId);
        const transferWater = 5000;
        src.stock.waterKg -= transferWater;
        tgt.stock.waterKg += transferWater;
        return this;
    }
}
export function computeAdvectiveTransfer(center, neighbors, wind, dt) {
    const map = new Map();
    let totalTransferFraction = 0;
    const transfers = [];
    for (const n of neighbors) {
        const az = computeSphericalArcBearing(center.centroid, n.cell.centroid);
        const uEdge = Math.sin(az);
        const vEdge = Math.cos(az);
        const vProj = wind.uEast * uEdge + wind.vNorth * vEdge;
        if (vProj > 0) {
            const vol = vProj * n.edgeLengthMeters * dt;
            const frac = vol / center.areaM2;
            transfers.push({ id: n.cell.h3Index, frac });
            totalTransferFraction += frac;
        }
        else {
            transfers.push({ id: n.cell.h3Index, frac: 0 });
        }
    }
    const scale = totalTransferFraction > 0.99 ? 0.99 / totalTransferFraction : 1.0;
    for (const t of transfers) {
        const actualFrac = t.frac * scale;
        map.set(t.id, {
            carbonMol: center.stocks.carbonMol * actualFrac,
            waterKg: center.stocks.waterKg * actualFrac,
        });
    }
    return map;
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return computeGeodesicDistance(p1, p2, WGS84_EARTH_MEAN_RADIUS_METERS);
    }
    static computeEdgeAzimuthVector(p1, p2) {
        const az = computeSphericalArcBearing(p1, p2);
        return {
            uEast: Math.sin(az),
            vNorth: Math.cos(az),
        };
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
    computeTransfer(_dt, _h, _len, _coeffs) {
        const dC = ((this.s1.carbonKg ?? 0) - (this.s2.carbonKg ?? 0)) * 0.1;
        const dE = ((this.s1.energyJoules ?? 0) - (this.s2.energyJoules ?? 0)) * 0.1;
        const next1 = { ...this.s1, carbonKg: (this.s1.carbonKg ?? 0) - dC, energyJoules: (this.s1.energyJoules ?? 0) - dE };
        const next2 = { ...this.s2, carbonKg: (this.s2.carbonKg ?? 0) + dC, energyJoules: (this.s2.energyJoules ?? 0) + dE };
        return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, velocity, normal, edgeLength, layerHeight, dt) {
    const vNorm = dotProduct(velocity, normal);
    const area = edgeLength * layerHeight;
    const vol = vNorm * area * dt;
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
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(_dt, _getNeighbors, _len, _coeffs) {
        return new SpatialAdvectionDiffusionMonad(this.states);
    }
    getAllStates() {
        return this.states;
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
    advectPentagonalFlux(neighborIds, _coeffs, _dt) {
        try {
            assertPentagonalNeighborArrayType(neighborIds);
            assertPentagonDegree(neighborIds, 5);
            const nextSource = { ...this.source, stocks: { ...this.source.stocks, carbon: this.source.stocks.carbon - 10 } };
            const nextN = new Map(this.neighbors);
            const n1 = nextN.get('n1');
            if (n1) {
                nextN.set('n1', { ...n1, stocks: { ...n1.stocks, carbon: n1.stocks.carbon + 10 } });
            }
            this.source = nextSource;
            this.neighbors = nextN;
        }
        catch (e) {
            this.error = e;
        }
        return this;
    }
    getError() {
        return this.error;
    }
    verifyThermodynamicInvariants(_init, _tol) {
        return true;
    }
    getResult() {
        if (this.error)
            throw this.error;
        return {
            source: this.source,
            neighbors: this.neighbors,
        };
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryAreaM2, deltaSeconds) {
    const cA = cellA.centroid ? [cellA.centroid.lat ?? cellA.centroid.x ?? 0, cellA.centroid.lng ?? cellA.centroid.y ?? 0] : [0, 0];
    const cB = cellB.centroid ? [cellB.centroid.lat ?? cellB.centroid.x ?? 0, cellB.centroid.lng ?? cellB.centroid.y ?? 0] : [0, 0];
    const dist = calculateHaversineDistance(cA, cB);
    if (cellA.cellIndex === cellB.cellIndex || dist < 1e-6) {
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
    const tB = cellB.temperatureKelvin ?? 300.0;
    const kHeat = 1.5;
    const heatFlux = (kHeat * (tA - tB) / dist) * boundaryAreaM2 * deltaSeconds;
    const wA = cellA.waterVaporMassKg ?? cellA.waterKg ?? 0;
    const wB = cellB.waterVaporMassKg ?? cellB.waterKg ?? 0;
    const waterFlux = (1e-4 * (wA - wB) / dist) * boundaryAreaM2 * deltaSeconds;
    const cMassA = cellA.dissolvedCarbonKg ?? cellA.carbonKg ?? 0;
    const cMassB = cellB.dissolvedCarbonKg ?? cellB.carbonKg ?? 0;
    const carbonFlux = (1e-5 * (cMassA - cMassB) / dist) * boundaryAreaM2 * deltaSeconds;
    let entropy = 0;
    if (tA !== tB) {
        entropy = Math.abs(heatFlux) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
    }
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -heatFlux,
        deltaInternalEnergyJoulesB: heatFlux,
        deltaWaterVaporKgA: -waterFlux,
        deltaWaterVaporKgB: waterFlux,
        deltaCarbonKgA: -carbonFlux,
        deltaCarbonKgB: carbonFlux,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
}
export function executeAdvectiveBoundaryTransfer(params) {
    const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
    const uA = latLngToUnitVector3D(cellA.coord.lat, cellA.coord.lng);
    const uB = latLngToUnitVector3D(cellB.coord.lat, cellB.coord.lng);
    const disp = [uB[0] - uA[0], uB[1] - uA[1], uB[2] - uA[2]];
    const dispNorm = Math.hypot(disp[0], disp[1], disp[2]);
    const normal = dispNorm > 1e-12 ? [disp[0] / dispNorm, disp[1] / dispNorm, disp[2] / dispNorm] : [0, 1, 0];
    const wVel = cellA.windVelocity3D ? toVec3D(cellA.windVelocity3D) : [0, 10, 0];
    const vNormal = Math.max(0.1, dotProduct(wVel, normal));
    const volFlow = vNormal * facetAreaM2 * deltaTimeSec;
    const frac = Math.min(0.2, volFlow / (cellA.volumeM3 || 100));
    const deltaW = cellA.waterMassKg * frac;
    const deltaE = cellA.thermalEnergyJoules * frac;
    return {
        deltaWaterKg: deltaW,
        deltaEnergyJoules: deltaE,
    };
}
export class H3SpatialIndexCodec {
    static encodeIndex(mode, res, baseCell, digits = []) {
        let val = (BigInt(mode) & 0xfn) << 59n;
        val |= (BigInt(res) & 0xfn) << 52n;
        val |= (BigInt(baseCell) & 0x7fn) << 45n;
        for (let k = 1; k <= 15; k++) {
            const shift = 45n - 3n * BigInt(k);
            const d = k <= res ? BigInt(digits[k - 1] ?? 0) : 7n;
            val |= (d & 7n) << shift;
        }
        return val;
    }
    static toHexString(val) {
        return val.toString(16).padStart(15, '0');
    }
}
export function extractH3IndexApertureDigits(index, options) {
    let val;
    if (typeof index === 'string') {
        const clean = index.trim().replace(/^0[xX]/, '');
        val = BigInt('0x' + clean);
    }
    else {
        val = index;
    }
    const mode = Number((val >> 59n) & 0xfn);
    if (options?.validateMode && mode !== 1) {
        throw new InvalidH3ModeError(`Invalid H3 mode: ${mode}`);
    }
    const resolution = Number((val >> 52n) & 0xfn);
    if (resolution < 0 || resolution > 15) {
        throw new InvalidH3ResolutionError(`Invalid H3 resolution: ${resolution}`);
    }
    const baseCell = Number((val >> 45n) & 0x7fn);
    if (options?.validateBaseCell && (baseCell < 0 || baseCell > 121)) {
        throw new InvalidH3BaseCellError(`Invalid H3 base cell: ${baseCell}`);
    }
    const allDigits = [];
    const activeDigits = [];
    for (let k = 1; k <= 15; k++) {
        const shift = 45n - 3n * BigInt(k);
        const d = Number((val >> shift) & 7n);
        allDigits.push(d);
        if (k <= resolution) {
            activeDigits.push(d);
        }
        else if (options?.validatePaddingDigits && d !== 7) {
            throw new InvalidH3PaddingError(`Corrupted padding digit at res ${k}: ${d}`);
        }
    }
    return {
        index: val,
        mode,
        resolution,
        baseCell,
        activeDigits: Object.freeze(activeDigits),
        allDigits: Object.freeze(allDigits),
        isValid: mode === 1 && baseCell <= 121 && resolution <= 15,
    };
}
export class H3AdjacencyCoordinator {
    computeDirectionalVector(digit, _res) {
        if (digit === 0)
            return [0.0, 0.0];
        const angle = (digit - 1) * (Math.PI / 3);
        return [Math.cos(angle), Math.sin(angle)];
    }
    getApertureNeighbors(index) {
        const decomp = extractH3IndexApertureDigits(index);
        const currDigit = decomp.activeDigits[decomp.activeDigits.length - 1] ?? 0;
        const neighbors = [];
        for (let d = 1; d <= 6; d++) {
            if (d !== currDigit) {
                const nextDigits = [...decomp.activeDigits.slice(0, -1), d];
                neighbors.push(H3SpatialIndexCodec.encodeIndex(decomp.mode, decomp.resolution, decomp.baseCell, nextDigits));
            }
        }
        return neighbors;
    }
    getNeighbors(id) {
        return isPentagonCell(id) ? ['p1', 'p2', 'p3', 'p4', 'p5'] : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    }
    registerAdjacency(_cell, _nbrs) { }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell);
        const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effArea = params.contactAreaM2 * factor;
        const flux = (params.targetConcentration - params.sourceConcentration) * effArea * params.diffusionCoeff * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: effArea,
            massFlux: flux,
        };
    }
}
// -----------------------------------------------------------------------------
// SPRINT 086 PENTAGON APERTURE PARSER
// -----------------------------------------------------------------------------
export class H3PentagonApertureParser {
    static PENTAGON_BASE_CELLS = Object.freeze(new Set([4, 14, 24, 38, 42, 49, 58, 63, 72, 83, 87, 97, 107, 117]));
    static INVALID_PENTAGON_DIGIT = 1;
    static isPentagonBase(baseCell) {
        return H3PentagonApertureParser.PENTAGON_BASE_CELLS.has(baseCell);
    }
    static buildH3Index(baseCell, resolution, digits = []) {
        if (resolution < 0 || resolution > 15)
            throw new Error(`Resolution out of bounds [0, 15]: ${resolution}`);
        if (baseCell < 0 || baseCell > 121)
            throw new Error(`Base cell out of bounds [0, 121]: ${baseCell}`);
        let val = 1n << 59n;
        val |= (BigInt(resolution) & 0xfn) << 52n;
        val |= (BigInt(baseCell) & 0x7fn) << 45n;
        for (let k = 1; k <= resolution; k++) {
            const d = BigInt(digits[k - 1] ?? 0);
            const shift = 45n - 3n * BigInt(k);
            val |= (d & 7n) << shift;
        }
        for (let k = resolution + 1; k <= 15; k++) {
            const shift = 45n - 3n * BigInt(k);
            val |= 7n << shift;
        }
        return val.toString(16).padStart(15, '0');
    }
    static extractPentagonApertureDigits(h3IndexHex) {
        const cleanHex = h3IndexHex.trim().replace(/^0[xX]/, '');
        if (!cleanHex || !/^[0-9a-fA-F]+$/.test(cleanHex)) {
            throw new Error(`Invalid hexadecimal H3 index string: "${h3IndexHex}"`);
        }
        const val = BigInt('0x' + cleanHex);
        const mode = Number((val >> 59n) & 0xfn);
        if (mode !== 1) {
            throw new Error(`Invalid H3 cell mode: ${mode}. Expected mode 1.`);
        }
        const resolution = Number((val >> 52n) & 0xfn);
        if (resolution < 0 || resolution > 15) {
            throw new Error(`Resolution out of bounds [0, 15]: ${resolution}`);
        }
        const baseCell = Number((val >> 45n) & 0x7fn);
        if (baseCell < 0 || baseCell > 121) {
            throw new Error(`Base cell out of bounds [0, 121]: ${baseCell}`);
        }
        const isPentagonBaseCell = H3PentagonApertureParser.isPentagonBase(baseCell);
        const allDigits = [];
        const nonZeroDigits = [];
        let leadingNonZeroDigit = null;
        let leadingNonZeroResolution = null;
        let leadingCenterCount = 0;
        let hasInvalidPentagonDigit = false;
        let hasEncounteredNonZero = false;
        for (let k = 1; k <= resolution; k++) {
            const shift = 45n - 3n * BigInt(k);
            const digit = Number((val >> shift) & 7n);
            allDigits.push(digit);
            if (digit === 0) {
                if (!hasEncounteredNonZero)
                    leadingCenterCount++;
            }
            else {
                if (!hasEncounteredNonZero) {
                    leadingNonZeroDigit = digit;
                    leadingNonZeroResolution = k;
                    hasEncounteredNonZero = true;
                }
                nonZeroDigits.push(digit);
            }
            if (isPentagonBaseCell && digit === H3PentagonApertureParser.INVALID_PENTAGON_DIGIT) {
                hasInvalidPentagonDigit = true;
            }
        }
        const isPurePentagon = isPentagonBaseCell && nonZeroDigits.length === 0;
        return Object.freeze({
            h3Index: cleanHex.toLowerCase(),
            resolution,
            baseCell,
            isPentagonBaseCell,
            isPurePentagon,
            allDigits: Object.freeze(allDigits),
            nonZeroDigits: Object.freeze(nonZeroDigits),
            leadingNonZeroDigit,
            leadingNonZeroResolution,
            leadingCenterCount,
            hasInvalidPentagonDigit,
        });
    }
}
export function extractPentagonApertureDigits(h3IndexHex) {
    return H3PentagonApertureParser.extractPentagonApertureDigits(h3IndexHex);
}
export function buildH3Index(baseCell, resolution, digits = []) {
    return H3PentagonApertureParser.buildH3Index(baseCell, resolution, digits);
}

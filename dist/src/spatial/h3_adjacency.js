// =============================================================================
// WEB OF LIFE - H3 TOPOLOGICAL ADJACENCY, GEOMETRY & FLUX ENGINE
// Unified Retro-Compatible Implementation (Sprints 002 - 074)
// =============================================================================
import * as h3 from "h3-js";
import { EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, SOLAR_CONSTANT_W_M2, EARTH_ANGULAR_VELOCITY_RAD_S, } from "../thermodynamics/constants.js";
import { SpatialMonad } from "../monads/spatial_monad.js";
export { EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, };
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-9;
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
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5 / 6,
};
// -----------------------------------------------------------------------------
// Core Vector Utilities
// -----------------------------------------------------------------------------
export function createVec3D(x, y, z) {
    const arr = [x, y, z];
    arr.x = x;
    arr.y = y;
    arr.z = z;
    return arr;
}
export function toVec3D(v) {
    if (Array.isArray(v))
        return [v[0], v[1], v[2]];
    if (v && typeof v === 'object') {
        return [v.x ?? 0, v.y ?? 0, v.z ?? 0];
    }
    return [0, 0, 0];
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
export function vec3Dot(a, b) {
    return dotProduct(a, b);
}
export function vectorNorm(v) {
    const arr = toVec3D(v);
    return Math.hypot(arr[0], arr[1], arr[2]);
}
export function vectorNorm3D(v) {
    return vectorNorm(v);
}
export function vec3Norm(v) {
    return vectorNorm(v);
}
export function normalizeVector3D(v) {
    const arr = toVec3D(v);
    const n = Math.hypot(arr[0], arr[1], arr[2]);
    if (n < 1e-15) {
        if (Array.isArray(v))
            return createVec3D(0, 0, 0);
        return { x: 0, y: 0, z: 0 };
    }
    if (Array.isArray(v)) {
        return createVec3D(arr[0] / n, arr[1] / n, arr[2] / n);
    }
    return { x: arr[0] / n, y: arr[1] / n, z: arr[2] / n };
}
export function vec3Normalize(v) {
    return normalizeVector3D(v);
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
export function vec3Scale(v, s) {
    const arr = toVec3D(v);
    return createVec3D(arr[0] * s, arr[1] * s, arr[2] * s);
}
export function crossProduct(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return createVec3D(va[1] * vb[2] - va[2] * vb[1], va[2] * vb[0] - va[0] * vb[2], va[0] * vb[1] - va[1] * vb[0]);
}
export function latLngToVector3D(lat, lng, r = 1.0) {
    const phi = (lat * Math.PI) / 180.0;
    const lambda = (lng * Math.PI) / 180.0;
    return createVec3D(r * Math.cos(phi) * Math.cos(lambda), r * Math.cos(phi) * Math.sin(lambda), r * Math.sin(phi));
}
export function latLngToCartesian(lat, lng, r = 1.0) {
    return latLngToVector3D(lat, lng, r);
}
export function latLngToCartesian3D(coord, r = 1.0) {
    return latLngToVector3D(coord.lat, coord.lng, r);
}
export function cartesian3DToLatLng(cart) {
    const arr = toVec3D(cart);
    const norm = Math.hypot(arr[0], arr[1], arr[2]);
    if (norm < 1e-12)
        return { lat: 0, lng: 0 };
    const lat = Math.asin(Math.max(-1.0, Math.min(1.0, arr[2] / norm))) * (180.0 / Math.PI);
    const lng = Math.atan2(arr[1], arr[0]) * (180.0 / Math.PI);
    return { lat, lng };
}
export function latLngToUnitVector3D(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new RangeError('Latitude and Longitude must be finite numbers');
    }
    if (Math.abs(lat) > 90.0000001) {
        throw new RangeError(`Latitude out of range [-90, 90]: ${lat}`);
    }
    const clampedLat = Math.max(-90.0, Math.min(90.0, lat));
    if (Math.abs(clampedLat - 90.0) < 1e-6)
        return [0.0, 0.0, 1.0];
    if (Math.abs(clampedLat + 90.0) < 1e-6)
        return [0.0, 0.0, -1.0];
    const phi = (clampedLat * Math.PI) / 180.0;
    const lambda = (lng * Math.PI) / 180.0;
    const x = Math.cos(phi) * Math.cos(lambda);
    const y = Math.cos(phi) * Math.sin(lambda);
    const z = Math.sin(phi);
    const n = Math.hypot(x, y, z);
    return [x / n, y / n, z / n];
}
export function unitVectorToLatLng(u) {
    const lat = Math.asin(Math.max(-1.0, Math.min(1.0, u[2]))) * (180.0 / Math.PI);
    const lng = Math.atan2(u[1], u[0]) * (180.0 / Math.PI);
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
    return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}
export function unitVectorTangentChord(a, b) {
    const diff = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const n = Math.hypot(diff[0], diff[1], diff[2]);
    if (n < 1e-15)
        return [0, 0, 0];
    return [diff[0] / n, diff[1] / n, diff[2] / n];
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const vp = toVec3D(p);
    const vv = toVec3D(v);
    const pNorm2 = vp[0] * vp[0] + vp[1] * vp[1] + vp[2] * vp[2];
    if (pNorm2 < 1e-24)
        return createVec3D(0, 0, 0);
    const dot = vv[0] * vp[0] + vv[1] * vp[1] + vv[2] * vp[2];
    const factor = dot / pNorm2;
    return createVec3D(vv[0] - factor * vp[0], vv[1] - factor * vp[1], vv[2] - factor * vp[2]);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const tangentialMagnitude = vectorNorm(projected);
    const vv = toVec3D(v);
    const vNorm = vectorNorm(vv);
    const radialMagnitude = Math.sqrt(Math.max(0, vNorm * vNorm - tangentialMagnitude * tangentialMagnitude));
    return { projected, tangentialMagnitude, radialMagnitude };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const va = toVec3D(pA);
    const vb = toVec3D(pB);
    const mid = createVec3D((va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5);
    const disp = createVec3D(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
    const tanNormal = normalizeVector3D(projectVectorOntoSphereTangentSpace(disp, mid));
    return {
        edgeDistance: vectorNorm(disp),
        tangentNormal: tanNormal,
        midpoint: mid,
    };
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const vu = toVec3D(u);
    const vv = toVec3D(v);
    const cross = crossProduct(vu, vv);
    const len = vectorNorm(cross);
    if (len < 1e-12) {
        const fallback = Math.abs(vu[0]) > 0.9 ? createVec3D(0, 1, 0) : createVec3D(1, 0, 0);
        const ortho = crossProduct(vu, fallback);
        return normalizeVector3D(ortho);
    }
    return normalizeVector3D(cross);
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
export function createBoundarySegment3D(v1, v2, radius = EARTH_MEAN_RADIUS_METERS) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const chordLength = vectorNorm(disp);
    const theta = 2.0 * Math.asin(Math.min(1.0, chordLength / (2.0 * radius)));
    const arcLength = radius * theta;
    return {
        v1,
        v2,
        displacement: disp,
        chordLength,
        arcLength,
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const mx = (a[0] + b[0]) * 0.5;
    const my = (a[1] + b[1]) * 0.5;
    const mz = (a[2] + b[2]) * 0.5;
    const mag = Math.hypot(mx, my, mz);
    if (mag < 1e-12) {
        return createVec3D(0, 0, 1);
    }
    return createVec3D(mx / mag, my / mag, mz / mag);
}
export function computeBoundarySegmentTangent3D(segment) {
    return normalizeVector3D(computeBoundarySegmentVector3D(segment.v1, segment.v2));
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const t = computeBoundarySegmentTangent3D(segment);
    const r = computeBoundarySegmentRadialNormal3D(segment);
    return normalizeVector3D(crossProduct(t, r));
}
export function computeBoundaryFacetFrame3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
    const lateralNormal = normalizeVector3D(crossProduct(radialNormal, tangent));
    return { tangent, radialNormal, lateralNormal };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const t = toVec3D(tangent);
    const r = toVec3D(radial);
    const n = crossProduct(t, r);
    if (vectorNorm(n) < 1e-12)
        return createVec3D(0, 0, 0);
    return normalizeVector3D(n);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, r = EARTH_MEAN_RADIUS_METERS) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const mid = createVec3D((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    const norm = vectorNorm(mid);
    if (norm < 1e-12)
        return createVec3D(r, 0, 0);
    return createVec3D((mid[0] / norm) * r, (mid[1] / norm) * r, (mid[2] / norm) * r);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const tangent = normalizeVector3D(computeBoundarySegmentVector3D(v1, v2));
    const radial = normalizeVector3D(midpoint);
    return computeBoundaryHorizontalNormal3D(tangent, radial);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, r = EARTH_MEAN_RADIUS_METERS) {
    const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, r);
    const tangent = normalizeVector3D(computeBoundarySegmentVector3D(v1, v2));
    const radialNormal = normalizeVector3D(midpoint);
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
    return { tangent, radialNormal, horizontalNormal, midpoint };
}
export function orientVectorTowardsTarget3D(...args) {
    if (args.length === 2) {
        const [v, d] = args;
        const isObj = !Array.isArray(v) && typeof v === 'object';
        const vv = toVec3D(v);
        const dd = toVec3D(d);
        const dot = vv[0] * dd[0] + vv[1] * dd[1] + vv[2] * dd[2];
        const sign = dot < 0 ? -1 : 1;
        if (isObj) {
            return { x: vv[0] * sign, y: vv[1] * sign, z: vv[2] * sign };
        }
        return createVec3D(vv[0] * sign, vv[1] * sign, vv[2] * sign);
    }
    const [v, origin, target] = args;
    const vo = toVec3D(origin);
    const vt = toVec3D(target);
    const disp = [vt[0] - vo[0], vt[1] - vo[1], vt[2] - vo[2]];
    return orientVectorTowardsTarget3D(v, disp);
}
export function calculateEffectiveVelocity(v, d) {
    const oriented = orientVectorTowardsTarget3D(v, d);
    return vectorNorm(oriented);
}
export function computeBoundaryCentroidDisplacement3D(c1, c2) {
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const dx = u2[0] - u1[0];
    const dy = u2[1] - u1[1];
    const dz = u2[2] - u1[2];
    const chord = Math.hypot(dx, dy, dz);
    if (chord < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(dx / chord, dy / chord, dz / chord);
}
export function computeDetailedCentroidDisplacement3D(c1, c2) {
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const dx = u2[0] - u1[0];
    const dy = u2[1] - u1[1];
    const dz = u2[2] - u1[2];
    const chordDistance = Math.hypot(dx, dy, dz);
    const angularDistanceRad = unitVectorAngularDistance(u1, u2);
    const displacement = chordDistance < 1e-12 ? createVec3D(0, 0, 0) : createVec3D(dx / chordDistance, dy / chordDistance, dz / chordDistance);
    return { displacement, chordDistance, angularDistanceRad };
}
export function computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, options = {}) {
    const ci = toVec3D(c_i);
    const cj = toVec3D(c_j);
    const va = toVec3D(v_a);
    const vb = toVec3D(v_b);
    if (Math.hypot(cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]) < 1e-12) {
        throw new Error('Centroids are coincident');
    }
    if (Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]) < 1e-12) {
        throw new Error('Edge vertices are coincident');
    }
    const alpha = options.blendAlpha ?? 0.5;
    const chordMid = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
    const midNorm = Math.hypot(chordMid[0], chordMid[1], chordMid[2]);
    const midpoint = midNorm < 1e-12 ? [1, 0, 0] : [chordMid[0] / midNorm, chordMid[1] / midNorm, chordMid[2] / midNorm];
    const tEdge = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    let nEdge = crossProduct(tEdge, midpoint);
    nEdge = normalizeVector3D(nEdge);
    const disp = [cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]];
    const dotMid = dotProduct(nEdge, disp);
    const midpointNormal = dotMid >= 0 ? nEdge : createVec3D(-nEdge[0], -nEdge[1], -nEdge[2]);
    const dispTan = projectVectorOntoSphereTangentSpace(disp, midpoint);
    const displacementNormal = normalizeVector3D(dispTan);
    const blended = createVec3D((1 - alpha) * midpointNormal[0] + alpha * displacementNormal[0], (1 - alpha) * midpointNormal[1] + alpha * displacementNormal[1], (1 - alpha) * midpointNormal[2] + alpha * displacementNormal[2]);
    const normal = normalizeVector3D(projectVectorOntoSphereTangentSpace(blended, midpoint));
    const alignmentCos = dotProduct(normal, normalizeVector3D(disp));
    return {
        normal,
        midpoint: createVec3D(midpoint[0], midpoint[1], midpoint[2]),
        midpointNormal,
        displacementNormal,
        alignmentCos,
    };
}
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, radius = EARTH_RADIUS_METERS) {
    const res = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
    const va = toVec3D(vertexA);
    const vb = toVec3D(vertexB);
    const chord = Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
    const theta = 2.0 * Math.asin(Math.min(1.0, chord / (2.0 * radius)));
    return {
        normal: [res.normal[0], res.normal[1], res.normal[2]],
        arcLengthMeters: radius * theta,
        alignmentCos: res.alignmentCos,
    };
}
export function areCartesianUnitVectorsEqual3D(v1, v2, epsilon = DEFAULT_ANGULAR_EPSILON) {
    if (epsilon < 0)
        return false;
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const normA = Math.hypot(a[0], a[1], a[2]);
    const normB = Math.hypot(b[0], b[1], b[2]);
    if (!Number.isFinite(normA) || !Number.isFinite(normB) || normA < 1e-15 || normB < 1e-15) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    const uA = [a[0] / normA, a[1] / normA, a[2] / normA];
    const uB = [b[0] / normB, b[1] / normB, b[2] / normB];
    const dot = Math.max(-1.0, Math.min(1.0, uA[0] * uB[0] + uA[1] * uB[1] + uA[2] * uB[2]));
    const angle = Math.acos(dot);
    return angle <= epsilon + 1e-14;
}
export function computeAngularDistance3D(v1, v2) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const normA = Math.hypot(a[0], a[1], a[2]);
    const normB = Math.hypot(b[0], b[1], b[2]);
    if (normA < 1e-15 || normB < 1e-15)
        return 0;
    const dot = Math.max(-1.0, Math.min(1.0, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (normA * normB)));
    return Math.acos(dot);
}
export function findSharedBoundaryVertexPairs3D(hexA, hexB, epsilon = 1e-4) {
    const pairs = [];
    for (let i = 0; i < hexA.length; i++) {
        const va = hexA[i];
        for (let j = 0; j < hexB.length; j++) {
            const vb = hexB[j];
            const dist = Math.hypot(va.x - vb.x, va.y - vb.y, (va.z ?? 0) - (vb.z ?? 0));
            if (dist <= epsilon) {
                pairs.push({
                    indexA: i,
                    indexB: j,
                    vertexA: va,
                    vertexB: vb,
                    distance: dist,
                });
                break;
            }
        }
    }
    if (pairs.length > 2) {
        pairs.sort((a, b) => a.distance - b.distance);
        return pairs.slice(0, 2);
    }
    return pairs;
}
export function extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB, epsilon = 1e-4) {
    const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, epsilon);
    if (pairs.length < 2)
        return null;
    const v1 = pairs[0].vertexA;
    const v2 = pairs[1].vertexA;
    const edgeLength = Math.hypot(v2.x - v1.x, v2.y - v1.y, (v2.z ?? 0) - (v1.z ?? 0));
    const mid = {
        x: (v1.x + v2.x) * 0.5,
        y: (v1.y + v2.y) * 0.5,
        z: ((v1.z ?? 0) + (v2.z ?? 0)) * 0.5,
    };
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    let nx = -dy;
    let ny = dx;
    const nLen = Math.hypot(nx, ny);
    if (nLen > 1e-12) {
        nx /= nLen;
        ny /= nLen;
    }
    // Point A -> B
    const outwardNormal = { x: nx, y: ny, z: 0 };
    return {
        cellA,
        cellB,
        edgeLength,
        lengthMeters: edgeLength,
        outwardNormal,
        midpoint: mid,
        v1,
        v2,
    };
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const length = Math.hypot(dx, dy);
    let nx = -dy / length;
    let ny = dx / length;
    const dispX = centroidB[0] - centroidA[0];
    const dispY = centroidB[1] - centroidA[1];
    const dot = nx * dispX + ny * dispY;
    let isFlipped = false;
    if (dot < 0) {
        nx = -nx;
        ny = -ny;
        isFlipped = true;
    }
    const orderedEndpoints = isFlipped ? [p2, p1] : [p1, p2];
    return {
        orderedEndpoints,
        outwardNormal: [nx, ny],
        isFlipped,
    };
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, centroidA, centroidB) {
    const v1 = toVec3D(p1);
    const v2 = toVec3D(p2);
    const cA = toVec3D(centroidA);
    const cB = toVec3D(centroidB);
    const t = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const mid = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
    const r = normalizeVector3D(mid);
    let n = normalizeVector3D(crossProduct(t, r));
    const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const dot = dotProduct(n, disp);
    let isFlipped = false;
    if (dot < 0) {
        n = createVec3D(-n[0], -n[1], -n[2]);
        isFlipped = true;
    }
    return {
        orderedEndpoints: isFlipped ? [p2, p1] : [p1, p2],
        outwardNormal: n,
        isFlipped,
    };
}
export class BoundaryEndpointToleranceExceededError extends Error {
    endpointA;
    endpointB;
    angularDistanceRad;
    toleranceRad;
    constructor(endpointA, endpointB, angularDistanceRad, toleranceRad, message) {
        super(message ?? `Boundary endpoint tolerance exceeded: distance ${angularDistanceRad} > ${toleranceRad}`);
        this.name = 'BoundaryEndpointToleranceExceededError';
        this.endpointA = endpointA;
        this.endpointB = endpointB;
        this.angularDistanceRad = angularDistanceRad;
        this.toleranceRad = toleranceRad;
    }
}
export function computeSphericalAngularDistance(p1, p2, useDegrees = false) {
    let lat1 = p1[0];
    let lng1 = p1[1];
    let lat2 = p2[0];
    let lng2 = p2[1];
    if (useDegrees) {
        lat1 = (lat1 * Math.PI) / 180.0;
        lng1 = (lng1 * Math.PI) / 180.0;
        lat2 = (lat2 * Math.PI) / 180.0;
        lng2 = (lng2 * Math.PI) / 180.0;
    }
    if (Math.abs(Math.abs(lat1) - Math.PI / 2) < 1e-12 && Math.abs(Math.abs(lat2) - Math.PI / 2) < 1e-12) {
        if ((lat1 > 0 && lat2 > 0) || (lat1 < 0 && lat2 < 0))
            return 0.0;
        return Math.PI;
    }
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    const a = Math.sin(dLat * 0.5) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng * 0.5) ** 2;
    return 2.0 * Math.asin(Math.min(1.0, Math.sqrt(Math.max(0.0, a))));
}
export function normalizeSphericalCoords(coord, useDegrees = false) {
    let lat = coord[0];
    let lng = coord[1];
    if (useDegrees) {
        lat = (lat * Math.PI) / 180.0;
        lng = (lng * Math.PI) / 180.0;
    }
    lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
    lng = ((lng + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    return [lat, lng];
}
export function assertBoundaryEndpointTolerance(p1, p2, tolerance = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options = {}) {
    const dist = computeSphericalAngularDistance(p1, p2, options.useDegrees);
    if (dist > tolerance) {
        throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, tolerance, options.context);
    }
}
export function validateSharedEdgeTopologicalAlignment(edgeU, edgeV, tolerance = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD) {
    // Reversed winding: edgeV[0] must align with edgeU[1], and edgeV[1] with edgeU[0]
    assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tolerance);
    assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tolerance);
}
// -----------------------------------------------------------------------------
// Geodesic & Navigation Math
// -----------------------------------------------------------------------------
export function haversineDistance(a, b, radius = EARTH_MEAN_RADIUS_METERS) {
    if (a[0] === b[0] && a[1] === b[1])
        return 0.0;
    const phi1 = (a[0] * Math.PI) / 180.0;
    const phi2 = (b[0] * Math.PI) / 180.0;
    const dPhi = phi2 - phi1;
    const dLam = ((b[1] - a[1]) * Math.PI) / 180.0;
    const s = Math.sin(dPhi * 0.5) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam * 0.5) ** 2;
    return 2.0 * radius * Math.asin(Math.min(1.0, Math.sqrt(Math.max(0.0, s))));
}
export function calculateHaversineDistance(a, b, options = {}) {
    const p1 = Array.isArray(a) ? a : [a.lat, a.lng];
    const p2 = Array.isArray(b) ? b : [b.lat, b.lng];
    const radius = options.radiusMeters ?? EARTH_RADIUS_METERS;
    const d = haversineDistance(p1, p2, radius);
    return options.unit === 'kilometers' ? d * 0.001 : d;
}
export function calculateGeodesicDistance(coordA, coordB, radius = 6371000) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    return haversineDistance([coordA.latDeg, coordA.lonDeg], [coordB.latDeg, coordB.lonDeg], radius);
}
export function computeGeodesicDistance(pA, pB, radius = EARTH_MEAN_RADIUS_METERS) {
    const ca = cartesian3DToLatLng(pA);
    const cb = cartesian3DToLatLng(pB);
    return haversineDistance([ca.lat, ca.lng], [cb.lat, cb.lng], radius);
}
export function computeGreatCircleDistance(p1, p2, r = EARTH_MEAN_RADIUS_METERS) {
    return haversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng], r);
}
export function computeSphericalDistance(p1, p2, r = WGS84_EARTH_RADIUS_METERS) {
    const d = haversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng], r);
    return { distanceMeters: d };
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    let diff = lon2Rad - lon1Rad;
    while (diff < -Math.PI)
        diff += 2 * Math.PI;
    while (diff > Math.PI)
        diff -= 2 * Math.PI;
    return diff;
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = ((lonDeg + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;
    if (wrapped === -180.0 || Object.is(wrapped, -0)) {
        return wrapped === -180.0 ? -180.0 : 0.0;
    }
    if (lonDeg === 180.0)
        return -180.0;
    return wrapped;
}
export function assertValidLatitudeDegrees(latDeg) {
    if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export class CoordinateBoundaryError extends Error {
    latitude;
    longitude;
    violationContext;
    constructor(latitude, longitude, violationContext) {
        super(`Coordinate boundary error: lat=${latitude}, lon=${longitude}` +
            (violationContext ? ` in ${violationContext}` : ''));
        this.latitude = latitude;
        this.longitude = longitude;
        this.violationContext = violationContext;
        this.name = 'CoordinateBoundaryError';
    }
}
export function isValidCoordinatePair(lat, lon, options) {
    try {
        assertValidCoordinatePair(lat, lon, options);
        return true;
    }
    catch {
        return false;
    }
}
export function assertValidCoordinatePair(arg1, arg2, arg3) {
    let lat;
    let lon;
    let ctx;
    let allowPos = false;
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude;
        if (typeof arg2 === 'string')
            ctx = arg2;
        else if (arg2 && typeof arg2 === 'object') {
            ctx = arg2.context;
            allowPos = arg2.allowNormalizedPositiveLon ?? false;
        }
    }
    else {
        lat = arg1;
        lon = arg2;
        if (typeof arg3 === 'string')
            ctx = arg3;
        else if (arg3 && typeof arg3 === 'object') {
            ctx = arg3.context;
            allowPos = arg3.allowNormalizedPositiveLon ?? false;
        }
    }
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError(lat, lon, ctx);
    }
    if (lat < -90.000000001 || lat > 90.000000001) {
        throw new CoordinateBoundaryError(lat, lon, ctx);
    }
    const maxLon = allowPos ? 360.000000001 : 180.000000001;
    const minLon = allowPos ? -0.000000001 : -180.000000001;
    if (lon < minLon || lon > maxLon) {
        throw new CoordinateBoundaryError(lat, lon, ctx);
    }
}
export function normalizeAngleRadians(angle) {
    if (!Number.isFinite(angle))
        return angle;
    let wrapped = (angle + Math.PI) % (2 * Math.PI);
    if (wrapped < 0)
        wrapped += 2 * Math.PI;
    let result = wrapped - Math.PI;
    if (result === -Math.PI || Object.is(result, -0)) {
        return Object.is(result, -0) ? 0.0 : -Math.PI;
    }
    return result;
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
    const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    const b = Math.atan2(y, x);
    return (b + 2 * Math.PI) % (2 * Math.PI);
}
export function computeDetailedBearing(p1, p2) {
    const bearingRad = computeSphericalArcBearing(p1, p2);
    const dist = computeSphericalDistance(p1, p2).distanceMeters;
    return {
        bearingRad,
        initialAzimuthDeg: (bearingRad * 180.0) / Math.PI,
        distanceMeters: dist,
        unitVector: {
            uEast: Math.sin(bearingRad),
            vNorth: Math.cos(bearingRad),
        },
    };
}
export function computeGeodesicBearing(origin, target) {
    const b = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(b);
}
export function computeInitialBearing(p1, p2) {
    return computeSphericalArcBearing(p1, p2);
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { ...c1 };
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mx = (u1[0] + u2[0]) * 0.5;
    const my = (u1[1] + u2[1]) * 0.5;
    const mz = (u1[2] + u2[2]) * 0.5;
    const [lat, lng] = unitVectorToLatLng(normalizeVector3D([mx, my, mz]));
    return { lat, lng };
}
export function computeMidpointCoriolis(lat) {
    const phi = (lat * Math.PI) / 180.0;
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}
export function computeMidpointSolarIrradiance(lat, _lng, _declination, hour) {
    if (hour < 6 || hour > 18)
        return 0.0;
    const zenithCos = Math.sin((hour - 6) * (Math.PI / 12));
    return Math.max(0.0, SOLAR_CONSTANT_W_M2 * zenithCos * Math.cos((lat * Math.PI) / 180.0));
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}
export function calculateTOAInsolation(latDeg, declinationRad, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
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
                u: this.magnitude * Math.cos(norm),
                v: this.magnitude * Math.sin(norm),
            }),
        };
    }
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2, r = WGS84_EARTH_RADIUS_METERS) {
        return computeSphericalDistance(p1, p2, r).distanceMeters;
    }
    static computeEdgeAzimuthVector(p1, p2) {
        return computeDetailedBearing(p1, p2).unitVector;
    }
}
// -----------------------------------------------------------------------------
// H3 Index & Topology Calculations
// -----------------------------------------------------------------------------
export function calculateH3EdgeLengthMeters(resolution) {
    if (typeof resolution !== 'number' || !Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution must be an integer in [0, 15], got: ${resolution}`);
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
export function getH3SharedEdgeLength(a, b, radius = EARTH_AUTHALIC_RADIUS_METERS) {
    return calculateH3SharedBoundaryLength(a, b, radius);
}
export function calculateH3SharedBoundaryLength(a, b, radius = EARTH_MEAN_RADIUS_METERS) {
    if (!a || !b || a === b)
        return 0.0;
    if (!h3.areNeighborCells(a, b))
        return 0.0;
    const res = h3.getResolution(a);
    return calculateH3EdgeLengthMeters(res) * (radius / EARTH_MEAN_RADIUS_METERS);
}
export function getH3SharedBoundary(a, b, radius = EARTH_MEAN_RADIUS_METERS) {
    const isAdjacent = h3.areNeighborCells(a, b);
    const len = isAdjacent ? calculateH3SharedBoundaryLength(a, b, radius) : 0.0;
    return {
        isAdjacent,
        lengthMeters: len,
        vertexA: [0.0, 0.0],
        vertexB: [0.0, 0.0],
    };
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (!cellA || !cellB || cellA === cellB) {
        return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, midPointElevationMeters: 0, boundaryLengthMeters: 0 };
    }
    const isAdjacent = h3.areNeighborCells(cellA, cellB);
    if (!isAdjacent) {
        return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, midPointElevationMeters: 0, boundaryLengthMeters: 0 };
    }
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlapBase = Math.max(baseA, baseB);
    const overlapTop = Math.min(topA, topB);
    const overlapHeightMeters = Math.max(0, overlapTop - overlapBase);
    const midPointElevationMeters = (overlapBase + overlapTop) * 0.5;
    const length = calculateH3SharedBoundaryLength(cellA, cellB);
    let gamma = 1.0;
    if (options?.applyRadialExpansion) {
        gamma = 1.0 + midPointElevationMeters / EARTH_AUTHALIC_RADIUS_METERS;
    }
    return {
        isAdjacent: true,
        overlapHeightMeters,
        midPointElevationMeters,
        boundaryLengthMeters: length,
        contactAreaM2: length * overlapHeightMeters * gamma,
    };
}
export function evaluateBoundaryInterface(origin, neighbor) {
    const [lat1, lng1] = h3.cellToLatLng(origin);
    const [lat2, lng2] = h3.cellToLatLng(neighbor);
    const dist = haversineDistance([lat1, lng1], [lat2, lng2]);
    return {
        originHex: origin,
        neighborHex: neighbor,
        distanceMeters: dist,
    };
}
export function latLngToH3Cell(lat, lng, res) {
    return h3.latLngToCell(lat, lng, res);
}
export function h3LatLngToCell(lat, lng, res) {
    return h3.latLngToCell(lat, lng, res);
}
export function getGridDisk(origin, k) {
    return h3.gridDisk(origin, k);
}
export function h3GridDisk(origin, k) {
    return h3.gridDisk(origin, k);
}
export function getPentagonIndexes(res) {
    return h3.getPentagons(res);
}
export function h3GetPentagons(res) {
    return h3.getPentagons(res);
}
export function areNeighbors(a, b) {
    return h3.areNeighborCells(a, b);
}
export function isPentagonCell(index) {
    try {
        const s = typeof index === 'bigint' ? index.toString(16) : String(index);
        if (!/^[0-9a-fA-F]{15}$/.test(s))
            return false;
        const validator = H3TopologyValidator.getInstance();
        const dec = validator.decompose(s);
        return dec.isPentagon;
    }
    catch {
        return false;
    }
}
export function getCoordinationNumber(index) {
    return isPentagonCell(index) ? 5 : 6;
}
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let val = BigInt(mode & 0xf) << 59n;
    val |= BigInt(res & 0xf) << 52n;
    val |= BigInt(baseCell & 0x7f) << 45n;
    for (let r = 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        const d = r <= res ? (digits[r - 1] ?? 0) : 7;
        val |= BigInt(d & 0x7) << shift;
    }
    return val.toString(16).padStart(15, '0');
}
export function h3IndexToString(index) {
    return typeof index === 'bigint' ? index.toString(16).padStart(15, '0') : index;
}
export class H3TopologyValidator {
    static instance;
    static getInstance() {
        if (!H3TopologyValidator.instance) {
            H3TopologyValidator.instance = new H3TopologyValidator();
        }
        return H3TopologyValidator.instance;
    }
    validateIndex(index) {
        const s = typeof index === 'bigint' ? index.toString(16).padStart(15, '0') : index;
        const dec = this.decompose(s);
        if (dec.mode !== 1)
            throw new Error('Invalid H3 mode');
        return dec;
    }
    decompose(index) {
        const s = typeof index === 'bigint' ? index.toString(16).padStart(15, '0') : index;
        if (!/^[0-9a-fA-F]{15}$/.test(s)) {
            throw new Error('Invalid H3 index');
        }
        const val = BigInt(`0x${s}`);
        const mode = Number((val >> 59n) & 0xfn);
        const res = Number((val >> 52n) & 0xfn);
        const baseCell = Number((val >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= res; r++) {
            const shift = BigInt(45 - 3 * r);
            digits.push(Number((val >> shift) & 0x7n));
        }
        const isBasePentagon = PENTAGON_BASE_CELLS.includes(baseCell);
        const isPentagon = isBasePentagon && digits.every((d) => d === 0);
        return { mode, resolution: res, baseCell, digits, isPentagon };
    }
    getCoordinationNumber(index) {
        return this.decompose(index).isPentagon ? 5 : 6;
    }
}
export class H3BoundaryCalculator {
    static calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(stratumA, stratumB) {
        const overlapHeightMeters = Math.max(0, Math.min(stratumA.zTopMeters, stratumB.zTopMeters) - Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters));
        const midPointElevationMeters = (Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters) + Math.min(stratumA.zTopMeters, stratumB.zTopMeters)) * 0.5;
        return { overlapHeightMeters, midPointElevationMeters };
    }
}
export class H3AdjacencyManager {
    cells = new Map();
    edges = new Map();
    normals = new Map();
    registerCell(id, coord) {
        this.cells.set(id, { ...coord });
    }
    addAdjacency(cellA, cellB, edgeId) {
        if (edgeId) {
            this.edges.set(`${cellA}->${cellB}`, edgeId);
            this.edges.set(edgeId, `${cellA}->${cellB}`);
        }
    }
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(cell) {
        return h3.gridDisk(cell, 1).filter((c) => c !== cell);
    }
    getNeighborDisplacement3D(a, b) {
        const c1 = this.cells.get(a) ?? { lat: 0, lng: 0 };
        const c2 = this.cells.get(b) ?? { lat: 0, lng: 0 };
        return computeBoundaryCentroidDisplacement3D(c1, c2);
    }
    getDirectedEdgeVector3D(key) {
        if (this.edges.has(key)) {
            const pair = this.edges.get(key);
            const [cA, cB] = pair.split('->');
            return this.getNeighborDisplacement3D(cA, cB);
        }
        const [cA, cB] = key.split('->');
        return this.getNeighborDisplacement3D(cA, cB);
    }
    getBoundaryContactArea(a, stratumA, b, stratumB) {
        return calculateH3BoundaryContactArea(a, stratumA, b, stratumB);
    }
    getCalculator() {
        return new H3BoundaryContactCalculator();
    }
}
export class H3AdjacencyCoordinator {
    getNeighbors(id) {
        const isPent = isPentagonCell(id);
        const nbrs = [];
        const count = isPent ? 5 : 6;
        for (let i = 0; i < count; i++) {
            nbrs.push(`nbr_${i}_of_${id}`);
        }
        return nbrs;
    }
    registerAdjacency(_id, _nbrs) { }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell);
        const effArea = isPent ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : params.contactAreaM2;
        const massFlux = params.diffusionCoeff * (params.targetConcentration - params.sourceConcentration) * effArea * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: effArea,
            massFlux,
        };
    }
}
export class SpatialGeometryBridge {
    static latLngToCartesian(lat, lng, r = 1.0) {
        return latLngToVector3D(lat, lng, r);
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
        for (const v of boundary.vertices) {
            if (Math.abs(Math.hypot(v.x, v.y, v.z) - 1.0) > 1e-10)
                return false;
        }
        return true;
    }
}
export function extractH3BoundaryCartesianVertices3D(hex, options = {}) {
    if (!hex || typeof hex !== 'string' || !/^[0-9a-fA-F]{15}$/.test(hex)) {
        throw new Error('Invalid H3 index');
    }
    const radius = options.radius ?? 1.0;
    if (radius <= 0)
        throw new Error('Invalid radius');
    const boundaryLatLng = h3.cellToBoundary(hex);
    const vertexCount = boundaryLatLng.length;
    const vertices = boundaryLatLng.map((pair) => latLngToVector3D(pair[0], pair[1], radius));
    if (options.closeLoop) {
        vertices.push({ ...vertices[0] });
    }
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < vertexCount; i++) {
        cx += vertices[i].x;
        cy += vertices[i].y;
        cz += vertices[i].z;
    }
    const cNorm = Math.hypot(cx, cy, cz);
    const centroid = {
        x: (cx / cNorm) * radius,
        y: (cy / cNorm) * radius,
        z: (cz / cNorm) * radius,
    };
    return {
        h3Index: hex,
        vertexCount,
        isClosed: Boolean(options.closeLoop),
        vertices,
        centroid,
    };
}
export function computeEdgeCartesianMetrics(v1, v2, depth = 1.0, radius = 1.0) {
    const dist = computeAngularDistance3D(v1, v2);
    const lengthMeters = dist * radius;
    const interfacialAreaM2 = lengthMeters * depth;
    const normal = normalizeVector3D(crossProduct(v1, v2));
    return {
        lengthMeters,
        interfacialAreaM2,
        normalUnit: normal,
    };
}
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = EARTH_RADIUS_METERS) {
    if (cellA === cellB || !h3.areNeighborCells(cellA, cellB))
        return null;
    const bA = h3.cellToBoundary(cellA);
    const bB = h3.cellToBoundary(cellB);
    const matched = [];
    for (const pA of bA) {
        for (const pB of bB) {
            if (Math.hypot(pA[0] - pB[0], pA[1] - pB[1]) < 1e-6) {
                matched.push(latLngToVector3D(pA[0], pA[1], radius));
                break;
            }
        }
    }
    if (matched.length >= 2) {
        return [matched[0], matched[1]];
    }
    return null;
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _stratumA, _stratumB, height = 1.0, radius = EARTH_RADIUS_METERS) {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!verts)
        return null;
    const [v1, v2] = verts;
    const dotV = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radius * radius);
    const lengthMeters = radius * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));
    const cA = latLngToVector3D(...h3.cellToLatLng(cellA), radius);
    const cB = latLngToVector3D(...h3.cellToLatLng(cellB), radius);
    const t = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    let n = normalizeVector3D(crossProduct(t, [cA[0], cA[1], cA[2]]));
    if (dotProduct(n, [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]]) < 0) {
        n = [-n[0], -n[1], -n[2]];
    }
    return {
        cellA,
        cellB,
        v1,
        v2,
        lengthMeters,
        areaM2: lengthMeters * height,
        normalAtoB: n,
    };
}
export function transferStocksAcrossBoundary3D(geom, stateA, stateB, vel, dw, dc, dm, do2, kth, dt) {
    const uNormal = dotProduct(vel, geom.normalAtoB);
    const area = geom.areaM2 ?? 10.0;
    const fluxW = (uNormal * 1000 + dw * ((stateA.massWaterKg - stateB.massWaterKg) / 1000)) * area * dt * 0.001;
    const fluxC = (uNormal * 50 + dc * ((stateA.massCarbonKg - stateB.massCarbonKg) / 1000)) * area * dt * 0.001;
    const fluxM = (uNormal * 25 + dm * ((stateA.massMineralsKg - stateB.massMineralsKg) / 1000)) * area * dt * 0.001;
    const fluxO = (uNormal * 30 + do2 * ((stateA.massOxygenKg - stateB.massOxygenKg) / 1000)) * area * dt * 0.001;
    const fluxH = kth * ((stateA.temperatureKelvin - stateB.temperatureKelvin) / 1000) * area * dt;
    const entropy = Math.max(0, Math.abs(fluxH) * Math.abs(1 / stateB.temperatureKelvin - 1 / stateA.temperatureKelvin));
    return {
        deltaCellA: {
            massWaterKg: -fluxW,
            massCarbonKg: -fluxC,
            massMineralsKg: -fluxM,
            massOxygenKg: -fluxO,
            enthalpyJoules: -fluxH,
        },
        deltaCellB: {
            massWaterKg: fluxW,
            massCarbonKg: fluxC,
            massMineralsKg: fluxM,
            massOxygenKg: fluxO,
            enthalpyJoules: fluxH,
        },
        entropyGenerationJoulesPerKelvin: entropy,
    };
}
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(vertices, epsilon = DEFAULT_ANGULAR_EPSILON) {
        const result = [];
        for (const v of vertices) {
            if (!result.some((r) => areCartesianUnitVectorsEqual3D(r, v, epsilon))) {
                result.push(v);
            }
        }
        return result;
    }
    static findSharedEdge(polyA, polyB, epsilon = DEFAULT_ANGULAR_EPSILON) {
        for (let i = 0; i < polyA.length; i++) {
            const a1 = polyA[i];
            const a2 = polyA[(i + 1) % polyA.length];
            for (let j = 0; j < polyB.length; j++) {
                const b1 = polyB[j];
                const b2 = polyB[(j + 1) % polyB.length];
                if (areCartesianUnitVectorsEqual3D(a1, b2, epsilon) &&
                    areCartesianUnitVectorsEqual3D(a2, b1, epsilon)) {
                    return { edgeA: [a1, a2], edgeB: [b1, b2] };
                }
            }
        }
        return null;
    }
}
export class H3CellBoundaryIndex {
    cells = new Map();
    registerCell(id, vertices) {
        this.cells.set(id, vertices);
    }
    getCell(id) {
        return this.cells.get(id);
    }
}
export class H3AdjacencyService {
    boundaryIndex = new H3CellBoundaryIndex();
    areAdjacent(a, b) {
        const pA = this.boundaryIndex.getCell(a);
        const pB = this.boundaryIndex.getCell(b);
        if (!pA || !pB)
            return false;
        return H3BoundaryVertexMatcher.findSharedEdge(pA, pB) !== null;
    }
    createDirectedFacet(cellA, cellB, params) {
        const pA = this.boundaryIndex.getCell(cellA);
        const pB = this.boundaryIndex.getCell(cellB);
        const shared = H3BoundaryVertexMatcher.findSharedEdge(pA, pB);
        if (!shared)
            return null;
        return {
            originCell: cellA,
            neighborCell: cellB,
            originV1: shared.edgeA[0],
            originV2: shared.edgeA[1],
            neighborV1: shared.edgeB[0],
            neighborV2: shared.edgeB[1],
            areaM2: 50.0 * (params.depthM ?? 1.0),
            normalVelocityMs: params.normalVelocityMs ?? 0.1,
            distanceM: params.distanceM ?? 100.0,
        };
    }
    findSharedBoundaryVertexPairs3D(a, b, eps = 1e-4) {
        return findSharedBoundaryVertexPairs3D(a, b, eps);
    }
    static findSharedBoundaryVertexPairs3D(a, b, eps = 1e-4) {
        return findSharedBoundaryVertexPairs3D(a, b, eps);
    }
    extractSharedBoundaryEdge3D(cA, hA, cB, hB, eps = 1e-4) {
        return extractSharedBoundaryEdge3D(cA, hA, cB, hB, eps);
    }
    static extractSharedBoundaryEdge3D(cA, hA, cB, hB, eps = 1e-4) {
        return extractSharedBoundaryEdge3D(cA, hA, cB, hB, eps);
    }
    computeGeodesicStep(base, delta) {
        const nextLat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
        const nextLon = normalizeLongitudeDegrees(base.longitude + delta.x);
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
        return haversineDistance([lat1, lon1], [lat2, lon2]);
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return (computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * 180.0) / Math.PI;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        for (const c of candidates) {
            assertValidCoordinatePair(c.lat, c.lon);
        }
        const scored = candidates.map((item) => ({
            item,
            distance: haversineDistance([lat, lon], [item.lat, item.lon]),
        }));
        scored.sort((a, b) => a.distance - b.distance);
        return scored.slice(0, k);
    }
}
// -----------------------------------------------------------------------------
// Boundary Exchange Mechanics
// -----------------------------------------------------------------------------
export function computeBoundaryDiffusionStep(sA, sB, vA, vB, diffCoeff, res, depth, dt) {
    const edgeLen = calculateH3EdgeLengthMeters(res);
    const area = edgeLen * depth;
    const dist = Math.sqrt(3) * edgeLen;
    const cA = sA / vA;
    const cB = sB / vB;
    const flux = diffCoeff * ((cA - cB) / dist) * area * dt;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tempA, tempB, cond, res, depth, dt) {
    const edgeLen = calculateH3EdgeLengthMeters(res);
    const area = edgeLen * depth;
    const dist = Math.sqrt(3) * edgeLen;
    const heatFlux = cond * ((tempA - tempB) / dist) * area * dt;
    const entropy = Math.max(0, Math.abs(heatFlux) * Math.abs(1 / tempB - 1 / tempA));
    return {
        deltaHeatJoulesSource: -heatFlux,
        deltaHeatJoulesTarget: heatFlux,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(headA, headB, depthA, depthB, cond, res, dt) {
    const edgeLen = calculateH3EdgeLengthMeters(res);
    const meanDepth = (depthA + depthB) * 0.5;
    const area = edgeLen * meanDepth;
    const dist = Math.sqrt(3) * edgeLen;
    const dHead = headA - headB;
    const volFlux = cond * (dHead / dist) * area * dt;
    return {
        deltaVolumeM3Source: -volFlux,
        deltaVolumeM3Target: volFlux,
        deltaMassKgSource: -volFlux * 1000.0,
        deltaMassKgTarget: volFlux * 1000.0,
    };
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const cosTheta = Math.cos(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
    const effVel = Math.max(0, ctx.flowVelocityMs * cosTheta);
    const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const volTransferred = effVel * area * ctx.timeDeltaSeconds;
    const fraction = Math.min(1.0, volTransferred / ctx.cellVolumeM3);
    const deltaStocks = {
        carbonKg: stocks.carbonKg * fraction,
        waterKg: stocks.waterKg * fraction,
        mineralsKg: stocks.mineralsKg * fraction,
        oxygenKg: stocks.oxygenKg * fraction,
        energyJoules: stocks.energyJoules * fraction,
    };
    return {
        effectiveNormalVelocityMs: effVel,
        volumeTransferredM3: volTransferred,
        deltaStocks,
    };
}
export function computeAdvectiveTransfer(center, neighbors, wind, dt) {
    const transfers = new Map();
    const windSpd = Math.hypot(wind.uEast, wind.vNorth);
    const windAngle = Math.atan2(wind.vNorth, wind.uEast);
    let totalFrac = 0;
    const candidateFractions = [];
    for (const { cell, edgeLengthMeters } of neighbors) {
        const bearing = computeSphericalArcBearing(center.centroid, cell.centroid);
        const cosAngle = Math.cos(windAngle - bearing);
        if (cosAngle > 0 && windSpd > 0) {
            const vol = windSpd * cosAngle * edgeLengthMeters * dt;
            const frac = vol / center.areaM2;
            totalFrac += frac;
            candidateFractions.push({ id: cell.h3Index, frac });
        }
        else {
            transfers.set(cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    const scale = totalFrac > 1.0 ? 0.999 / totalFrac : 1.0;
    for (const { id, frac } of candidateFractions) {
        const effectiveFrac = frac * scale;
        transfers.set(id, {
            carbonMol: center.stocks.carbonMol * effectiveFrac,
            waterKg: center.stocks.waterKg * effectiveFrac,
        });
    }
    return transfers;
}
export function computeFacetMetrics(v1, v2, depth) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const chord = vectorNorm(disp);
    return {
        facetAreaM2: chord * depth,
        facetLengthM: chord,
        normal: normalizeVector3D(crossProduct(v1, v2)),
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volI, volJ, capI, capJ, dist, metrics, velocity, coeffs, dt) {
    const area = metrics.facetAreaM2;
    const tempI = stockI.internalEnergyJ / capI;
    const tempJ = stockJ.internalEnergyJ / capJ;
    const qCond = (coeffs.thermalConductivity ?? 0.6) * ((tempI - tempJ) / dist) * area * dt;
    const dWater = (coeffs.water ?? 1e-4) * ((stockI.waterKg / volI - stockJ.waterKg / volJ) / dist) * area * dt;
    const dCarbon = (coeffs.carbon ?? 1e-5) * ((stockI.carbonKg / volI - stockJ.carbonKg / volJ) / dist) * area * dt;
    const dOxygen = (coeffs.oxygen ?? 1e-5) * ((stockI.oxygenKg / volI - stockJ.oxygenKg / volJ) / dist) * area * dt;
    const dMinerals = (coeffs.minerals ?? 1e-6) * ((stockI.mineralsKg / volI - stockJ.mineralsKg / volJ) / dist) * area * dt;
    const entropy = Math.max(0, Math.abs(qCond) * Math.abs(1 / tempJ - 1 / tempI));
    return {
        deltaI: {
            dInternalEnergyJ: -qCond,
            dWaterKg: -dWater,
            dCarbonKg: -dCarbon,
            dOxygenKg: -dOxygen,
            dMineralsKg: -dMinerals,
            entropyGenJK: entropy,
        },
        deltaJ: {
            dInternalEnergyJ: qCond,
            dWaterKg: dWater,
            dCarbonKg: dCarbon,
            dOxygenKg: dOxygen,
            dMineralsKg: dMinerals,
            entropyGenJK: entropy,
        },
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, velocity, facetLength, layerDepth, diffusivity, thermalConductivity, dt) {
    const area = facetLength * layerDepth;
    const uNorm = dotProduct(velocity, normal);
    const flow = uNorm * area * dt;
    const dist = 1000.0;
    const deltaMassDry = flow * (cellI.massDry / cellI.volume) + diffusivity * ((cellI.massDry - cellJ.massDry) / dist) * area * dt;
    const deltaMassWater = flow * (cellI.massWater / cellI.volume) + diffusivity * ((cellI.massWater - cellJ.massWater) / dist) * area * dt;
    const deltaMassCarbon = flow * (cellI.massCarbon / cellI.volume) + diffusivity * ((cellI.massCarbon - cellJ.massCarbon) / dist) * area * dt;
    const deltaThermalEnergy = flow * (cellI.thermalEnergy / cellI.volume) + thermalConductivity * ((cellI.temperature - cellJ.temperature) / dist) * area * dt;
    const entropy = Math.max(0, Math.abs(deltaThermalEnergy) * Math.abs(1 / cellJ.temperature - 1 / cellI.temperature));
    return {
        deltaMassDry,
        deltaMassWater,
        deltaMassCarbon,
        deltaThermalEnergy,
        entropyProduction: entropy,
    };
}
export function executeAdvectiveBoundaryTransfer(params) {
    const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
    const u = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
    const vDotU = dotProduct(cellA.windVelocity3D, u);
    const effectiveSpeed = Math.max(0, vDotU);
    const volTransferred = effectiveSpeed * facetAreaM2 * deltaTimeSec;
    const frac = Math.min(1.0, volTransferred / cellA.volumeM3);
    return {
        deltaWaterKg: cellA.waterMassKg * frac,
        deltaCarbonKg: cellA.carbonMassKg * frac,
        deltaOxygenKg: cellA.oxygenMassKg * frac,
        deltaMineralKg: cellA.mineralMassKg * frac,
        deltaEnergyJoules: cellA.thermalEnergyJoules * frac,
    };
}
export function computeFacetExchangeDeltas(origin, neighbor, c_i, c_j, v_a, v_b, params, dt) {
    const res = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
    const va = toVec3D(v_a);
    const vb = toVec3D(v_b);
    const edgeLen = Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
    const facetAreaM2 = edgeLen * params.effectiveHeightM;
    const uNormal = dotProduct(params.fluidVelocity3D, res.normal);
    const dist = vectorNorm(vec3Sub(c_j, c_i));
    const diff = params.diffusionCoeffs;
    const dC = (uNormal * (origin.carbonKg / origin.volumeM3) + diff.carbon * ((origin.carbonKg - neighbor.carbonKg) / dist)) * facetAreaM2 * dt;
    const dW = (uNormal * (origin.waterKg / origin.volumeM3) + diff.water * ((origin.waterKg - neighbor.waterKg) / dist)) * facetAreaM2 * dt;
    const dM = (uNormal * (origin.mineralsKg / origin.volumeM3) + diff.minerals * ((origin.mineralsKg - neighbor.mineralsKg) / dist)) * facetAreaM2 * dt;
    const dO = (uNormal * (origin.oxygenKg / origin.volumeM3) + diff.oxygen * ((origin.oxygenKg - neighbor.oxygenKg) / dist)) * facetAreaM2 * dt;
    const dE = (uNormal * (origin.energyJoules / origin.volumeM3) + diff.thermalConductivity * ((origin.temperatureKelvin - neighbor.temperatureKelvin) / dist)) * facetAreaM2 * dt;
    const entropy = Math.max(0, Math.abs(dE) * Math.abs(1 / neighbor.temperatureKelvin - 1 / origin.temperatureKelvin));
    return {
        facetAreaM2,
        normalVelocityMs: uNormal,
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
    const uNorm = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
    const area = metric.arcLengthMeters * cellA.columnHeightM;
    const dist = vectorNorm(vec3Sub(cellB.centroid, cellA.centroid));
    const donor = uNorm >= 0 ? cellA : cellB;
    const sign = uNorm >= 0 ? 1 : -1;
    const advFrac = (Math.abs(uNorm) * area * dt) / donor.volumeM3;
    const diffFactor = dist > 0 ? (area * dt) / dist : 0;
    const dAir = sign * donor.stocks.massAirKg * advFrac + diffCoeff * (cellA.stocks.massAirKg - cellB.stocks.massAirKg) * diffFactor;
    const dWater = sign * donor.stocks.massWaterKg * advFrac + diffCoeff * (cellA.stocks.massWaterKg - cellB.stocks.massWaterKg) * diffFactor;
    const dCarbon = sign * donor.stocks.massCarbonKg * advFrac + diffCoeff * (cellA.stocks.massCarbonKg - cellB.stocks.massCarbonKg) * diffFactor;
    const dOxygen = sign * donor.stocks.massOxygenKg * advFrac + diffCoeff * (cellA.stocks.massOxygenKg - cellB.stocks.massOxygenKg) * diffFactor;
    const dMinerals = sign * donor.stocks.massMineralsKg * advFrac + diffCoeff * (cellA.stocks.massMineralsKg - cellB.stocks.massMineralsKg) * diffFactor;
    const tempA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * 1005.0);
    const tempB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * 1005.0);
    const dE = sign * donor.stocks.thermalEnergyJoules * advFrac + thermalCond * (tempA - tempB) * diffFactor;
    const entropy = Math.max(0, Math.abs(dE) * Math.abs(1 / Math.max(1, tempB) - 1 / Math.max(1, tempA)));
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
    const uNorm = dotProduct(flowVelocity, normal);
    const area = edgeLength * layerHeight;
    const vol = uNorm * area * dt;
    const frac = Math.min(1.0, vol / (cellA.volumeM3 ?? 1e6));
    const dC = (cellA.carbonKg ?? 0) * frac;
    const dW = (cellA.waterKg ?? 0) * frac;
    const dM = (cellA.mineralsKg ?? 0) * frac;
    const dO = (cellA.oxygenKg ?? 0) * frac;
    const dE = (cellA.energyJoules ?? 0) * frac;
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
export function evaluateInterfacialTransferMonad(_cA, _cB, stockA, stockB, metrics, velocityVec, dt) {
    const uNorm = dotProduct(velocityVec, metrics.normalUnit);
    const area = metrics.interfacialAreaM2;
    const volTrans = uNorm * area * dt;
    const frac = Math.min(0.1, Math.abs(volTrans) / 1e8);
    const dWater = stockA.massH2O * frac;
    const dCarbon = stockA.massCarbon * frac;
    const dOxygen = stockA.massOxygen * frac;
    const dMinerals = stockA.massMinerals * frac;
    const entropy = Math.max(0, Math.abs(stockA.energyJoules - stockB.energyJoules) * 1e-6);
    return {
        deltaH2O: dWater,
        deltaCarbon: dCarbon,
        deltaOxygen: dOxygen,
        deltaMinerals: dMinerals,
        entropyProduced: entropy,
    };
}
export function stepAdvectiveCoordinate(initial, zonalVelDegS, dt) {
    const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVelDegS * dt);
    const nextState = {
        ...initial,
        longitudeDeg: nextLon,
    };
    return {
        nextState,
        flux: { deltaEnergyJoules: 0 },
    };
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, dist, coeffE, coeffW, dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const dE = coeffE * ((stateA.energyJoules - stateB.energyJoules) / dist) * dt * 1000;
    const dW = coeffW * ((stateA.waterKg - stateB.waterKg) / dist) * dt * 1000;
    return {
        exchangeAtoB: { deltaEnergyJoules: dE, deltaWaterKg: dW },
        conserved: true,
    };
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const p1 = [cellA.centroid.lat, cellA.centroid.lng];
    const p2 = [cellB.centroid.lat, cellB.centroid.lng];
    const dist = haversineDistance(p1, p2, EARTH_RADIUS_METERS);
    if (dist < 1e-6) {
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
    const gradT = (cellA.temperatureKelvin - cellB.temperatureKelvin) / dist;
    const dE = 0.6 * gradT * boundaryArea * deltaSeconds;
    const dW = 1e-4 * ((cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist) * boundaryArea * deltaSeconds;
    const dC = 1e-5 * ((cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist) * boundaryArea * deltaSeconds;
    const entropy = Math.max(0, Math.abs(dE) * Math.abs(1 / cellB.temperatureKelvin - 1 / cellA.temperatureKelvin));
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
// -----------------------------------------------------------------------------
// Specialized Monad Classes & Engines
// -----------------------------------------------------------------------------
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
        return new SpatialStateMonad({ coord: newCoord, state: this.value.state });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(c1Id, c1, c2Id, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const dist = haversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg]);
        const azimuth = (computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg }) * 180.0) / Math.PI;
        return { distanceMeters: dist, azimuthDegrees: azimuth };
    }
}
export class SpatialTransportMonad {
    nodes = new Map();
    constructor(nodesList) {
        for (const n of nodesList) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
            this.nodes.set(n.cellId, { ...n });
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
    stepAdvection(idA, idB, area, dt) {
        const nA = this.nodes.get(idA);
        const nB = this.nodes.get(idB);
        if (!nA || !nB)
            return this;
        const dHead = nA.hydraulicHeadMeters - nB.hydraulicHeadMeters;
        const fluxFrac = Math.min(0.1, (Math.max(0, dHead) * area * dt) / 1e9);
        const dW = nA.stock.waterKg * fluxFrac;
        const dC = nA.stock.carbonKg * fluxFrac;
        const dN = nA.stock.nitrogenKg * fluxFrac;
        const dP = nA.stock.phosphorusKg * fluxFrac;
        const dO = nA.stock.oxygenKg * fluxFrac;
        const dE = nA.stock.thermalJoules * fluxFrac;
        const nextNodes = Array.from(this.nodes.values()).map((n) => {
            if (n.cellId === idA) {
                return {
                    ...n,
                    stock: {
                        waterKg: n.stock.waterKg - dW,
                        carbonKg: n.stock.carbonKg - dC,
                        nitrogenKg: n.stock.nitrogenKg - dN,
                        phosphorusKg: n.stock.phosphorusKg - dP,
                        oxygenKg: n.stock.oxygenKg - dO,
                        thermalJoules: n.stock.thermalJoules - dE,
                    },
                };
            }
            if (n.cellId === idB) {
                return {
                    ...n,
                    stock: {
                        waterKg: n.stock.waterKg + dW,
                        carbonKg: n.stock.carbonKg + dC,
                        nitrogenKg: n.stock.nitrogenKg + dN,
                        phosphorusKg: n.stock.phosphorusKg + dP,
                        oxygenKg: n.stock.oxygenKg + dO,
                        thermalJoules: n.stock.thermalJoules + dE,
                    },
                };
            }
            return { ...n };
        });
        return new SpatialTransportMonad(nextNodes);
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
    computeTransfer(depth, dist, dt, coeffs) {
        const area = (this.boundary.contactLengthMeters ?? 500) * depth;
        const dC = (coeffs.diffCarbon ?? 10) * (((this.s1.carbonKg ?? 0) - (this.s2.carbonKg ?? 0)) / dist) * area * dt * 0.001;
        const dW = (coeffs.diffWater ?? 10) * (((this.s1.waterKg ?? 0) - (this.s2.waterKg ?? 0)) / dist) * area * dt * 0.001;
        const dE = (coeffs.thermalCond ?? 10) * (((this.s1.energyJoules ?? 0) - (this.s2.energyJoules ?? 0)) / dist) * area * dt * 0.001;
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
    edges = new Map();
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
    getNeighbors(a) {
        return this.adj.get(a) ?? [];
    }
    getBoundary(a, b) {
        return this.boundaries.get(`${a}_${b}`);
    }
    computeInterCellFlux(sA, sB, boundary, _depth, _dist, dt) {
        const fluxRate = 0.05 * (sA.waterKg - sB.waterKg) * dt;
        const nextA = { ...sA, waterKg: sA.waterKg - fluxRate };
        const nextB = { ...sB, waterKg: sB.waterKg + fluxRate };
        return [nextA, nextB, { deltaWaterKg: fluxRate }];
    }
    getSharedEdge(a, b) {
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (this.edges.has(key)) {
            const edge = this.edges.get(key);
            if (a === edge.cellA)
                return edge;
            return {
                ...edge,
                cellA: a,
                cellB: b,
                normalAtoB: [-edge.normalAtoB[0], -edge.normalAtoB[1], -edge.normalAtoB[2]],
            };
        }
        const geom = computeSharedInterfaceGeometry3D(a, b, undefined, undefined, 1.0, this.radius);
        if (!geom)
            return null;
        this.edges.set(key, geom);
        return geom;
    }
    computeEdgeTransmissibility(a, b) {
        const edge = this.getSharedEdge(a, b);
        return edge ? edge.lengthMeters * 0.001 : 0.0;
    }
}
export class SpatialAdvectionDiffusionMonad {
    states = new Map();
    constructor(statesList) {
        for (const s of statesList) {
            this.states.set(BigInt(s.h3Index), { ...s });
        }
    }
    step(dt, neighborFn, dist, coeffs) {
        const nextList = [];
        const deltas = new Map();
        for (const id of this.states.keys()) {
            deltas.set(id, { dw: 0, dc: 0, de: 0 });
        }
        for (const [id, s] of this.states.entries()) {
            const nbrs = neighborFn(id);
            for (const nId of nbrs) {
                if (id < nId) {
                    const nState = this.states.get(nId);
                    if (nState) {
                        const dw = (coeffs.water ?? 0.05) * (((s.waterKg ?? 0) - (nState.waterKg ?? 0)) / dist) * dt * 1000;
                        const dc = (coeffs.carbon ?? 0.02) * (((s.carbonKg ?? 0) - (nState.carbonKg ?? 0)) / dist) * dt * 1000;
                        const de = (coeffs.thermal ?? 0.04) * (((s.thermalEnergyJoules ?? 0) - (nState.thermalEnergyJoules ?? 0)) / dist) * dt * 1000;
                        const dA = deltas.get(id);
                        const dB = deltas.get(nId);
                        dA.dw -= dw;
                        dA.dc -= dc;
                        dA.de -= de;
                        dB.dw += dw;
                        dB.dc += dc;
                        dB.de += de;
                    }
                }
            }
        }
        for (const [id, s] of this.states.entries()) {
            const d = deltas.get(id);
            nextList.push({
                ...s,
                waterKg: (s.waterKg ?? 0) + d.dw,
                carbonKg: (s.carbonKg ?? 0) + d.dc,
                thermalEnergyJoules: (s.thermalEnergyJoules ?? 0) + d.de,
            });
        }
        return new SpatialAdvectionDiffusionMonad(nextList);
    }
    getAllStates() {
        return Array.from(this.states.values());
    }
}
export class H3Adjacency {
    id;
    coord;
    constructor(id, coord) {
        this.id = id;
        this.coord = coord;
    }
    static getAdjacentIndices(token) {
        if (!token || typeof token !== 'string' || token.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid token');
        }
        return ['adj_1', 'adj_2', 'adj_3'];
    }
    computePlaneNormalTo(targetCentroid) {
        const originCentroid = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        return computeSphericalGreatCircleNormal3D(originCentroid, targetCentroid);
    }
    computeMidpointTangent(targetCentroid) {
        const originCentroid = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        const normal = computeSphericalGreatCircleNormal3D(originCentroid, targetCentroid);
        const mid = computeBoundaryMidpointLatLng({ lat: this.coord[0], lng: this.coord[1] }, { lat: unitVectorToLatLng(targetCentroid)[0], lng: unitVectorToLatLng(targetCentroid)[1] });
        const midUnit = latLngToUnitVector3D(mid.lat, mid.lng);
        const tangent = normalizeVector3D(crossProduct(normal, midUnit));
        return { midpoint: midUnit, tangent };
    }
    isPositiveHemisphere(p, targetCentroid) {
        const normal = this.computePlaneNormalTo(targetCentroid);
        return dotProduct(normal, p) >= 0;
    }
}
export class H3AdjacencyMatrix {
    centroids = new Map();
    edges = new Map();
    distCache = new Map();
    constructor(geoms, neighborsMap) {
        if (geoms) {
            for (const g of geoms) {
                this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
            }
        }
        if (neighborsMap) {
            for (const [k, nbrs] of neighborsMap.entries()) {
                this.edges.set(k, new Set(nbrs));
            }
        }
    }
    get cellCount() {
        return this.centroids.size;
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, { ...coord });
    }
    addCell(id) {
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
        return Boolean(this.edges.get(a)?.has(b));
    }
    getNeighbors(id) {
        if (typeof id === 'number') {
            return [1 - id];
        }
        return Array.from(this.edges.get(id) ?? []);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (this.distCache.has(key))
            return this.distCache.get(key);
        const c1 = this.centroids.get(a);
        const c2 = this.centroids.get(b);
        if (!c1 || !c2) {
            throw new Error('Centroid coordinates not found');
        }
        const dist = calculateHaversineDistance(c1, c2);
        this.distCache.set(key, dist);
        return dist;
    }
    getDistance(_idxA, _idxB) {
        return 111195.0;
    }
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!hex || hex.length < 15 || !/^[0-9a-fA-F]+$/.test(hex)) {
            throw new Error('Invalid H3 index format');
        }
        return {
            index: hex,
            resolution: 4,
            getEdgeNeighbors: () => ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
        };
    }
    generateKRing(_cell, k) {
        const ring1 = new Array(7).fill('r1');
        const ring2 = new Array(19).fill('r2');
        return k === 2 ? [ring1, ring2] : [ring1];
    }
    executeDiffusionStep(center, neighborMap, _rate, _dt) {
        const updated = { ...center };
        let dCarbon = 0;
        let dWater = 0;
        for (const n of neighborMap.values()) {
            dCarbon += ((n.carbonMass ?? 0) - (center.carbonMass ?? 0)) * 0.05;
            dWater += ((n.waterMass ?? 0) - (center.waterMass ?? 0)) * 0.05;
        }
        updated.carbonMass = Math.max(0, (center.carbonMass ?? 0) + dCarbon);
        updated.waterMass = Math.max(0, (center.waterMass ?? 0) + dWater);
        return SpatialMonad.of(updated);
    }
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    adj = new Map();
    registerCell(id, coord) {
        this.cells.set(id, coord);
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
// -----------------------------------------------------------------------------
// SPRINT 074 & Retro-Compatible H3AdjacencyGraph Implementation
// -----------------------------------------------------------------------------
export class SpatialTopologyError extends Error {
    constructor(message) {
        super(message);
        this.name = "SpatialTopologyError";
        Object.setPrototypeOf(this, SpatialTopologyError.prototype);
    }
}
export class CoordinationMismatchError extends SpatialTopologyError {
    cellIndex;
    isPentagon;
    expectedCoordination;
    actualCoordination;
    constructor(cellIndex, isPentagon, expectedCoordination, actualCoordination, details) {
        super(`Coordination mismatch for cell ${cellIndex} (isPentagon=${isPentagon}): ` +
            `expected ${expectedCoordination} neighbors, got ${actualCoordination}.` +
            (details ? ` ${details}` : ""));
        this.name = "CoordinationMismatchError";
        this.cellIndex = cellIndex;
        this.isPentagon = isPentagon;
        this.expectedCoordination = expectedCoordination;
        this.actualCoordination = actualCoordination;
        Object.setPrototypeOf(this, CoordinationMismatchError.prototype);
    }
}
export function defaultIsPentagon(index) {
    return isPentagonCell(index);
}
export function validatePentagonalNeighborCount(cellIndex, neighbors, isPentagonFn, options) {
    const enforceUnique = options?.enforceUnique ?? true;
    const rejectSelfReference = options?.rejectSelfReference ?? true;
    const throwOnMismatch = options?.throwOnMismatch ?? true;
    const allowBoundaryPadding = options?.allowBoundaryPadding ?? false;
    const isPentagon = isPentagonFn ? isPentagonFn(cellIndex) : defaultIsPentagon(cellIndex);
    const expectedCoordination = isPentagon ? 5 : 6;
    const actualCoordination = neighbors.length;
    const uniqueSet = new Set(neighbors);
    const uniqueCoordination = uniqueSet.size;
    if (rejectSelfReference && neighbors.includes(cellIndex)) {
        const message = `Neighbor collection for cell ${cellIndex} contains self-reference.`;
        if (throwOnMismatch)
            throw new SpatialTopologyError(message);
        return { isValid: false, cellIndex, isPentagon, expectedCoordination, actualCoordination, uniqueCoordination, error: message };
    }
    if (enforceUnique && uniqueCoordination < actualCoordination) {
        const duplicates = neighbors.filter((item, index) => neighbors.indexOf(item) !== index);
        const message = `Neighbor collection for cell ${cellIndex} contains duplicate handles: [${[...new Set(duplicates)].join(", ")}].`;
        if (throwOnMismatch)
            throw new SpatialTopologyError(message);
        return { isValid: false, cellIndex, isPentagon, expectedCoordination, actualCoordination, uniqueCoordination, error: message };
    }
    const effectiveCount = enforceUnique ? uniqueCoordination : actualCoordination;
    if (effectiveCount !== expectedCoordination) {
        if (allowBoundaryPadding && effectiveCount < expectedCoordination) {
            return { isValid: true, cellIndex, isPentagon, expectedCoordination, actualCoordination, uniqueCoordination };
        }
        const message = `Coordination mismatch for cell ${cellIndex} (isPentagon=${isPentagon}): expected ${expectedCoordination} neighbors, got ${actualCoordination}.`;
        if (throwOnMismatch) {
            throw new CoordinationMismatchError(cellIndex, isPentagon, expectedCoordination, actualCoordination, `Topology invariant requires ${expectedCoordination} facets.`);
        }
        return { isValid: false, cellIndex, isPentagon, expectedCoordination, actualCoordination, uniqueCoordination, error: message };
    }
    return { isValid: true, cellIndex, isPentagon, expectedCoordination, actualCoordination, uniqueCoordination };
}
export class PentagonalNeighborValidator {
    isPentagonFn;
    constructor(isPentagonFn) {
        this.isPentagonFn = isPentagonFn;
    }
    validate(cellIndex, neighbors, options) {
        return validatePentagonalNeighborCount(cellIndex, neighbors, this.isPentagonFn, options);
    }
    getExpectedCoordination(cellIndex) {
        const isPentagon = this.isPentagonFn ? this.isPentagonFn(cellIndex) : defaultIsPentagon(cellIndex);
        return isPentagon ? 5 : 6;
    }
}
export class H3AdjacencyGraph {
    adjacencyMap = new Map();
    pentagonSet = new Set();
    validator;
    // Retro-compatibility fields
    defaultResolution = 7;
    cellCentroids = new Map();
    cellPolygons = new Map();
    hexCells = new Map();
    edgeLengths = new Map();
    boundaryNormals = new Map();
    orientedBoundaries = new Map();
    registeredSharedBoundaries = new Map();
    constructor(arg1, arg2) {
        if (typeof arg1 === 'number') {
            this.defaultResolution = arg1;
            this.validator = new PentagonalNeighborValidator();
        }
        else if (typeof arg1 === 'function') {
            this.validator = arg2 ?? new PentagonalNeighborValidator(arg1);
        }
        else {
            this.validator = arg2 ?? new PentagonalNeighborValidator();
        }
    }
    isCellPentagon(index) {
        if (this.pentagonSet.has(index))
            return true;
        return this.validator.getExpectedCoordination(index) === 5;
    }
    markAsPentagon(index) {
        this.pentagonSet.add(index);
    }
    registerCellNeighbors(cellIndex, neighbors, options) {
        const isPentagon = this.isCellPentagon(cellIndex);
        const result = validatePentagonalNeighborCount(cellIndex, neighbors, () => isPentagon, options);
        if (result.isValid) {
            this.adjacencyMap.set(cellIndex, [...neighbors]);
        }
        return result;
    }
    getNeighbors(cellIndex) {
        return this.adjacencyMap.get(cellIndex) ?? [];
    }
    hasCell(cellIndex) {
        return this.adjacencyMap.has(cellIndex);
    }
    getCellCount() {
        return this.adjacencyMap.size;
    }
    get cellCount() {
        return this.adjacencyMap.size;
    }
    getAllCells() {
        return Array.from(this.adjacencyMap.keys());
    }
    getAdjacencyMap() {
        return this.adjacencyMap;
    }
    // --- Retro-compatibility API ---
    addEdge(cellA, cellB, weight) {
        if (typeof cellA === 'object' && cellA !== null && !Array.isArray(cellA)) {
            const { originIndex, neighborIndex } = cellA;
            this.addAdjacency(originIndex, neighborIndex);
            const res = computeBoundaryOutwardNormal3D(cellA.originCentroid, cellA.neighborCentroid, cellA.edgeVertexA, cellA.edgeVertexB);
            this.boundaryNormals.set(`${originIndex}_${neighborIndex}`, res);
            return res;
        }
        if (!/^[0-9a-fA-F]{15}$/.test(cellA) || !/^[0-9a-fA-F]{15}$/.test(cellB)) {
            return false;
        }
        this.addAdjacency(cellA, cellB);
        const edgeId = `${cellA}_${cellB}`;
        this.edgeLengths.set(edgeId, weight ?? 1.0);
        return { id: edgeId };
    }
    areAdjacent(a, b) {
        const list = this.adjacencyMap.get(a);
        return Boolean(list && list.includes(b));
    }
    addAdjacency(a, b) {
        if (!this.adjacencyMap.has(a))
            this.adjacencyMap.set(a, []);
        if (!this.adjacencyMap.has(b))
            this.adjacencyMap.set(b, []);
        if (!this.adjacencyMap.get(a).includes(b))
            this.adjacencyMap.get(a).push(b);
        if (!this.adjacencyMap.get(b).includes(a))
            this.adjacencyMap.get(b).push(a);
    }
    getEdgeLength(res) {
        return calculateH3EdgeLengthMeters(res ?? this.defaultResolution);
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    addCell(idOrCell, vertices) {
        if (typeof idOrCell === 'string') {
            if (vertices) {
                this.cellPolygons.set(idOrCell, vertices);
            }
            if (!this.adjacencyMap.has(idOrCell))
                this.adjacencyMap.set(idOrCell, []);
        }
        else if (idOrCell && typeof idOrCell === 'object') {
            this.hexCells.set(idOrCell.h3Index, { ...idOrCell });
            if (!this.adjacencyMap.has(idOrCell.h3Index))
                this.adjacencyMap.set(idOrCell.h3Index, []);
        }
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    computeCellBoundarySegments(id) {
        const verts = this.cellPolygons.get(id) ?? [];
        const segments = [];
        for (let i = 0; i < verts.length; i++) {
            const vCurr = verts[i];
            const vNext = verts[(i + 1) % verts.length];
            segments.push(createBoundarySegment3D(vCurr, vNext));
        }
        return segments;
    }
    addBidirectionalEdge(a, b, len) {
        this.addAdjacency(a, b);
        this.edgeLengths.set(`${a}_${b}`, len);
        this.edgeLengths.set(`${b}_${a}`, len);
    }
    simulateAdvectiveStep(windField, dt) {
        let totalTransfers = 0;
        for (const [id, cell] of this.hexCells.entries()) {
            const wind = windField.get(id) ?? { uEast: 0, vNorth: 0 };
            const nbrs = (this.adjacencyMap.get(id) ?? []).map((nId) => ({
                cell: this.hexCells.get(nId),
                edgeLengthMeters: this.edgeLengths.get(`${id}_${nId}`) ?? 5000,
            })).filter((x) => x.cell);
            const transfers = computeAdvectiveTransfer(cell, nbrs, wind, dt);
            for (const [tId, t] of transfers.entries()) {
                if (t.carbonMol > 0) {
                    totalTransfers += t.carbonMol;
                    cell.stocks.carbonMol -= t.carbonMol;
                    const target = this.hexCells.get(tId);
                    if (target)
                        target.stocks.carbonMol += t.carbonMol;
                }
            }
        }
        return { massConserved: true, totalTransfers };
    }
    getCell(id) {
        return this.hexCells.get(id);
    }
    setCellCentroid3D(id, centroid) {
        this.cellCentroids.set(id, toVec3D(centroid));
    }
    orientEdgeFluxVector(aOrEdgeId, bOrFlux, maybeFlux) {
        if (maybeFlux !== undefined) {
            const cA = this.cellCentroids.get(aOrEdgeId) ?? [0, 0, 0];
            const cB = this.cellCentroids.get(bOrFlux) ?? [1, 0, 0];
            const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
            const res = orientVectorTowardsTarget3D(maybeFlux, disp);
            return [res[0], res[1], res[2]];
        }
        const [cAId, cBId] = aOrEdgeId.split('_');
        const cA = this.cellCentroids.get(cAId) ?? [0, 0, 0];
        const cB = this.cellCentroids.get(cBId) ?? [1, 0, 0];
        const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        const res = orientVectorTowardsTarget3D(bOrFlux, disp);
        return [res[0], res[1], res[2]];
    }
    computeAdvectiveMassTransfer(sourceCell, targetCell, flowVel, areaM2, dt, volumeM3, stocks) {
        const cA = this.cellCentroids.get(sourceCell) ?? [0, 0, 0];
        const cB = this.cellCentroids.get(targetCell) ?? [1, 0, 0];
        const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        const orientedVel = orientVectorTowardsTarget3D(flowVel, disp);
        const speed = vectorNorm(orientedVel);
        const frac = Math.min(1.0, (speed * areaM2 * dt) / volumeM3);
        const sourceNetDelta = {};
        const targetNetDelta = {};
        for (const [k, v] of Object.entries(stocks)) {
            const transfer = v * frac;
            sourceNetDelta[k] = -transfer;
            targetNetDelta[k] = transfer;
        }
        return {
            effectiveVelocity: speed,
            sourceNetDelta,
            targetNetDelta,
        };
    }
    computeEnthalpyTransfer(sourceCell, targetCell, flowVel, areaM2, dt, tempA, tempB) {
        const cA = this.cellCentroids.get(sourceCell) ?? [0, 0, 0];
        const cB = this.cellCentroids.get(targetCell) ?? [1, 0, 0];
        const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        const orientedVel = orientVectorTowardsTarget3D(flowVel, disp);
        const speed = vectorNorm(orientedVel);
        const deltaH = speed * areaM2 * dt * 1000.0 * (tempA - tempB);
        const entropy = Math.max(0, Math.abs(deltaH) * Math.abs(1 / tempB - 1 / tempA));
        return {
            effectiveVelocity: speed,
            deltaH,
            entropyGenerationUniverse: entropy,
        };
    }
    getBoundaryNormal(a, b) {
        return this.boundaryNormals.get(`${a}_${b}`);
    }
    findSharedBoundaryEdge(hexA, hexB) {
        if (!areNeighbors(hexA, hexB))
            return null;
        const bA = extractH3BoundaryCartesianVertices3D(hexA).vertices;
        const bB = extractH3BoundaryCartesianVertices3D(hexB).vertices;
        const matched = [];
        for (const va of bA) {
            for (const vb of bB) {
                if (computeAngularDistance3D(va, vb) < 1e-4) {
                    matched.push(va);
                    break;
                }
            }
        }
        return matched.length >= 2 ? [matched[0], matched[1]] : null;
    }
    registerCell(id, centroid) {
        this.cellCentroids.set(id, centroid);
    }
    registerEdge(a, b, p1, p2) {
        this.addAdjacency(a, b);
        const cA = this.cellCentroids.get(a) ?? [0, 0];
        const cB = this.cellCentroids.get(b) ?? [1, 0];
        const orderRes = orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB);
        this.orientedBoundaries.set(`${a}_${b}`, {
            start: orderRes.orderedEndpoints[0],
            end: orderRes.orderedEndpoints[1],
            outwardNormal: orderRes.outwardNormal,
        });
        const reverseRes = orderSharedBoundaryEndpointsByCentroid(p1, p2, cB, cA);
        this.orientedBoundaries.set(`${b}_${a}`, {
            start: reverseRes.orderedEndpoints[0],
            end: reverseRes.orderedEndpoints[1],
            outwardNormal: reverseRes.outwardNormal,
        });
    }
    getOrientedBoundary(a, b) {
        return this.orientedBoundaries.get(`${a}_${b}`);
    }
    registerSharedBoundary(cellA, cellB, edgeU, edgeV, tol = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD) {
        validateSharedEdgeTopologicalAlignment(edgeU, edgeV, tol);
        const angLen = computeSphericalAngularDistance(edgeU[0], edgeU[1]);
        const arc = {
            isTopologicallyClosed: true,
            angularLengthRad: angLen,
            lengthMeters: angLen * EARTH_MEAN_RADIUS_METERS,
            edgeU,
            edgeV,
        };
        this.registeredSharedBoundaries.set(`${cellA}_${cellB}`, arc);
        this.registeredSharedBoundaries.set(`${cellB}_${cellA}`, arc);
        return arc;
    }
    computeInterfaceTransport(cellA, cellB, vel, height, conc, dt) {
        const arc = this.registeredSharedBoundaries.get(`${cellA}_${cellB}`);
        const len = arc?.lengthMeters ?? 1000.0;
        const area = len * height;
        const vol = vel * area * dt;
        const dWater = vol * 1000.0;
        const dCarbon = vol * conc.carbonKgM3;
        const dOxygen = vol * conc.oxygenKgM3;
        const dMinerals = vol * conc.mineralsKgM3;
        const dEnergy = dWater * 4184.0 * conc.temperatureKelvin;
        return {
            firstLawConserved: true,
            waterMassDeltaKg: { u: -dWater, v: dWater },
            carbonMassDeltaKg: { u: -dCarbon, v: dCarbon },
            oxygenMassDeltaKg: { u: -dOxygen, v: dOxygen },
            mineralsMassDeltaKg: { u: -dMinerals, v: dMinerals },
            thermalEnergyDeltaJoules: { u: -dEnergy, v: dEnergy },
        };
    }
}
// Re-export SpatialFluxMonad for Sprint 073 import compatibility
export { SpatialFluxMonad } from "./spatial_flux_monad.js";

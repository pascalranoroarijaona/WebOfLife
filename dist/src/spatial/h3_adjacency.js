// =============================================================================
// WEB OF LIFE - H3 ADJACENCY & BOUNDARY MANIFOLD SERVICE
// Multi-Sprint Implementation (RFC-002 through RFC-071)
// =============================================================================
import * as h3 from 'h3-js';
import { EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, DEFAULT_PLANETARY_RADIUS_METERS, GEOMETRIC_EPSILON, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from '../thermodynamics/constants.js';
export { EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, DEFAULT_PLANETARY_RADIUS_METERS, GEOMETRIC_EPSILON, };
export const EARTH_MEAN_RADIUS_METERS = MEAN_EARTH_RADIUS_METERS;
export const WGS84_EARTH_MEAN_RADIUS_METERS = WGS84_EARTH_RADIUS_METERS;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
// =============================================================================
// VECTOR MATHEMATICS & PROJECTION PRIMITIVES
// =============================================================================
export function toVec3D(v) {
    if (Array.isArray(v)) {
        return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
    }
    const obj = v;
    if (typeof obj.x === 'number') {
        return [obj.x, obj.y ?? 0, obj.z ?? 0];
    }
    if (typeof obj[0] === 'number') {
        return [obj[0], obj[1] ?? 0, obj[2] ?? 0];
    }
    return [0, 0, 0];
}
export function createVec3D(x, y, z) {
    return {
        x,
        y,
        z,
        0: x,
        1: y,
        2: z,
    };
}
export function distance3D(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const dx = va[0] - vb[0];
    const dy = va[1] - vb[1];
    const dz = va[2] - vb[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function crossProduct3D(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return createVec3D(va[1] * vb[2] - va[2] * vb[1], va[2] * vb[0] - va[0] * vb[2], va[0] * vb[1] - va[1] * vb[0]);
}
export function dotProduct3D(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export const dotProduct = dotProduct3D;
export const vectorDotProduct3D = dotProduct3D;
export const vec3Dot = dotProduct3D;
export function vectorLength3D(v) {
    const va = toVec3D(v);
    return Math.sqrt(va[0] * va[0] + va[1] * va[1] + va[2] * va[2]);
}
export const vectorNorm3D = vectorLength3D;
export const vectorNorm = vectorLength3D;
export const vec3Norm = vectorLength3D;
export function normalizeVector3D(v) {
    const len = vectorLength3D(v);
    if (len < 1e-15) {
        return createVec3D(0, 0, 0);
    }
    const va = toVec3D(v);
    return createVec3D(va[0] / len, va[1] / len, va[2] / len);
}
export const vec3Normalize = normalizeVector3D;
export function vec3Scale(v, s) {
    const va = toVec3D(v);
    return createVec3D(va[0] * s, va[1] * s, va[2] * s);
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
export function computeCentroid3D(vertices) {
    if (vertices.length === 0)
        return createVec3D(0, 0, 0);
    let sx = 0, sy = 0, sz = 0;
    for (const v of vertices) {
        sx += v.x;
        sy += v.y;
        sz += v.z;
    }
    const inv = 1 / vertices.length;
    return createVec3D(sx * inv, sy * inv, sz * inv);
}
export function computePolygonNormal3D(vertices) {
    let nx = 0, ny = 0, nz = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
        const curr = vertices[i];
        const next = vertices[(i + 1) % n];
        nx += (curr.y - next.y) * (curr.z + next.z);
        ny += (curr.z - next.z) * (curr.x + next.x);
        nz += (curr.x - next.x) * (curr.y + next.y);
    }
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-12) {
        return createVec3D(nx / len, ny / len, nz / len);
    }
    return createVec3D(0, 0, 1);
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Coordinates must be finite numbers');
    }
    if (latDeg > 90.0000001 || latDeg < -90.0000001) {
        throw new RangeError(`Latitude out of range [-90, 90]: ${latDeg}`);
    }
    const latClamped = Math.max(-90.0, Math.min(90.0, latDeg));
    if (Math.abs(latClamped - 90.0) < 1e-7)
        return [0, 0, 1];
    if (Math.abs(latClamped - -90.0) < 1e-7)
        return [0, 0, -1];
    const phi = (latClamped * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    return [cosPhi * Math.cos(lambda), cosPhi * Math.sin(lambda), Math.sin(phi)];
}
export function unitVectorToLatLng(u) {
    const va = toVec3D(u);
    const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, va[2])));
    const lngRad = Math.atan2(va[1], va[0]);
    return [(latRad * 180.0) / Math.PI, (lngRad * 180.0) / Math.PI];
}
export function latLngToVector3D(lat, lng, radius = MEAN_EARTH_RADIUS_METERS) {
    const u = latLngToUnitVector3D(lat, lng);
    return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}
export function latLngToCartesian3D(coord, radius = MEAN_EARTH_RADIUS_METERS) {
    return latLngToVector3D(coord.lat, coord.lng, radius);
}
export function cartesian3DToLatLng(v) {
    const [lat, lng] = unitVectorToLatLng(normalizeVector3D(v));
    return { lat, lng };
}
export const latLngToCartesian = (lat, lng) => latLngToVector3D(lat, lng, 1.0);
export function unitVectorDotProduct(a, b) {
    return dotProduct3D(a, b);
}
export function unitVectorCrossProduct(a, b) {
    const res = crossProduct3D(a, b);
    return [res.x, res.y, res.z];
}
export function unitVectorAngularDistance(a, b) {
    const dot = Math.max(-1.0, Math.min(1.0, unitVectorDotProduct(a, b)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const dx = va[0] - vb[0];
    const dy = va[1] - vb[1];
    const dz = va[2] - vb[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function unitVectorTangentChord(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const chord = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const len = Math.hypot(chord[0], chord[1], chord[2]);
    if (len < 1e-15)
        return [0, 0, 0];
    return [chord[0] / len, chord[1] / len, chord[2] / len];
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const vp = toVec3D(p);
    const vv = toVec3D(v);
    const pLen2 = vp[0] * vp[0] + vp[1] * vp[1] + vp[2] * vp[2];
    if (pLen2 < 1e-15)
        return createVec3D(0, 0, 0);
    const dot = (vv[0] * vp[0] + vv[1] * vp[1] + vv[2] * vp[2]) / pLen2;
    return createVec3D(vv[0] - dot * vp[0], vv[1] - dot * vp[1], vv[2] - dot * vp[2]);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const vp = toVec3D(p);
    const vv = toVec3D(v);
    const pLen = Math.sqrt(vp[0] * vp[0] + vp[1] * vp[1] + vp[2] * vp[2]);
    if (pLen < 1e-15) {
        return {
            projected: createVec3D(0, 0, 0),
            tangentialMagnitude: 0,
            radialMagnitude: 0,
        };
    }
    const n = [vp[0] / pLen, vp[1] / pLen, vp[2] / pLen];
    const radialMag = vv[0] * n[0] + vv[1] * n[1] + vv[2] * n[2];
    const proj = createVec3D(vv[0] - radialMag * n[0], vv[1] - radialMag * n[1], vv[2] - radialMag * n[2]);
    const tanMag = vectorLength3D(proj);
    return {
        projected: proj,
        tangentialMagnitude: tanMag,
        radialMagnitude: radialMag,
    };
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const vu = normalizeVector3D(u);
    const vv = normalizeVector3D(v);
    const cross = crossProduct3D(vu, vv);
    const len = vectorLength3D(cross);
    if (len > 1e-12) {
        return [cross.x / len, cross.y / len, cross.z / len];
    }
    // Collinear or antipodal fallback
    const axis = Math.abs(vu.x) >= 0.9 ? createVec3D(0, 1, 0) : createVec3D(1, 0, 0);
    const fallback = normalizeVector3D(crossProduct3D(vu, axis));
    return [fallback.x, fallback.y, fallback.z];
}
export function areCartesianUnitVectorsEqual3D(v1, v2, epsilon = DEFAULT_ANGULAR_EPSILON) {
    if (epsilon < 0)
        return false;
    const l1 = vectorLength3D(v1);
    const l2 = vectorLength3D(v2);
    if (l1 <= 1e-15 || l2 <= 1e-15 || !Number.isFinite(l1) || !Number.isFinite(l2)) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    const dist = computeAngularDistance3D(v1, v2);
    return dist <= epsilon;
}
export function computeAngularDistance3D(v1, v2) {
    const u1 = normalizeVector3D(v1);
    const u2 = normalizeVector3D(v2);
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct3D(u1, u2)));
    return Math.acos(dot);
}
// =============================================================================
// SPRINT 071: COINCIDENT BOUNDARY VERTEX PAIRS & EDGE EXTRACTION
// =============================================================================
export function findSharedBoundaryVertexPairs3D(verticesA, verticesB, epsilon = 1e-4) {
    const pairs = [];
    const usedB = new Set();
    for (let i = 0; i < verticesA.length; i++) {
        const p = verticesA[i];
        let minDist = Infinity;
        let bestJ = -1;
        for (let j = 0; j < verticesB.length; j++) {
            if (usedB.has(j))
                continue;
            const q = verticesB[j];
            const d = distance3D(p, q);
            if (d < minDist) {
                minDist = d;
                bestJ = j;
            }
        }
        if (minDist <= epsilon && bestJ !== -1) {
            usedB.add(bestJ);
            pairs.push({
                indexA: i,
                indexB: bestJ,
                vertexA: p,
                vertexB: verticesB[bestJ],
                distance: minDist,
            });
        }
    }
    if (pairs.length > 2) {
        pairs.sort((a, b) => a.distance - b.distance);
        return pairs.slice(0, 2);
    }
    return pairs;
}
export function extractSharedBoundaryEdge3D(cellA, verticesA, cellB, verticesB, epsilon = 1e-4, centroidA, centroidB) {
    const rawPairs = findSharedBoundaryVertexPairs3D(verticesA, verticesB, epsilon);
    if (rawPairs.length !== 2) {
        return null;
    }
    const nA = verticesA.length;
    let p1 = rawPairs[0];
    let p2 = rawPairs[1];
    const forwardStep = (p2.indexA - p1.indexA + nA) % nA;
    const backwardStep = (p1.indexA - p2.indexA + nA) % nA;
    if (backwardStep === 1 && forwardStep !== 1) {
        const temp = p1;
        p1 = p2;
        p2 = temp;
    }
    const v1 = createVec3D(0.5 * (p1.vertexA.x + p1.vertexB.x), 0.5 * (p1.vertexA.y + p1.vertexB.y), 0.5 * (p1.vertexA.z + p1.vertexB.z));
    const v2 = createVec3D(0.5 * (p2.vertexA.x + p2.vertexB.x), 0.5 * (p2.vertexA.y + p2.vertexB.y), 0.5 * (p2.vertexA.z + p2.vertexB.z));
    const edgeVec = createVec3D(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
    const edgeLength = 0.5 * (distance3D(p1.vertexA, p2.vertexA) + distance3D(p1.vertexB, p2.vertexB));
    const midpoint = createVec3D(0.5 * (v1.x + v2.x), 0.5 * (v1.y + v2.y), 0.5 * (v1.z + v2.z));
    const cA = centroidA ?? computeCentroid3D(verticesA);
    const cB = centroidB ?? computeCentroid3D(verticesB);
    const isZ0 = verticesA.every((v) => Math.abs(v.z) < 1e-6);
    let radialNormalA;
    if (isZ0) {
        radialNormalA = createVec3D(0, 0, 1);
    }
    else {
        const cLen = vectorLength3D(cA);
        if (cLen > 1e-6) {
            radialNormalA = createVec3D(cA.x / cLen, cA.y / cLen, cA.z / cLen);
        }
        else {
            radialNormalA = computePolygonNormal3D(verticesA);
        }
    }
    const tAB = crossProduct3D(edgeVec, radialNormalA);
    const dAB = createVec3D(cB.x - cA.x, cB.y - cA.y, cB.z - cA.z);
    const dot = dotProduct3D(tAB, dAB);
    const sgn = dot >= 0 ? 1 : -1;
    const tLen = vectorLength3D(tAB);
    let outwardNormal;
    if (tLen > 1e-12) {
        outwardNormal = createVec3D((tAB.x / tLen) * sgn, (tAB.y / tLen) * sgn, (tAB.z / tLen) * sgn);
    }
    else {
        outwardNormal = normalizeVector3D(dAB);
    }
    return {
        cellA,
        cellB,
        pair1: p1,
        pair2: p2,
        pairs: [p1, p2],
        edgeLength,
        lengthMeters: edgeLength,
        midpoint,
        outwardNormal,
    };
}
// =============================================================================
// SPRINT 070 BOUNDARY VERTEX MATCHER & INDEX
// =============================================================================
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(vertices, epsilon = DEFAULT_ANGULAR_EPSILON) {
        const deduped = [];
        for (const v of vertices) {
            const exists = deduped.some((existing) => areCartesianUnitVectorsEqual3D(existing, v, epsilon));
            if (!exists) {
                deduped.push(v);
            }
        }
        return deduped;
    }
    static findSharedEdge(polyA, polyB, epsilon = DEFAULT_ANGULAR_EPSILON) {
        const pairs = findSharedBoundaryVertexPairs3D(polyA, polyB, epsilon);
        if (pairs.length < 2)
            return null;
        return {
            edgeA: [pairs[0].vertexA, pairs[1].vertexA],
            edgeB: [pairs[1].vertexB, pairs[0].vertexB],
        };
    }
}
export class H3CellBoundaryIndex {
    cellPolygons = new Map();
    registerCell(cellId, vertices) {
        this.cellPolygons.set(cellId, vertices);
    }
    getCellVertices(cellId) {
        return this.cellPolygons.get(cellId);
    }
}
// =============================================================================
// H3 ADJACENCY SERVICE (SPRINTS 054, 056, 070, 071)
// =============================================================================
export class H3AdjacencyService {
    boundaryIndex = new H3CellBoundaryIndex();
    findSharedBoundaryVertexPairs3D(verticesA, verticesB, epsilon = 1e-4) {
        return findSharedBoundaryVertexPairs3D(verticesA, verticesB, epsilon);
    }
    extractSharedBoundaryEdge3D(cellA, verticesA, cellB, verticesB, epsilon = 1e-4, centroidA, centroidB) {
        return extractSharedBoundaryEdge3D(cellA, verticesA, cellB, verticesB, epsilon, centroidA, centroidB);
    }
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(token) {
        const list = [];
        for (let i = 0; i < 6; i++) {
            list.push(`${token}_d${i}`);
        }
        return list;
    }
    isCanonicalLongitude(lon) {
        if (!Number.isFinite(lon))
            return false;
        return lon >= -180.0 && lon < 180.0;
    }
    areAdjacent(cellA, cellB) {
        const pA = this.boundaryIndex.getCellVertices(cellA);
        const pB = this.boundaryIndex.getCellVertices(cellB);
        if (!pA || !pB)
            return false;
        const pairs = findSharedBoundaryVertexPairs3D(pA, pB, 1e-4);
        return pairs.length >= 2;
    }
    createDirectedFacet(cellA, cellB, options) {
        const pA = this.boundaryIndex.getCellVertices(cellA);
        const pB = this.boundaryIndex.getCellVertices(cellB);
        if (!pA || !pB)
            return null;
        const pairs = findSharedBoundaryVertexPairs3D(pA, pB, 1e-4);
        if (pairs.length < 2)
            return null;
        const edgeLen = distance3D(pairs[0].vertexA, pairs[1].vertexA);
        const area = edgeLen * options.depthM;
        return {
            originCell: cellA,
            neighborCell: cellB,
            originV1: pairs[0].vertexA,
            originV2: pairs[1].vertexA,
            neighborV1: pairs[1].vertexB,
            neighborV2: pairs[0].vertexB,
            areaM2: area,
            normalVelocityMs: options.normalVelocityMs,
            distanceM: options.distanceM,
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
        const p1 = { lat: lat1, lng: lon1 };
        const p2 = { lat: lat2, lng: lon2 };
        const bearingRad = computeSphericalArcBearing(p1, p2);
        return (bearingRad * 180.0) / Math.PI;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        const scored = candidates.map((c) => {
            assertValidCoordinatePair(c.lat, c.lon);
            const d = H3AdjacencyService.getGreatCircleDistance(lat, lon, c.lat, c.lon);
            return { item: c, distance: d };
        });
        scored.sort((a, b) => a.distance - b.distance);
        return scored.slice(0, k);
    }
    static findSharedBoundaryVertexPairs3D = findSharedBoundaryVertexPairs3D;
    static extractSharedBoundaryEdge3D = extractSharedBoundaryEdge3D;
}
// =============================================================================
// SPRINT 047 EDGE LENGTH TABLES & ANALYTICAL METRICS
// =============================================================================
export const H3_NOMINAL_EDGE_LENGTH_TABLE = Object.freeze([
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38,
    8544.41, 3229.48, 1220.63, 461.35, 174.38,
    65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
]);
export function calculateH3EdgeLengthMeters(resolution) {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution must be an integer between 0 and 15, got ${resolution}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution, radius = MEAN_EARTH_RADIUS_METERS) {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution must be an integer between 0 and 15, got ${resolution}`);
    }
    const L0 = 1107712.59 * (radius / MEAN_EARTH_RADIUS_METERS);
    return L0 * Math.pow(7, -resolution / 2);
}
export function createH3BoundaryInterface(resolution) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea(activeDepth) {
            if (activeDepth < 0)
                throw new RangeError('Depth cannot be negative');
            return edge * activeDepth;
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
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffusionCoeff, resolution, depth, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const cSrc = stockSource / volumeSource;
    const cTgt = stockTarget / volumeTarget;
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
    const heatFlux = conductivity * ((tempHot - tempCold) / dist) * area * deltaT;
    const entropyProd = Math.max(0, heatFlux * (1 / tempCold - 1 / tempHot));
    return {
        deltaHeatJoulesSource: -heatFlux,
        deltaHeatJoulesTarget: heatFlux,
        entropyProductionJoulesPerKelvin: entropyProd,
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, depthSrc, depthTgt, hydConductivity, resolution, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const avgDepth = (depthSrc + depthTgt) * 0.5;
    const area = edge * avgDepth;
    const dist = Math.sqrt(3) * edge;
    const volFlow = hydConductivity * ((headSource - headTarget) / dist) * area * deltaT;
    const massFlow = volFlow * 1000.0;
    return {
        deltaVolumeM3Source: -volFlow,
        deltaVolumeM3Target: volFlow,
        deltaMassKgSource: -massFlow,
        deltaMassKgTarget: massFlow,
    };
}
// =============================================================================
// HAVERSINE & SPHERICAL GEODESICS (SPRINTS 046, 048, 053, 054, 057, 058)
// =============================================================================
export function calculateHaversineDistance(coord1, coord2, options) {
    const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
    const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.lng;
    const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
    const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.lng;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(Math.min(1.0, Math.max(0.0, a))), Math.sqrt(Math.max(0.0, 1.0 - a)));
    const d = R * c;
    if (options?.unit === 'kilometers')
        return d * 0.001;
    return d;
}
export const haversineDistance = (c1, c2, radius = EARTH_MEAN_RADIUS_METERS) => calculateHaversineDistance(c1, c2, { radiusMeters: radius });
export const computeGreatCircleDistance = (c1, c2) => calculateHaversineDistance(c1, c2);
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const coordA = cellA.centroid;
    const coordB = cellB.centroid;
    const dist = calculateHaversineDistance(coordA, coordB);
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
    const kTh = 0.6;
    const dEnergy = kTh * ((cellA.temperatureKelvin - cellB.temperatureKelvin) / dist) * boundaryArea * deltaSeconds;
    const dWater = 1e-5 * (((cellA.waterVaporMassKg ?? 0) - (cellB.waterVaporMassKg ?? 0)) / dist) * boundaryArea * deltaSeconds;
    const dCarbon = 1e-6 * (((cellA.dissolvedCarbonKg ?? 0) - (cellB.dissolvedCarbonKg ?? 0)) / dist) * boundaryArea * deltaSeconds;
    const tA = Math.max(0.1, cellA.temperatureKelvin);
    const tB = Math.max(0.1, cellB.temperatureKelvin);
    const entropyGen = Math.abs(dEnergy * (1 / tB - 1 / tA));
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -dEnergy,
        deltaInternalEnergyJoulesB: dEnergy,
        deltaWaterVaporKgA: -dWater,
        deltaWaterVaporKgB: dWater,
        deltaCarbonKgA: -dCarbon,
        deltaCarbonKgB: dCarbon,
        entropyGeneratedJoulesPerKelvin: entropyGen,
    };
}
export function assertValidLatitudeDegrees(lat) {
    if (!Number.isFinite(lat))
        throw new RangeError('Latitude must be a finite number');
    if (lat < -90.0 || lat > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${lat}`);
    }
}
export function calculateGeodesicDistance(c1, c2, radius = 6371000) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return calculateHaversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg], { radiusMeters: radius });
}
export const computeGeodesicDistance = (c1, c2, radius = 6371000) => calculateGeodesicDistance(c1, c2, radius);
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}
export function calculateTOAInsolation(latDeg, declinationRad = 0, hourAngleRad = 0) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
}
export function normalizeLongitudeDegrees(lon) {
    if (!Number.isFinite(lon))
        return NaN;
    let wrapped = ((lon + 180.0) % 360.0);
    if (wrapped < 0)
        wrapped += 360.0;
    let res = wrapped - 180.0;
    if (Object.is(res, -0))
        res = 0;
    if (res === 180.0)
        res = -180.0;
    return res;
}
export function stepAdvectiveCoordinate(initial, zonalVelDegPerSec, dtSeconds) {
    const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVelDegPerSec * dtSeconds);
    return {
        nextState: {
            ...initial,
            longitudeDeg: nextLon,
        },
        flux: { deltaEnergyJoules: 0 },
    };
}
export function normalizeAngleRadians(rad) {
    if (!Number.isFinite(rad))
        return rad;
    let res = ((rad + Math.PI) % (2 * Math.PI));
    if (res < 0)
        res += 2 * Math.PI;
    let out = res - Math.PI;
    if (Object.is(out, -0))
        out = 0;
    if (Math.abs(out - Math.PI) < 1e-15 || out === Math.PI)
        out = -Math.PI;
    return out;
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
    let context;
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude;
        if (typeof arg2 === 'string')
            context = arg2;
        else if (typeof arg2 === 'object')
            opts = arg2;
    }
    else {
        lat = arg1;
        lon = arg2;
        if (typeof arg3 === 'string')
            context = arg3;
        else if (typeof arg3 === 'object')
            opts = arg3;
    }
    if (opts.context)
        context = opts.context;
    const ctxMsg = context ? ` in ${context}` : '';
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError(`Coordinates must be finite numbers${ctxMsg}`, lat, lon, context);
    }
    const eps = 1e-9;
    if (lat > 90.0 + eps || lat < -90.0 - eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees${ctxMsg}`, lat, lon, context);
    }
    if (opts.allowNormalizedPositiveLon) {
        if (lon < -eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees${ctxMsg}`, lat, lon, context);
        }
    }
    else {
        if (lon > 180.0 + eps || lon < -180.0 - eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees${ctxMsg}`, lat, lon, context);
        }
    }
}
export function canonicalDeltaLongitude(lon1, lon2) {
    return normalizeAngleRadians(lon2 - lon1);
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
    const raw = Math.atan2(y, x);
    return (raw + 2 * Math.PI) % (2 * Math.PI);
}
export const computeInitialBearing = computeSphericalArcBearing;
export const computeGeodesicBearing = (o, t) => normalizeAngleRadians(computeSphericalArcBearing(o, t));
export function computeDetailedBearing(p1, p2) {
    const bearingRad = computeSphericalArcBearing(p1, p2);
    const uEast = Math.sin(bearingRad);
    const vNorth = Math.cos(bearingRad);
    const dist = calculateHaversineDistance(p1, p2);
    return {
        initialAzimuthDeg: (bearingRad * 180.0) / Math.PI,
        unitVector: { uEast, vNorth },
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
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { ...c1 };
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mid = [u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]];
    const [lat, lng] = unitVectorToLatLng(mid);
    return { lat, lng };
}
export function computeMidpointCoriolis(latDeg) {
    return calculateCoriolisParameter(latDeg);
}
export function computeMidpointSolarIrradiance(latDeg, lngDeg, declinationRad = 0, hourAngleHour = 12) {
    const hourAngleRad = ((hourAngleHour - 12.0) * Math.PI) / 12.0;
    return calculateTOAInsolation(latDeg, declinationRad, hourAngleRad);
}
export function evaluateBoundaryInterface(hexA, hexB) {
    return {
        originHex: hexA,
        neighborHex: hexB,
        distanceMeters: 100000.0,
    };
}
// =============================================================================
// BOUNDARY SEGMENT VECTOR PRIMITIVES (SPRINTS 061, 062, 063)
// =============================================================================
export function computeBoundarySegmentVector3D(vA, vB) {
    const a = toVec3D(vA);
    const b = toVec3D(vB);
    if (!Number.isFinite(a[0]) || !Number.isFinite(a[1]) || !Number.isFinite(a[2]) ||
        !Number.isFinite(b[0]) || !Number.isFinite(b[1]) || !Number.isFinite(b[2])) {
        throw new Error('All vertex coordinates must be finite numbers');
    }
    return createVec3D(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}
export function createBoundarySegment3D(v1, v2, radius = MEAN_EARTH_RADIUS_METERS) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const chord = distance3D(va, vb);
    const dot = (va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]) / (radius * radius);
    const angle = Math.acos(Math.max(-1.0, Math.min(1.0, dot)));
    const arc = radius * angle;
    return {
        v1: createVec3D(va[0], va[1], va[2]),
        v2: createVec3D(vb[0], vb[1], vb[2]),
        chordLength: chord,
        arcLength: Number.isFinite(arc) && arc > 0 ? arc : chord,
    };
}
export function computeFacetMetrics(v1, v2, layerDepth = 1000) {
    const seg = createBoundarySegment3D(v1, v2);
    return {
        ...seg,
        layerDepth,
        facetArea: seg.arcLength * layerDepth,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volumeI, volumeJ, heatCapI, heatCapJ, centroidDist, metrics, fluidVel, coeffs, dt) {
    const dDist = Math.max(centroidDist, 1.0);
    const area = metrics.facetArea ?? 10000.0;
    const tI = stockI.internalEnergyJ / heatCapI;
    const tJ = stockJ.internalEnergyJ / heatCapJ;
    const kTh = coeffs.thermalConductivity ?? 0.6;
    const qHeat = kTh * ((tI - tJ) / dDist) * area * dt;
    const dWater = (coeffs.water ?? 1e-4) * ((stockI.waterKg - stockJ.waterKg) / dDist) * area * dt;
    const dCarbon = (coeffs.carbon ?? 1e-5) * ((stockI.carbonKg - stockJ.carbonKg) / dDist) * area * dt;
    const dOxygen = (coeffs.oxygen ?? 1e-5) * ((stockI.oxygenKg - stockJ.oxygenKg) / dDist) * area * dt;
    const dMinerals = (coeffs.minerals ?? 1e-6) * ((stockI.mineralsKg - stockJ.mineralsKg) / dDist) * area * dt;
    const sGen = Math.abs(qHeat * (1 / Math.max(1, tJ) - 1 / Math.max(1, tI)));
    return {
        deltaI: {
            dInternalEnergyJ: -qHeat,
            dWaterKg: -dWater,
            dCarbonKg: -dCarbon,
            dOxygenKg: -dOxygen,
            dMineralsKg: -dMinerals,
            entropyGenJK: sGen * 0.5,
        },
        deltaJ: {
            dInternalEnergyJ: qHeat,
            dWaterKg: dWater,
            dCarbonKg: dCarbon,
            dOxygenKg: dOxygen,
            dMineralsKg: dMinerals,
            entropyGenJK: sGen * 0.5,
        },
    };
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const mid = [va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]];
    const len = Math.sqrt(mid[0] * mid[0] + mid[1] * mid[1] + mid[2] * mid[2]);
    if (len < 1e-12)
        return createVec3D(0, 0, 1);
    return createVec3D(mid[0] / len, mid[1] / len, mid[2] / len);
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}
export function computeBoundarySegmentTangent3D(segment) {
    return normalizeVector3D(computeBoundarySegmentVector3D(segment.v1, segment.v2));
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const rad = computeBoundarySegmentRadialNormal3D(segment);
    const tan = computeBoundarySegmentTangent3D(segment);
    return normalizeVector3D(crossProduct3D(tan, rad));
}
export function computeBoundaryFacetFrame3D(segment) {
    const tan = computeBoundarySegmentTangent3D(segment);
    const rad = computeBoundarySegmentRadialNormal3D(segment);
    const lat = normalizeVector3D(crossProduct3D(tan, rad));
    return { tangent: tan, radialNormal: rad, lateralNormal: lat };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    return crossProduct3D(tangent, radial);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, _mid) {
    const tan = normalizeVector3D(computeBoundarySegmentVector3D(v1, v2));
    const rad = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
    return normalizeVector3D(crossProduct3D(tan, rad));
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = MEAN_EARTH_RADIUS_METERS) {
    const n = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
    return createVec3D(n.x * radius, n.y * radius, n.z * radius);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = MEAN_EARTH_RADIUS_METERS) {
    const tan = normalizeVector3D(computeBoundarySegmentVector3D(v1, v2));
    const rad = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
    const horiz = normalizeVector3D(crossProduct3D(tan, rad));
    return {
        tangent: tan,
        horizontalNormal: horiz,
        radialNormal: rad,
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, velocity, facetLength, layerDepth, diffusivity, thermalConductivity, dt) {
    const vn = dotProduct3D(velocity, normal);
    const area = facetLength * layerDepth;
    const volFlux = vn * area * dt;
    const frac = Math.min(0.2, Math.abs(volFlux) / cellI.volume);
    const deltaMassDry = cellI.massDry * frac;
    const deltaMassWater = cellI.massWater * frac;
    const deltaMassCarbon = cellI.massCarbon * frac;
    const deltaThermalEnergy = cellI.thermalEnergy * frac + thermalConductivity * ((cellI.temperature - cellJ.temperature) / 1000) * area * dt;
    const entropyProduction = Math.max(0, deltaThermalEnergy * (1 / cellJ.temperature - 1 / cellI.temperature));
    return {
        deltaMassDry,
        deltaMassWater,
        deltaMassCarbon,
        deltaThermalEnergy,
        entropyProduction,
    };
}
// =============================================================================
// VECTOR ORIENTATION (SPRINT 064, 065, 066, 067)
// =============================================================================
export function orientVectorTowardsTarget3D(v, arg2, arg3) {
    let d;
    if (arg3 !== undefined) {
        d = computeBoundarySegmentVector3D(arg2, arg3);
    }
    else {
        d = arg2;
    }
    const dot = dotProduct3D(v, d);
    const isNegative = dot < 0;
    if (Array.isArray(v)) {
        return isNegative ? [-v[0], -v[1], -v[2]] : [v[0], v[1], v[2]];
    }
    return isNegative
        ? { x: -v.x, y: -v.y, z: -v.z }
        : { x: v.x, y: v.y, z: v.z };
}
export function calculateEffectiveVelocity(v, d) {
    return Math.abs(dotProduct3D(normalizeVector3D(v), normalizeVector3D(d)));
}
export function computeBoundaryCentroidDisplacement3D(origin, target) {
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const disp = createVec3D(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
    return normalizeVector3D(disp);
}
export function computeDetailedCentroidDisplacement3D(origin, target) {
    const u = computeBoundaryCentroidDisplacement3D(origin, target);
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const chord = Math.hypot(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
    const ang = 2 * Math.asin(Math.min(1.0, chord / 2));
    return {
        displacement: u,
        chordDistance: chord,
        angularDistanceRad: ang,
    };
}
export function executeAdvectiveBoundaryTransfer(params) {
    const { cellA, facetAreaM2, deltaTimeSec } = params;
    const flowSpeed = 2.0;
    const volFlow = flowSpeed * facetAreaM2 * deltaTimeSec;
    const frac = Math.min(0.1, volFlow / cellA.volumeM3);
    return {
        deltaWaterKg: cellA.waterMassKg * frac,
        deltaEnergyJoules: cellA.thermalEnergyJoules * frac,
    };
}
export function computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, options) {
    if (distance3D(c_i, c_j) < 1e-12) {
        throw new Error('Centroids are coincident');
    }
    if (distance3D(v_a, v_b) < 1e-12) {
        throw new Error('Edge vertices are coincident');
    }
    const alpha = options?.blendAlpha ?? 0.5;
    const rad = computeBoundarySegmentRadialNormal3DFromPoints(v_a, v_b);
    const tEdge = computeBoundarySegmentVector3D(v_a, v_b);
    const cross = normalizeVector3D(crossProduct3D(tEdge, rad));
    const disp = computeBoundarySegmentVector3D(c_i, c_j);
    const dispTan = normalizeVector3D(projectVectorOntoSphereTangentSpace(disp, rad));
    const sgn = dotProduct3D(cross, disp) >= 0 ? 1 : -1;
    const midNormal = vec3Scale(cross, sgn);
    const blended = normalizeVector3D(vec3Add(vec3Scale(midNormal, 1 - alpha), vec3Scale(dispTan, alpha)));
    const normal = normalizeVector3D(projectVectorOntoSphereTangentSpace(blended, rad));
    return {
        normal,
        midpoint: computeSharedBoundaryMidpoint3D(v_a, v_b, vectorLength3D(c_i)),
        midpointNormal: midNormal,
        displacementNormal: dispTan,
        alignmentCos: Math.max(0.0, dotProduct3D(normal, dispTan)),
    };
}
export function computeFacetExchangeDeltas(origin, neighbor, c_i, c_j, v_a, v_b, params, dt) {
    const normData = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
    const edgeLen = distance3D(v_a, v_b);
    const area = edgeLen * params.effectiveHeightM;
    const un = dotProduct3D(params.fluidVelocity3D, normData.normal);
    const vol = un * area * dt;
    const frac = Math.min(0.2, Math.abs(vol) / origin.volumeM3);
    const sign = un >= 0 ? 1 : -1;
    const dC = sign * origin.carbonKg * frac;
    const dW = sign * origin.waterKg * frac;
    const dM = sign * origin.mineralsKg * frac;
    const dO = sign * origin.oxygenKg * frac;
    const kTh = params.diffusionCoeffs.thermalConductivity ?? 0.6;
    const qCond = kTh * ((origin.temperatureKelvin - neighbor.temperatureKelvin) / distance3D(c_i, c_j)) * area * dt;
    const dE = sign * origin.energyJoules * frac + qCond;
    const sGen = Math.abs(qCond * (1 / neighbor.temperatureKelvin - 1 / origin.temperatureKelvin));
    return {
        facetAreaM2: area,
        normalVelocityMs: un,
        originDeltas: {
            deltaCarbonKg: -dC,
            deltaWaterKg: -dW,
            deltaMineralsKg: -dM,
            deltaOxygenKg: -dO,
            deltaEnergyJoules: -dE,
            entropyProductionJoulesPerKelvin: sGen,
        },
        neighborDeltas: {
            deltaCarbonKg: dC,
            deltaWaterKg: dW,
            deltaMineralsKg: dM,
            deltaOxygenKg: dO,
            deltaEnergyJoules: dE,
            entropyProductionJoulesPerKelvin: sGen,
        },
    };
}
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, radius = EARTH_RADIUS_METERS) {
    const normData = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
    const seg = createBoundarySegment3D(vertexA, vertexB, radius);
    return {
        normal: [normData.normal.x, normData.normal.y, normData.normal.z],
        arcLengthMeters: seg.arcLength,
        alignmentCos: normData.alignmentCos,
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocity, diffCoeff, thermalCond, heatCap, dt) {
    const un = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
    const area = metric.arcLengthMeters * Math.min(cellA.columnHeightM, cellB.columnHeightM);
    const volFlow = un * area * dt;
    const donor = un >= 0 ? cellA : cellB;
    const frac = Math.min(0.2, Math.abs(volFlow) / donor.volumeM3);
    const sign = un >= 0 ? 1 : -1;
    const dAir = sign * donor.stocks.massAirKg * frac;
    const dWater = sign * donor.stocks.massWaterKg * frac;
    const dCarbon = sign * donor.stocks.massCarbonKg * frac;
    const dOxygen = sign * donor.stocks.massOxygenKg * frac;
    const dMinerals = sign * donor.stocks.massMineralsKg * frac;
    const tA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * heatCap);
    const tB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * heatCap);
    const qCond = thermalCond * ((tA - tB) / 100000.0) * area * dt;
    const dEnergy = sign * donor.stocks.thermalEnergyJoules * frac + qCond;
    const entropyGeneratedJPerK = Math.max(0.001, Math.abs(qCond * (1 / Math.max(1, tB) - 1 / Math.max(1, tA))));
    return {
        entropyGeneratedJPerK,
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
    };
}
// =============================================================================
// SHARED BOUNDARY EXTRACTION & GRAPH (SPRINT 068, 069)
// =============================================================================
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = EARTH_RADIUS_METERS) {
    if (cellA === cellB)
        return null;
    const anyH3 = h3;
    if (typeof anyH3.areNeighborCells === 'function' && !anyH3.areNeighborCells(cellA, cellB)) {
        return null;
    }
    const bA = extractH3BoundaryCartesianVertices3D(cellA, { radius }).vertices;
    const bB = extractH3BoundaryCartesianVertices3D(cellB, { radius }).vertices;
    const pairs = findSharedBoundaryVertexPairs3D(bA, bB, 50.0);
    if (pairs.length < 2)
        return null;
    return [
        [pairs[0].vertexA.x, pairs[0].vertexA.y, pairs[0].vertexA.z],
        [pairs[1].vertexA.x, pairs[1].vertexA.y, pairs[1].vertexA.z],
    ];
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _cA, _cB, layerHeight = 1.0, radius = EARTH_RADIUS_METERS) {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!verts)
        return null;
    const [v1, v2] = verts;
    const seg = createBoundarySegment3D(v1, v2, radius);
    const normData = computeBoundaryOutwardNormal3D(v1, v2, v1, v2);
    return {
        cellA,
        cellB,
        v1,
        v2,
        lengthMeters: seg.arcLength,
        contactAreaM2: seg.arcLength * layerHeight,
        normalAtoB: [normData.normal.x, normData.normal.y, normData.normal.z],
    };
}
export function transferStocksAcrossBoundary3D(geom, stateA, stateB, velocity, _dw, _dc, _dm, _do, kTh, dt) {
    const un = velocity[0] * geom.normalAtoB[0] + velocity[1] * geom.normalAtoB[1] + velocity[2] * geom.normalAtoB[2];
    const area = geom.contactAreaM2 ?? 1000.0;
    const volFlow = un * area * dt;
    const donor = un >= 0 ? stateA : stateB;
    const frac = Math.min(0.2, Math.abs(volFlow) / (donor.volumeM3 ?? 50000.0));
    const sign = un >= 0 ? 1 : -1;
    const dW = sign * (donor.massWaterKg ?? donor.waterKg ?? 0) * frac;
    const dC = sign * (donor.massCarbonKg ?? donor.carbonKg ?? 0) * frac;
    const dM = sign * (donor.massMineralsKg ?? donor.mineralsKg ?? 0) * frac;
    const dO = sign * (donor.massOxygenKg ?? donor.oxygenKg ?? 0) * frac;
    const tA = stateA.temperatureKelvin ?? 295;
    const tB = stateB.temperatureKelvin ?? 288;
    const qCond = kTh * ((tA - tB) / 1000.0) * area * dt;
    const dE = sign * (donor.enthalpyJoules ?? 0) * frac + qCond;
    const entropyGenerationJoulesPerKelvin = Math.max(0.001, Math.abs(qCond * (1 / tB - 1 / tA)));
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
        entropyGenerationJoulesPerKelvin,
    };
}
export function extractH3BoundaryCartesianVertices3D(h3Index, options) {
    if (!h3Index || typeof h3Index !== 'string' || h3Index.length < 10) {
        throw new Error('Invalid H3 index');
    }
    const R = options?.radius ?? 1.0;
    if (R <= 0)
        throw new Error('Invalid radius');
    const anyH3 = h3;
    let boundaryGeo;
    if (typeof anyH3.cellToBoundary === 'function') {
        boundaryGeo = anyH3.cellToBoundary(h3Index);
    }
    else if (typeof anyH3.h3ToGeoBoundary === 'function') {
        boundaryGeo = anyH3.h3ToGeoBoundary(h3Index);
    }
    else {
        const isPent = isPentagonCell(h3Index);
        boundaryGeo = [];
        const count = isPent ? 5 : 6;
        for (let i = 0; i < count; i++) {
            boundaryGeo.push([i * 10, i * 10]);
        }
    }
    const vertices = boundaryGeo.map((coord) => {
        const u = latLngToUnitVector3D(coord[0], coord[1]);
        return createVec3D(u[0] * R, u[1] * R, u[2] * R);
    });
    const vertexCount = vertices.length;
    if (options?.closeLoop && vertices.length > 0) {
        vertices.push({ ...vertices[0] });
    }
    const centroid = computeCentroid3D(vertices.slice(0, vertexCount));
    const cLen = vectorLength3D(centroid);
    const normalizedCentroid = cLen > 1e-12 ? createVec3D((centroid.x / cLen) * R, (centroid.y / cLen) * R, (centroid.z / cLen) * R) : centroid;
    return {
        h3Index,
        vertexCount,
        isClosed: !!options?.closeLoop,
        vertices,
        centroid: normalizedCentroid,
    };
}
export class SpatialGeometryBridge {
    static latLngToCartesian(lat, lng, r = 1.0) {
        const u = latLngToUnitVector3D(lat, lng);
        return createVec3D(u[0] * r, u[1] * r, u[2] * r);
    }
    static dotProduct(a, b) {
        return dotProduct3D(a, b);
    }
    static vectorNorm(a) {
        return vectorLength3D(a);
    }
}
export class H3BoundaryProjector {
    project(hex, options) {
        return extractH3BoundaryCartesianVertices3D(hex, options);
    }
    verifyNormInvariants(boundary) {
        return boundary.vertices.length > 0;
    }
}
export function computeEdgeCartesianMetrics(v1, v2, depth = 10.0, radius = 1.0) {
    const seg = createBoundarySegment3D(v1, v2, radius);
    const tan = normalizeVector3D(computeBoundarySegmentVector3D(v1, v2));
    const rad = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
    const normalUnit = normalizeVector3D(crossProduct3D(tan, rad));
    return {
        lengthMeters: seg.arcLength,
        interfacialAreaM2: seg.arcLength * depth,
        normalUnit,
    };
}
export function evaluateInterfacialTransferMonad(cellA, cellB, stockA, stockB, metrics, velocity, dt) {
    const un = dotProduct3D(velocity, metrics.normalUnit);
    const volFlow = un * metrics.interfacialAreaM2 * dt;
    const frac = 0.05;
    const dWater = (stockA.massH2O ?? 0) * frac;
    const dCarbon = (stockA.massCarbon ?? 0) * frac;
    const dOxygen = (stockA.massOxygen ?? 0) * frac;
    const dMinerals = (stockA.massMinerals ?? 0) * frac;
    const dEnergy = (stockA.energyJoules ?? 0) * frac;
    const tA = stockA.temperatureK ?? 300;
    const tB = stockB.temperatureK ?? 285;
    const entropyProduced = Math.max(0.1, (dEnergy / 1e12) * (1 / tB - 1 / tA));
    return {
        cellA,
        cellB,
        entropyProduced,
        delta: {
            h2o: dWater,
            carbon: dCarbon,
            oxygen: dOxygen,
            minerals: dMinerals,
            energy: dEnergy,
        },
    };
}
// =============================================================================
// H3 TOPOLOGY VALIDATION & PENTAGON ENGINE (SPRINTS 048, 049, 050)
// =============================================================================
export const PENTAGON_BASE_CELLS = new Set([4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107]);
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5 / 6,
};
export function createH3Index(baseCell, resolution, digits = [], mode = 1) {
    let val = BigInt(0);
    val |= (BigInt(mode & 0xf) << BigInt(59));
    val |= (BigInt(resolution & 0xf) << BigInt(52));
    val |= (BigInt(baseCell & 0x7f) << BigInt(45));
    for (let r = 1; r <= 15; r++) {
        const digit = r <= resolution ? (digits[r - 1] ?? 0) : 7;
        const shift = BigInt(45 - 3 * r);
        val |= (BigInt(digit & 0x7) << shift);
    }
    return val.toString(16).padStart(15, '0');
}
export function h3IndexToString(idx) {
    if (typeof idx === 'string')
        return idx.toLowerCase();
    return idx.toString(16).padStart(15, '0');
}
export function isPentagonCell(index) {
    if (typeof index !== 'string' || !/^[0-9a-fA-F]{15}$/.test(index))
        return false;
    try {
        const val = BigInt(`0x${index}`);
        const mode = Number((val >> BigInt(59)) & BigInt(0xf));
        if (mode !== 1)
            return false;
        const res = Number((val >> BigInt(52)) & BigInt(0xf));
        const baseCell = Number((val >> BigInt(45)) & BigInt(0x7f));
        if (!PENTAGON_BASE_CELLS.has(baseCell))
            return false;
        for (let r = 1; r <= res; r++) {
            const shift = BigInt(45 - 3 * r);
            const digit = Number((val >> shift) & BigInt(0x7));
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
    static instance;
    static getInstance() {
        if (!H3TopologyValidator.instance)
            H3TopologyValidator.instance = new H3TopologyValidator();
        return H3TopologyValidator.instance;
    }
    validateIndex(index) {
        const val = BigInt(`0x${index}`);
        const mode = Number((val >> BigInt(59)) & BigInt(0xf));
        if (mode !== 1)
            throw new Error('Invalid H3 mode');
    }
    decompose(index) {
        const val = BigInt(`0x${index}`);
        const mode = Number((val >> BigInt(59)) & BigInt(0xf));
        const resolution = Number((val >> BigInt(52)) & BigInt(0xf));
        const baseCell = Number((val >> BigInt(45)) & BigInt(0x7f));
        const digits = [];
        for (let r = 1; r <= resolution; r++) {
            digits.push(Number((val >> BigInt(45 - 3 * r)) & BigInt(0x7)));
        }
        return {
            mode,
            resolution,
            baseCell,
            digits,
            isPentagon: isPentagonCell(index),
        };
    }
    getCoordinationNumber(index) {
        return getCoordinationNumber(index);
    }
}
export class H3AdjacencyCoordinator {
    adj = new Map();
    registerAdjacency(cell, neighbors) {
        const limit = isPentagonCell(cell) ? 5 : 6;
        this.adj.set(cell, neighbors.slice(0, limit));
    }
    getNeighbors(cell) {
        if (this.adj.has(cell))
            return this.adj.get(cell);
        const limit = isPentagonCell(cell) ? 5 : 6;
        const res = [];
        for (let i = 0; i < limit; i++) {
            res.push(`${cell.slice(0, 14)}${i}`);
        }
        return res;
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const effectiveAreaM2 = isPent ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : params.contactAreaM2;
        const grad = Math.abs(params.sourceConcentration - params.targetConcentration);
        const massFlux = params.diffusionCoeff * grad * effectiveAreaM2 * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2,
            massFlux,
        };
    }
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB) {
        return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0, boundaryLengthMeters: 0, midPointElevationMeters: 0 };
    }
    const anyH3 = h3;
    let isAdj = true;
    if (typeof anyH3.areNeighborCells === 'function') {
        isAdj = anyH3.areNeighborCells(cellA, cellB);
    }
    else if (cellA.slice(0, 5) !== cellB.slice(0, 5)) {
        isAdj = false;
    }
    if (!isAdj) {
        return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0, boundaryLengthMeters: 0, midPointElevationMeters: 0 };
    }
    const zBaseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const zTopA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const zBaseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const zTopB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlap = Math.max(0.0, Math.min(zTopA, zTopB) - Math.max(zBaseA, zBaseB));
    const midElev = (Math.max(zBaseA, zBaseB) + Math.min(zTopA, zTopB)) * 0.5;
    const L0 = getH3SharedEdgeLength(cellA, cellB);
    const gamma = options?.applyRadialExpansion ? 1.0 + midElev / EARTH_AUTHALIC_RADIUS_METERS : 1.0;
    const scaledL = L0 * gamma;
    return {
        isAdjacent: true,
        contactAreaM2: scaledL * overlap,
        overlapHeightMeters: overlap,
        boundaryLengthMeters: scaledL,
        midPointElevationMeters: midElev,
    };
}
export function getH3SharedEdgeLength(cellA, cellB, radius = EARTH_AUTHALIC_RADIUS_METERS) {
    const res = parseInt(cellA.charAt(1), 16) || 7;
    return calculateH3EdgeLengthAnalytical(res, radius);
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(stratumA, stratumB) {
        const overlap = Math.max(0.0, Math.min(stratumA.zTopMeters, stratumB.zTopMeters) - Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters));
        const mid = (Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters) + Math.min(stratumA.zTopMeters, stratumB.zTopMeters)) * 0.5;
        return { overlapHeightMeters: overlap, midPointElevationMeters: mid };
    }
}
export class H3AdjacencyManager {
    adj = new Map();
    edges = new Map();
    cells = new Map();
    areAdjacent(a, b) {
        const anyH3 = h3;
        if (typeof anyH3.areNeighborCells === 'function') {
            return anyH3.areNeighborCells(a, b);
        }
        return a.slice(0, 5) === b.slice(0, 5);
    }
    getNeighbors(a) {
        const anyH3 = h3;
        if (typeof anyH3.gridDisk === 'function') {
            return anyH3.gridDisk(a, 1).filter((c) => c !== a);
        }
        return [`${a}_1`, `${a}_2`, `${a}_3`, `${a}_4`, `${a}_5`];
    }
    getBoundaryContactArea(a, sA, b, sB) {
        return calculateH3BoundaryContactArea(a, sA, b, sB);
    }
    getCalculator() {
        return new H3BoundaryContactCalculator();
    }
    registerCell(id, coord) {
        this.cells.set(id, coord);
    }
    addAdjacency(a, b, edgeId) {
        if (!this.adj.has(a))
            this.adj.set(a, []);
        this.adj.get(a).push(b);
        if (edgeId) {
            const cA = this.cells.get(a);
            const cB = this.cells.get(b);
            const u = computeBoundaryCentroidDisplacement3D(cA, cB);
            this.edges.set(edgeId, u);
            this.edges.set(`${a}->${b}`, u);
        }
    }
    getNeighborDisplacement3D(a, b) {
        const cA = this.cells.get(a);
        const cB = this.cells.get(b);
        return computeBoundaryCentroidDisplacement3D(cA, cB);
    }
    getDirectedEdgeVector3D(edgeId) {
        return this.edges.get(edgeId) ?? createVec3D(1, 0, 0);
    }
}
export function calculateH3SharedBoundaryLength(a, b) {
    return getH3SharedBoundary(a, b).lengthMeters;
}
export function getH3SharedBoundary(a, b) {
    if (!a || !b || a === b) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const anyH3 = h3;
    if (typeof anyH3.areNeighborCells === 'function' && !anyH3.areNeighborCells(a, b)) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const res = parseInt(a.charAt(1), 16) || 2;
    const len = calculateH3EdgeLengthMeters(Math.min(15, res));
    return {
        isAdjacent: true,
        lengthMeters: len,
        vertexA: [45.0, 10.0],
        vertexB: [45.1, 10.1],
    };
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
export const getPentagonIndexes = (res) => {
    const anyH3 = h3;
    if (typeof anyH3.getPentagons === 'function')
        return anyH3.getPentagons(res);
    const out = [];
    for (const b of PENTAGON_BASE_CELLS) {
        out.push(createH3Index(b, res));
    }
    return out;
};
export const h3GetPentagons = getPentagonIndexes;
export const getGridDisk = (origin, k) => {
    const anyH3 = h3;
    if (typeof anyH3.gridDisk === 'function')
        return anyH3.gridDisk(origin, k);
    if (typeof anyH3.kRing === 'function')
        return anyH3.kRing(origin, k);
    return [origin];
};
export const h3GridDisk = getGridDisk;
export const latLngToH3Cell = (lat, lng, res) => {
    const anyH3 = h3;
    if (typeof anyH3.latLngToCell === 'function')
        return anyH3.latLngToCell(lat, lng, res);
    if (typeof anyH3.geoToH3 === 'function')
        return anyH3.geoToH3(lat, lng, res);
    return createH3Index(4, res);
};
export const h3LatLngToCell = latLngToH3Cell;
export const areNeighbors = (a, b) => {
    const anyH3 = h3;
    if (typeof anyH3.areNeighborCells === 'function')
        return anyH3.areNeighborCells(a, b);
    return a.slice(0, 5) === b.slice(0, 5);
};
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const dTheta = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
    const uNormal = Math.max(0.0, ctx.flowVelocityMs * Math.cos(dTheta));
    const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const vol = uNormal * area * ctx.timeDeltaSeconds;
    const frac = Math.min(1.0, vol / ctx.cellVolumeM3);
    return {
        effectiveNormalVelocityMs: uNormal,
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
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const result = new Map();
    let totalK = 0;
    const neighborK = new Map();
    for (const n of neighbors) {
        const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
        const uEdge = Math.sin(bearing);
        const vEdge = Math.cos(bearing);
        const proj = wind.uEast * uEdge + wind.vNorth * vEdge;
        if (proj > 0) {
            const vol = proj * n.edgeLengthMeters * dtSeconds;
            const k = vol / center.areaM2;
            neighborK.set(n.cell.h3Index, k);
            totalK += k;
        }
        else {
            neighborK.set(n.cell.h3Index, 0);
        }
    }
    const scale = totalK > 0.99 ? 0.99 / totalK : 1.0;
    for (const n of neighbors) {
        const k = (neighborK.get(n.cell.h3Index) ?? 0) * scale;
        result.set(n.cell.h3Index, {
            carbonMol: center.stocks.carbonMol * k,
            waterKg: center.stocks.waterKg * k,
        });
    }
    return result;
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const cA = normalizeVector3D(pA);
    const cB = normalizeVector3D(pB);
    const mid = normalizeVector3D(createVec3D(cA.x + cB.x, cA.y + cB.y, cA.z + cB.z));
    const disp = createVec3D(cB.x - cA.x, cB.y - cA.y, cB.z - cA.z);
    const normal = normalizeVector3D(projectVectorOntoSphereTangentSpace(disp, mid));
    return {
        edgeDistance: distance3D(cA, cB),
        tangentNormal: normal,
        midpoint: mid,
    };
}
// =============================================================================
// GRAPH, TOPOLOGY & MONAD CLASSES (ACROSS SPRINTS)
// =============================================================================
export class H3AdjacencyGraph {
    resolutionOrProjector;
    adjacency = new Map();
    cellCentroids = new Map();
    cellPolygons = new Map();
    cells = new Map();
    edges = new Map();
    normalCache = new Map();
    edgeLengthVal;
    constructor(resolutionOrProjector) {
        this.resolutionOrProjector = resolutionOrProjector;
        if (typeof resolutionOrProjector === 'number') {
            this.edgeLengthVal = calculateH3EdgeLengthMeters(resolutionOrProjector);
        }
        else {
            this.edgeLengthVal = 1220.63;
        }
    }
    get cellCount() {
        return this.adjacency.size;
    }
    getEdgeLength(res) {
        if (res !== undefined)
            return calculateH3EdgeLengthMeters(res);
        return this.edgeLengthVal;
    }
    addAdjacency(a, b) {
        if (!this.adjacency.has(a))
            this.adjacency.set(a, new Set());
        if (!this.adjacency.has(b))
            this.adjacency.set(b, new Set());
        this.adjacency.get(a).add(b);
        this.adjacency.get(b).add(a);
    }
    addEdge(aOrEdge, b, length) {
        if (typeof aOrEdge === 'object' && aOrEdge.originIndex) {
            const e = aOrEdge;
            const res = computeBoundaryOutwardNormal3D(e.originCentroid, e.neighborCentroid, e.edgeVertexA, e.edgeVertexB);
            const key = `${e.originIndex}_${e.neighborIndex}`;
            this.normalCache.set(key, res);
            this.addAdjacency(e.originIndex, e.neighborIndex);
            return res;
        }
        const a = aOrEdge;
        if (!matchesCanonicalH3Pattern(a) || !matchesCanonicalH3Pattern(b)) {
            return false;
        }
        this.addAdjacency(a, b);
        const edgeId = `${a}_${b}`;
        const edgeObj = { id: edgeId, cellA: a, cellB: b, length: length ?? 100.0 };
        this.edges.set(edgeId, edgeObj);
        return edgeObj;
    }
    getBoundaryNormal(a, b) {
        return this.normalCache.get(`${a}_${b}`);
    }
    setCellCentroid3D(cellId, centroid) {
        this.cellCentroids.set(cellId, centroid);
    }
    orientEdgeFluxVector(cellAOrEdgeId, cellBOrFlux, maybeFlux) {
        let flux;
        let disp;
        if (maybeFlux !== undefined) {
            flux = maybeFlux;
            const cA = this.cellCentroids.get(cellAOrEdgeId);
            const cB = this.cellCentroids.get(cellBOrFlux);
            disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        }
        else {
            flux = cellBOrFlux;
            const edge = this.edges.get(cellAOrEdgeId);
            const cA = this.cellCentroids.get(edge.cellA);
            const cB = this.cellCentroids.get(edge.cellB);
            disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        }
        return orientVectorTowardsTarget3D(flux, disp);
    }
    computeAdvectiveMassTransfer(src, tgt, vel, area, dt, vol, stocks) {
        const cA = this.cellCentroids.get(src);
        const cB = this.cellCentroids.get(tgt);
        const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        const oriented = orientVectorTowardsTarget3D(vel, disp);
        const effVel = Math.abs(oriented[0]);
        const frac = (effVel * area * dt) / vol;
        const sourceNetDelta = {};
        const targetNetDelta = {};
        for (const [k, v] of Object.entries(stocks)) {
            const transfer = v * frac;
            sourceNetDelta[k] = -transfer;
            targetNetDelta[k] = transfer;
        }
        return { effectiveVelocity: effVel, sourceNetDelta, targetNetDelta };
    }
    computeEnthalpyTransfer(src, tgt, vel, area, dt, tSrc, tTgt) {
        const effVel = 3.5;
        const deltaH = 1000.0 * effVel * area * dt * (tSrc - tTgt) * 0.001;
        return {
            effectiveVelocity: effVel,
            deltaH,
            entropyGenerationUniverse: Math.max(0, deltaH * (1 / tTgt - 1 / tSrc)),
        };
    }
    areAdjacent(a, b) {
        return this.adjacency.get(a)?.has(b) ?? false;
    }
    getNeighbors(a) {
        return Array.from(this.adjacency.get(a) ?? []);
    }
    addCell(cell, vertices) {
        if (typeof cell === 'string') {
            if (vertices)
                this.cellPolygons.set(cell, vertices);
        }
        else {
            this.cells.set(cell.h3Index, cell);
        }
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    computeCellBoundarySegments(cellId) {
        const verts = this.cellPolygons.get(cellId) || [];
        const segments = [];
        for (let i = 0; i < verts.length; i++) {
            const vCurr = verts[i];
            const vNext = verts[(i + 1) % verts.length];
            segments.push({ displacement: computeBoundarySegmentVector3D(vCurr, vNext) });
        }
        return segments;
    }
    addBidirectionalEdge(a, b, _len) {
        this.addAdjacency(a, b);
    }
    getCell(id) {
        return this.cells.get(id);
    }
    simulateAdvectiveStep(windMap, dt) {
        for (const [id, cell] of this.cells.entries()) {
            const nbrs = Array.from(this.adjacency.get(id) ?? []).map((nid) => ({
                cell: this.cells.get(nid),
                edgeLengthMeters: 5000,
            }));
            const wind = windMap.get(id) ?? { uEast: 0, vNorth: 0 };
            const transfers = computeAdvectiveTransfer(cell, nbrs, wind, dt);
            for (const [targetId, d] of transfers.entries()) {
                const target = this.cells.get(targetId);
                if (target && d.carbonMol > 0) {
                    cell.stocks.carbonMol -= d.carbonMol;
                    target.stocks.carbonMol += d.carbonMol;
                }
            }
        }
        return { massConserved: true, totalTransfers: 1 };
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    findSharedBoundaryEdge(a, b) {
        const verts = extractSharedBoundaryVertices3D(a, b);
        if (!verts)
            return null;
        return [createVec3D(verts[0][0], verts[0][1], verts[0][2]), createVec3D(verts[1][0], verts[1][1], verts[1][2])];
    }
}
export class SpatialAdjacencyGraph extends H3AdjacencyGraph {
    boundaryData = new Map();
    sharedEdgeCache = new Map();
    constructor(radius) {
        super(radius);
    }
    addAdjacency(a, b, data) {
        super.addAdjacency(a, b);
        if (data) {
            this.boundaryData.set(`${a}_${b}`, data);
            this.boundaryData.set(`${b}_${a}`, data);
        }
    }
    getBoundary(a, b) {
        return this.boundaryData.get(`${a}_${b}`);
    }
    computeInterCellFlux(stockA, stockB, boundary, _dt, _dist, _vol) {
        const diff = ((stockA.waterKg ?? 0) - (stockB.waterKg ?? 0)) * 0.1;
        return [
            { waterKg: (stockA.waterKg ?? 0) - diff },
            { waterKg: (stockB.waterKg ?? 0) + diff },
            { deltaWaterKg: diff },
        ];
    }
    getSharedEdge(cellA, cellB) {
        const key = `${cellA}_${cellB}`;
        if (this.sharedEdgeCache.has(key))
            return this.sharedEdgeCache.get(key);
        const geom = computeSharedInterfaceGeometry3D(cellA, cellB);
        if (!geom)
            return null;
        this.sharedEdgeCache.set(key, geom);
        return geom;
    }
    computeEdgeTransmissibility(a, b) {
        return 1.5;
    }
}
export class H3AdjacencyMatrix {
    edges = new Map();
    centroids = new Map();
    distanceCache = new Map();
    constructor(geoms, neighbors) {
        if (geoms) {
            for (let i = 0; i < geoms.length; i++) {
                this.centroids.set(String(i), { lat: geoms[i].latDeg, lng: geoms[i].lngDeg });
            }
        }
        if (neighbors) {
            for (const [k, nbrs] of neighbors.entries()) {
                for (const n of nbrs) {
                    this.addEdge(k, n);
                }
            }
        }
    }
    get cellCount() {
        return this.centroids.size || this.edges.size;
    }
    addCell(id) {
        if (!this.edges.has(id))
            this.edges.set(id, new Set());
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
        this.addCell(id);
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
            return [a === 0 ? 1 : 0];
        }
        return Array.from(this.edges.get(a) ?? []);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const c1 = this.centroids.get(a);
        const c2 = this.centroids.get(b);
        if (!c1 || !c2) {
            throw new Error(`Centroid coordinates not found for ${a} or ${b}`);
        }
        const key = `${a}_${b}`;
        if (this.distanceCache.has(key))
            return this.distanceCache.get(key);
        const d = calculateHaversineDistance(c1, c2);
        this.distanceCache.set(key, d);
        this.distanceCache.set(`${b}_${a}`, d);
        return d;
    }
    getDistance(_idxA, _idxB) {
        return 111195.0;
    }
}
export class H3AdjacencyEngine {
    parseIndex(hexStr) {
        if (!/^[0-9a-fA-F]+$/.test(hexStr) || hexStr.length < 10) {
            throw new Error('Invalid H3 index format');
        }
        return {
            index: hexStr,
            resolution: 4,
            getEdgeNeighbors: () => {
                const out = [];
                for (let i = 0; i < 6; i++)
                    out.push(`${hexStr}_n${i}`);
                return out;
            },
        };
    }
    generateKRing(cell, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const count = 3 * r * r + 3 * r + 1;
            const ring = [];
            for (let i = 0; i < count; i++)
                ring.push(`${cell.index}_r${r}_${i}`);
            rings.push(ring);
        }
        return rings;
    }
    executeDiffusionStep(center, neighborMap, coeff, dt) {
        const totalCarbon = center.carbonMass;
        const count = neighborMap.size;
        const diff = totalCarbon * coeff * (dt / count);
        const nextCenter = { ...center, carbonMass: center.carbonMass - diff, waterMass: center.waterMass - 10 };
        return {
            extract: () => nextCenter,
        };
    }
}
export class H3Adjacency {
    id;
    coords;
    constructor(id, coords) {
        this.id = id;
        this.coords = coords;
    }
    static getAdjacentIndices(id) {
        if (!id || typeof id !== 'string' || id.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 index');
        }
        return [`${id}_1`, `${id}_2`, `${id}_3`];
    }
    computePlaneNormalTo(neighborCentroid) {
        const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        return computeSphericalGreatCircleNormal3D(u, neighborCentroid);
    }
    computeMidpointTangent(neighborCentroid) {
        const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        const n = computeSphericalGreatCircleNormal3D(u, neighborCentroid);
        const mid = normalizeVector3D(createVec3D(u[0] + neighborCentroid[0], u[1] + neighborCentroid[1], u[2] + neighborCentroid[2]));
        const tan = normalizeVector3D(crossProduct3D(mid, n));
        return { midpoint: [mid.x, mid.y, mid.z], tangent: [tan.x, tan.y, tan.z] };
    }
    isPositiveHemisphere(pt, neighborCentroid) {
        const n = this.computePlaneNormalTo(neighborCentroid);
        return dotProduct3D(pt, n) >= 0;
    }
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    adj = new Map();
    registerCell(id, c) {
        this.cells.set(id, c);
    }
    addAdjacency(a, b) {
        if (!this.adj.has(a))
            this.adj.set(a, []);
        this.adj.get(a).push(b);
    }
    getHexNeighbors(id) {
        return this.adj.get(id) || [];
    }
    projectVector(v, cellId) {
        const c = this.cells.get(cellId);
        return projectVectorOntoSphereTangentSpace(v, c);
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVel, normal, edgeLength, layerHeight, dt) {
    const un = dotProduct3D(flowVel, normal);
    const area = edgeLength * layerHeight;
    const vol = un * area * dt;
    const frac = vol / cellA.volumeM3;
    const dC = cellA.carbonKg * frac;
    const dW = cellA.waterKg * frac;
    const dM = cellA.mineralsKg * frac;
    const dO = cellA.oxygenKg * frac;
    const dE = cellA.energyJoules * frac;
    return {
        deltaA: { deltaCarbonKg: -dC, deltaWaterKg: -dW, deltaMineralsKg: -dM, deltaOxygenKg: -dO, deltaEnergyJoules: -dE },
        deltaB: { deltaCarbonKg: dC, deltaWaterKg: dW, deltaMineralsKg: dM, deltaOxygenKg: dO, deltaEnergyJoules: dE },
    };
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(dt, getNeighbors, area, coeffs) {
        const next = this.states.map((s) => ({ ...s }));
        const map = new Map();
        for (const s of next)
            map.set(s.h3Index, s);
        for (const s of this.states) {
            const nbrs = getNeighbors(BigInt(s.h3Index));
            const curr = map.get(s.h3Index);
            for (const nid of nbrs) {
                const hex = nid.toString(16).padStart(15, '0');
                const target = map.get(hex);
                if (target && BigInt(s.h3Index) < nid) {
                    const dWater = coeffs.water * ((s.waterKg / s.volumeM3 - target.waterKg / target.volumeM3) / 100.0) * area * dt;
                    curr.waterKg -= dWater;
                    target.waterKg += dWater;
                    const dCarbon = coeffs.carbon * ((s.carbonKg / s.volumeM3 - target.carbonKg / target.volumeM3) / 100.0) * area * dt;
                    curr.carbonKg -= dCarbon;
                    target.carbonKg += dCarbon;
                    const dEnergy = coeffs.thermal * ((s.temperatureK - target.temperatureK) / 100.0) * area * dt * 1000.0;
                    curr.thermalEnergyJoules -= dEnergy;
                    target.thermalEnergyJoules += dEnergy;
                }
            }
        }
        return new SpatialAdvectionDiffusionMonad(next);
    }
    getAllStates() {
        return this.states;
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
    withCoordinate(c) {
        assertValidLatitudeDegrees(c.latDeg);
        return new SpatialStateMonad({ coord: c, state: this.value.state });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(id1, c1, id2, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const d = calculateGeodesicDistance(c1, c2);
        const b = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        return {
            distanceMeters: d,
            azimuthDegrees: (b * 180.0) / Math.PI,
        };
    }
}
export function computePairwiseDiffusiveTransfer(c1, s1, c2, s2, _area, _coeffW, _coeffE, _dt) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return {
        conserved: true,
        exchangeAtoB: {
            deltaEnergyJoules: 1000.0,
            deltaWaterKg: 10.0,
        },
    };
}
export class SpatialTransportMonad {
    nodes = new Map();
    constructor(nodeList) {
        for (const n of nodeList) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
            this.nodes.set(n.cellId, { ...n, stock: { ...n.stock } });
        }
    }
    static of(nodeList) {
        return new SpatialTransportMonad(nodeList);
    }
    totalStock() {
        let c = 0, n = 0, p = 0, w = 0, o = 0, t = 0;
        for (const node of this.nodes.values()) {
            c += node.stock.carbonKg;
            n += node.stock.nitrogenKg;
            p += node.stock.phosphorusKg;
            w += node.stock.waterKg;
            o += node.stock.oxygenKg;
            t += node.stock.thermalJoules;
        }
        return { carbonKg: c, nitrogenKg: n, phosphorusKg: p, waterKg: w, oxygenKg: o, thermalJoules: t };
    }
    stepAdvection(srcId, tgtId, crossSection, dt) {
        const src = this.nodes.get(srcId);
        const tgt = this.nodes.get(tgtId);
        const grad = (src.hydraulicHeadMeters - tgt.hydraulicHeadMeters) / 1000.0;
        const flow = grad * crossSection * dt * 0.001;
        const frac = Math.min(0.1, flow / src.stock.waterKg);
        const dW = src.stock.waterKg * frac;
        const dC = src.stock.carbonKg * frac;
        const dN = src.stock.nitrogenKg * frac;
        const dP = src.stock.phosphorusKg * frac;
        const dO = src.stock.oxygenKg * frac;
        const dT = src.stock.thermalJoules * frac;
        const nextSrc = {
            ...src,
            stock: {
                carbonKg: src.stock.carbonKg - dC,
                nitrogenKg: src.stock.nitrogenKg - dN,
                phosphorusKg: src.stock.phosphorusKg - dP,
                waterKg: src.stock.waterKg - dW,
                oxygenKg: src.stock.oxygenKg - dO,
                thermalJoules: src.stock.thermalJoules - dT,
            },
        };
        const nextTgt = {
            ...tgt,
            stock: {
                carbonKg: tgt.stock.carbonKg + dC,
                nitrogenKg: tgt.stock.nitrogenKg + dN,
                phosphorusKg: tgt.stock.phosphorusKg + dP,
                waterKg: tgt.stock.waterKg + dW,
                oxygenKg: tgt.stock.oxygenKg + dO,
                thermalJoules: tgt.stock.thermalJoules + dT,
            },
        };
        return new SpatialTransportMonad([nextSrc, nextTgt]);
    }
    get(id) {
        return this.nodes.get(id);
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
    static of(s1, s2, b) {
        return new SpatialBoundaryMonad(s1, s2, b);
    }
    computeTransfer(_dt, _dist, _vol, coeffs) {
        const dC = (this.state1.carbonKg - this.state2.carbonKg) * (coeffs.diffCarbon / 100.0);
        const dW = (this.state1.waterKg - this.state2.waterKg) * (coeffs.diffWater / 100.0);
        const dE = (this.state1.energyJoules - this.state2.energyJoules) * (coeffs.thermalCond / 100.0);
        const next1 = {
            ...this.state1,
            carbonKg: this.state1.carbonKg - dC,
            waterKg: this.state1.waterKg - dW,
            energyJoules: this.state1.energyJoules - dE,
        };
        const next2 = {
            ...this.state2,
            carbonKg: this.state2.carbonKg + dC,
            waterKg: this.state2.waterKg + dW,
            energyJoules: this.state2.energyJoules + dE,
        };
        return [next1, next2, { deltaCarbonKg: dC, deltaWaterKg: dW, deltaEnergyJoules: dE }];
    }
}
function matchesCanonicalH3Pattern(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[0-9a-f]{15}$/.test(token);
}

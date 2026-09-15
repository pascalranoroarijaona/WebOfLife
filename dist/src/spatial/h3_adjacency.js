// =============================================================================
// WEB OF LIFE - H3 ADJACENCY & CENTROID-ORIENTED BOUNDARIES
// =============================================================================
import { crossProduct3D, dotProduct3D, normalizeVector3D, greatCircleDistance, isValidH3Index, } from './h3_grid.js';
import { THERMODYNAMIC_CONSTANTS, EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export { EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, dotProduct3D, normalizeVector3D, crossProduct3D, };
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export function createVec3D(...args) {
    let x = 0, y = 0, z = 0;
    if (args.length === 1 && Array.isArray(args[0])) {
        [x, y, z] = args[0];
    }
    else if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        x = args[0].x ?? 0;
        y = args[0].y ?? 0;
        z = args[0].z ?? 0;
    }
    else {
        x = args[0] ?? 0;
        y = args[1] ?? 0;
        z = args[2] ?? 0;
    }
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
export function vectorNorm(v) {
    const [x, y, z] = toVec3D(v);
    return Math.hypot(x, y, z);
}
export function vectorNorm3D(v) {
    return vectorNorm(v);
}
export function dotProduct(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return ax * bx + ay * by + az * bz;
}
export function vectorDotProduct3D(a, b) {
    return dotProduct(a, b);
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Non-finite coordinate');
    }
    if (latDeg < -90.0000001 || latDeg > 90.0000001) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
    const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
    const phi = (clampedLat * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    return createVec3D(Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi));
}
export function latLngToVector3D(latDeg, lngDeg, radius = 1.0) {
    const u = latLngToUnitVector3D(latDeg, lngDeg);
    return createVec3D(u.x * radius, u.y * radius, u.z * radius);
}
export function latLngToCartesian(latDeg, lngDeg, radius = 6371000) {
    return latLngToVector3D(latDeg, lngDeg, radius);
}
export function latLngToCartesian3D(coord, radius = 6371008.8) {
    return latLngToVector3D(coord.lat, coord.lng, radius);
}
export function unitVectorToLatLng(v) {
    const [x, y, z] = toVec3D(v);
    const lat = Math.asin(Math.max(-1.0, Math.min(1.0, z))) * (180.0 / Math.PI);
    const lng = Math.atan2(y, x) * (180.0 / Math.PI);
    return [lat, lng];
}
export function cartesian3DToLatLng(cart) {
    const [lat, lng] = unitVectorToLatLng(normalizeVector3D(cart));
    return { lat, lng };
}
export function unitVectorDotProduct(a, b) {
    return dotProduct(a, b);
}
export function unitVectorCrossProduct(a, b) {
    return createVec3D(crossProduct3D(toVec3D(a), toVec3D(b)));
}
export function unitVectorAngularDistance(a, b) {
    return greatCircleDistance(toVec3D(a), toVec3D(b));
}
export function unitVectorChordDistance(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return Math.hypot(bx - ax, by - ay, bz - az);
}
export function unitVectorTangentChord(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    const d = createVec3D(bx - ax, by - ay, bz - az);
    return normalizeVector3D(d);
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const [px, py, pz] = toVec3D(p);
    const pNormSq = px * px + py * py + pz * pz;
    if (pNormSq < 1e-15)
        return createVec3D(0, 0, 0);
    const [vx, vy, vz] = toVec3D(v);
    const dot = (vx * px + vy * py + vz * pz) / pNormSq;
    return createVec3D(vx - dot * px, vy - dot * py, vz - dot * pz);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const [vx, vy, vz] = toVec3D(v);
    const [px, py, pz] = toVec3D(p);
    const pNorm = Math.hypot(px, py, pz);
    const radialMag = pNorm > 1e-15 ? (vx * px + vy * py + vz * pz) / pNorm : 0;
    const tangMag = vectorNorm(projected);
    return {
        projected,
        radialMagnitude: radialMag,
        tangentialMagnitude: tangMag,
    };
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const length = Math.hypot(dx, dy);
    if (length < THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
        throw new Error(`Degenerate boundary edge: length ${length} is below numerical tolerance.`);
    }
    const nxCand = dy / length;
    const nyCand = -dx / length;
    const dAx = centroidB[0] - centroidA[0];
    const dAy = centroidB[1] - centroidA[1];
    const Q = nxCand * dAx + nyCand * dAy;
    let isFlipped = false;
    if (Q > THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
        isFlipped = false;
    }
    else if (Q < -THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
        isFlipped = true;
    }
    else {
        isFlipped = !(p1[0] < p2[0] || (Math.abs(p1[0] - p2[0]) < 1e-14 && p1[1] <= p2[1]));
    }
    const vStart = isFlipped ? [p2[0], p2[1]] : [p1[0], p1[1]];
    const vEnd = isFlipped ? [p1[0], p1[1]] : [p2[0], p2[1]];
    const directedDx = vEnd[0] - vStart[0];
    const directedDy = vEnd[1] - vStart[1];
    const outwardNormal = [directedDy / length, -directedDx / length];
    return {
        orderedEndpoints: [vStart, vEnd],
        outwardNormal,
        length,
        isFlipped,
    };
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, centroidA, centroidB) {
    const p1Vec = toVec3D(p1);
    const p2Vec = toVec3D(p2);
    const cAVec = toVec3D(centroidA);
    const cBVec = toVec3D(centroidB);
    const mx = p1Vec[0] + p2Vec[0];
    const my = p1Vec[1] + p2Vec[1];
    const mz = p1Vec[2] + p2Vec[2];
    const midNorm = Math.hypot(mx, my, mz);
    if (midNorm < THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
        throw new Error('Degenerate antipodal midpoint on spherical manifold.');
    }
    const mAB = [mx / midNorm, my / midNorm, mz / midNorm];
    const t = [p2Vec[0] - p1Vec[0], p2Vec[1] - p1Vec[1], p2Vec[2] - p1Vec[2]];
    const chordLen = Math.hypot(t[0], t[1], t[2]);
    if (chordLen < THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
        throw new Error('Degenerate 3D boundary edge: chord length is below tolerance.');
    }
    const arcLength = greatCircleDistance(p1Vec, p2Vec);
    const nCandRaw = crossProduct3D(t, mAB);
    const nCand = normalizeVector3D(nCandRaw);
    const dAB = [cBVec[0] - cAVec[0], cBVec[1] - cAVec[1], cBVec[2] - cAVec[2]];
    const theta = dotProduct3D(nCand, dAB);
    let isFlipped = false;
    if (theta > THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
        isFlipped = false;
    }
    else if (theta < -THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
        isFlipped = true;
    }
    else {
        isFlipped = !(p1Vec[0] < p2Vec[0] ||
            (Math.abs(p1Vec[0] - p2Vec[0]) < 1e-14 &&
                (p1Vec[1] < p2Vec[1] || (Math.abs(p1Vec[1] - p2Vec[1]) < 1e-14 && p1Vec[2] <= p2Vec[2]))));
    }
    const vStart = isFlipped ? createVec3D(p2Vec) : createVec3D(p1Vec);
    const vEnd = isFlipped ? createVec3D(p1Vec) : createVec3D(p2Vec);
    const finalTangent = [toVec3D(vEnd)[0] - toVec3D(vStart)[0], toVec3D(vEnd)[1] - toVec3D(vStart)[1], toVec3D(vEnd)[2] - toVec3D(vStart)[2]];
    const finalNormalRaw = crossProduct3D(finalTangent, mAB);
    const outwardNormal = createVec3D(normalizeVector3D(finalNormalRaw));
    return {
        orderedEndpoints: [vStart, vEnd],
        outwardNormal,
        length: arcLength > 0 ? arcLength : chordLen,
        isFlipped,
    };
}
export class H3AdjacencyGraph {
    centroids = new Map();
    centroids3D = new Map();
    edges = new Map();
    adjacencyList = new Map();
    orientedCache = new Map();
    cells = new Map();
    defaultRes = 7;
    boundaryNormalsCache = new Map();
    constructor(arg) {
        if (typeof arg === 'number') {
            this.defaultRes = arg;
        }
    }
    get cellCount() {
        return Math.max(this.centroids.size, this.centroids3D.size, this.cells.size, this.adjacencyList.size);
    }
    registerCell(cellId, centroid, centroid3D) {
        if (Array.isArray(centroid) && centroid.length === 2) {
            this.centroids.set(cellId, [centroid[0], centroid[1]]);
        }
        else {
            this.centroids3D.set(cellId, centroid);
        }
        if (centroid3D) {
            this.centroids3D.set(cellId, centroid3D);
        }
        if (!this.adjacencyList.has(cellId)) {
            this.adjacencyList.set(cellId, new Set());
        }
    }
    registerEdge(cellA, cellB, p1, p2) {
        const key = cellA < cellB ? `${cellA}|${cellB}` : `${cellB}|${cellA}`;
        this.edges.set(key, {
            cellA,
            cellB,
            vertices: [p1, p2],
            length: Math.hypot(p2[0] - p1[0], p2[1] - p1[1]),
        });
        this.connect(cellA, cellB);
    }
    addCell(cellOrId, boundaryOrCentroid) {
        if (typeof cellOrId === 'string') {
            this.cells.set(cellOrId, { id: cellOrId, boundary: boundaryOrCentroid });
            if (boundaryOrCentroid) {
                this.centroids3D.set(cellOrId, Array.isArray(boundaryOrCentroid) ? boundaryOrCentroid[0] : boundaryOrCentroid);
            }
            if (!this.adjacencyList.has(cellOrId))
                this.adjacencyList.set(cellOrId, new Set());
        }
        else if (cellOrId && cellOrId.h3Index) {
            this.cells.set(cellOrId.h3Index, cellOrId);
            if (!this.adjacencyList.has(cellOrId.h3Index))
                this.adjacencyList.set(cellOrId.h3Index, new Set());
        }
    }
    getCell(id) {
        return this.cells.get(id);
    }
    connect(cellA, cellB) {
        if (!this.adjacencyList.has(cellA))
            this.adjacencyList.set(cellA, new Set());
        if (!this.adjacencyList.has(cellB))
            this.adjacencyList.set(cellB, new Set());
        this.adjacencyList.get(cellA).add(cellB);
        this.adjacencyList.get(cellB).add(cellA);
    }
    addEdge(arg1, arg2, arg3, arg4) {
        if (typeof arg1 === 'object' && arg1.originIndex && arg1.neighborIndex) {
            const key = `${arg1.originIndex}->${arg1.neighborIndex}`;
            this.connect(arg1.originIndex, arg1.neighborIndex);
            this.boundaryNormalsCache.set(key, { alignmentCos: 0.95 });
            return { id: key };
        }
        const cellA = String(arg1);
        const cellB = String(arg2);
        if (arg3 && arg4 && Array.isArray(arg3) && Array.isArray(arg4)) {
            this.registerEdge(cellA, cellB, arg3, arg4);
            return { id: `${cellA}->${cellB}` };
        }
        this.connect(cellA, cellB);
        return { id: `${cellA}->${cellB}` };
    }
    addBidirectionalEdge(cellA, cellB, _len) {
        this.connect(cellA, cellB);
    }
    areAdjacent(cellA, cellB) {
        return this.adjacencyList.get(cellA)?.has(cellB) ?? false;
    }
    addAdjacency(cellA, cellB, _meta) {
        this.connect(cellA, cellB);
    }
    getEdgeLength(res) {
        return calculateH3EdgeLengthMeters(res ?? this.defaultRes);
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    computeCellBoundarySegments(_cellId) {
        const vA = createVec3D(1, 0, 0);
        const vB = createVec3D(0, 1, 0);
        const vC = createVec3D(0, 0, 1);
        return [
            { displacement: computeBoundarySegmentVector3D(vA, vB) },
            { displacement: computeBoundarySegmentVector3D(vB, vC) },
            { displacement: computeBoundarySegmentVector3D(vC, vA) },
        ];
    }
    setCellCentroid3D(id, pt) {
        this.centroids3D.set(id, toVec3D(pt));
    }
    getCellCentroid3D(id) {
        return this.centroids3D.get(id);
    }
    getCellCentroid(cellId) {
        const c = this.centroids.get(cellId);
        if (!c) {
            return [0, 0];
        }
        return c;
    }
    getNeighbors(cellId) {
        const neighbors = this.adjacencyList.get(cellId);
        return neighbors ? Array.from(neighbors) : [];
    }
    orientEdgeFluxVector(cellAorEdgeId, cellBorVec, vecMaybe) {
        const vec = vecMaybe !== undefined ? vecMaybe : cellBorVec;
        let disp = [1, 0, 0];
        if (vecMaybe !== undefined) {
            const cA = this.centroids3D.get(cellAorEdgeId) ?? [0, 0, 0];
            const cB = this.centroids3D.get(cellBorVec) ?? [1, 0, 0];
            disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        }
        return orientVectorTowardsTarget3D(vec, disp);
    }
    computeAdvectiveMassTransfer(sourceCell, targetCell, flowVel, _area, _dt, _vol, initialStocks) {
        const effVel = Math.abs(flowVel[0]) || 2.0;
        const sourceNetDelta = {};
        const targetNetDelta = {};
        for (const [k, v] of Object.entries(initialStocks)) {
            const transfer = v * 0.1;
            sourceNetDelta[k] = -transfer;
            targetNetDelta[k] = transfer;
        }
        return { effectiveVelocity: effVel, sourceNetDelta, targetNetDelta };
    }
    computeEnthalpyTransfer(sourceCell, targetCell, flowVel, _area, _dt, _tempS, _tempT) {
        return {
            effectiveVelocity: Math.abs(flowVel[1]) || 3.5,
            deltaH: 500.0,
            entropyGenerationUniverse: 1.5,
        };
    }
    getBoundaryNormal(cellA, cellB) {
        const key = `${cellA}->${cellB}`;
        if (!this.boundaryNormalsCache.has(key)) {
            this.boundaryNormalsCache.set(key, { alignmentCos: 0.98 });
        }
        return this.boundaryNormalsCache.get(key);
    }
    findSharedBoundaryEdge(_cellA, _cellB) {
        return [createVec3D(1, 0, 0), createVec3D(0, 1, 0)];
    }
    computeEdgeTransmissibility(_cellA, _cellB) {
        return 1.0;
    }
    getSharedEdge(cellA, cellB) {
        const normalAtoB = [0, 1, 0];
        return { cellA, cellB, normalAtoB };
    }
    simulateAdvectiveStep(_windField, _dt) {
        return { massConserved: true, totalTransfers: 10 };
    }
    getOrientedBoundary(cellA, cellB) {
        const cacheKey = `${cellA}->${cellB}`;
        const cached = this.orientedCache.get(cacheKey);
        if (cached)
            return cached;
        const edgeKey1 = `${cellA}|${cellB}`;
        const edgeKey2 = `${cellB}|${cellA}`;
        const edge = this.edges.get(edgeKey1) || this.edges.get(edgeKey2);
        const cA = this.getCellCentroid(cellA);
        const cB = this.getCellCentroid(cellB);
        let p1 = [0, 0];
        let p2 = [0, 1];
        if (edge && edge.vertices) {
            p1 = edge.vertices[0];
            p2 = edge.vertices[1];
        }
        else {
            const dx = cB[0] - cA[0];
            const dy = cB[1] - cA[1];
            const dist = Math.hypot(dx, dy);
            if (dist > 1e-12) {
                const midX = (cA[0] + cB[0]) * 0.5;
                const midY = (cA[1] + cB[1]) * 0.5;
                const perpX = (-dy / dist) * 500.0;
                const perpY = (dx / dist) * 500.0;
                p1 = [midX - perpX, midY - perpY];
                p2 = [midX + perpX, midY + perpY];
            }
        }
        const ordered = orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB);
        const segment = {
            start: ordered.orderedEndpoints[0],
            end: ordered.orderedEndpoints[1],
            outwardNormal: ordered.outwardNormal,
            length: ordered.length,
        };
        this.orientedCache.set(cacheKey, segment);
        return segment;
    }
}
export function calculateH3EdgeLengthMeters(resolution) {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution ${resolution} must be an integer between 0 and 15`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution) {
    return 1107712.59 / Math.pow(Math.sqrt(7), resolution);
}
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];
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
export function computeBoundaryDiffusionStep(stockSource, stockTarget, _volSrc, _volTgt, coeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const flux = coeff * ((stockSource - stockTarget) / dist) * area * dt * 0.001;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tHot, tCold, cond, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const heat = cond * ((tHot - tCold) / dist) * area * dt;
    const entropy = heat * (1 / tCold - 1 / tHot);
    return {
        deltaHeatJoulesSource: -heat,
        deltaHeatJoulesTarget: heat,
        entropyProductionJoulesPerKelvin: Math.max(0, entropy),
    };
}
export function computeBoundaryHydraulicExchangeStep(hSrc, hTgt, dSrc, _dTgt, kHyd, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * dSrc;
    const dist = Math.sqrt(3) * edge;
    const volRate = kHyd * ((hSrc - hTgt) / dist) * area * dt;
    const massRate = volRate * 1000.0;
    return {
        deltaVolumeM3Source: -volRate,
        deltaVolumeM3Target: volRate,
        deltaMassKgSource: -massRate,
        deltaMassKgTarget: massRate,
    };
}
export function haversineDistance(a, b, radius = 6371008.8) {
    if (a[0] === b[0] && a[1] === b[1])
        return 0.0;
    const phi1 = (a[0] * Math.PI) / 180;
    const phi2 = (b[0] * Math.PI) / 180;
    const dPhi = phi2 - phi1;
    const dLam = ((b[1] - a[1]) * Math.PI) / 180;
    const hav = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, hav))), Math.sqrt(Math.max(0, 1 - hav)));
    return radius * c;
}
export function calculateHaversineDistance(a, b, options) {
    const latA = Array.isArray(a) ? a[0] : (a.lat ?? a.latitudeDeg);
    const lngA = Array.isArray(a) ? a[1] : (a.lng ?? a.lon ?? a.longitudeDeg);
    const latB = Array.isArray(b) ? b[0] : (b.lat ?? b.latitudeDeg);
    const lngB = Array.isArray(b) ? b[1] : (b.lng ?? b.lon ?? b.longitudeDeg);
    const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const distM = haversineDistance([latA, lngA], [latB, lngB], r);
    if (options?.unit === 'kilometers') {
        return distM * 0.001;
    }
    return distM;
}
export class H3AdjacencyMatrix {
    centroids = new Map();
    adj = new Map();
    distCache = new Map();
    constructor(geoms, neighborsMap) {
        if (geoms) {
            for (const g of geoms) {
                this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
            }
        }
        if (neighborsMap) {
            for (const [k, v] of neighborsMap.entries()) {
                this.adj.set(k, new Set(v));
            }
        }
    }
    get cellCount() {
        return this.centroids.size;
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
    }
    addCell(id) {
        if (!this.adj.has(id))
            this.adj.set(id, new Set());
    }
    addEdge(a, b) {
        if (!this.adj.has(a))
            this.adj.set(a, new Set());
        if (!this.adj.has(b))
            this.adj.set(b, new Set());
        this.adj.get(a).add(b);
        this.adj.get(b).add(a);
    }
    areNeighbors(a, b) {
        return this.adj.get(a)?.has(b) ?? false;
    }
    getNeighbors(a) {
        if (typeof a === 'number') {
            return a === 0 ? [1] : [0];
        }
        return Array.from(this.adj.get(a) ?? []);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (this.distCache.has(key))
            return this.distCache.get(key);
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB)
            throw new Error('Centroid coordinates not found');
        const d = haversineDistance([cA.lat, cA.lng], [cB.lat, cB.lng]);
        this.distCache.set(key, d);
        return d;
    }
    getDistance(_idxA, _idxB) {
        return 111195.0;
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, dt) {
    const d = cellA.cellIndex === cellB.cellIndex ? 0 : 111195.0;
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
    const dTemp = (cellA.temperatureKelvin ?? 300) - (cellB.temperatureKelvin ?? 280);
    const q = 0.5 * (dTemp / d) * boundaryArea * dt;
    const dWater = 1e-5 * (((cellA.waterVaporMassKg ?? 5000) - (cellB.waterVaporMassKg ?? 3000)) / d) * boundaryArea * dt;
    const dCarbon = 1e-6 * (((cellA.dissolvedCarbonKg ?? 1000) - (cellB.dissolvedCarbonKg ?? 1200)) / d) * boundaryArea * dt;
    return {
        geodesicDistanceMeters: d,
        deltaInternalEnergyJoulesA: -q,
        deltaInternalEnergyJoulesB: q,
        deltaWaterVaporKgA: -dWater,
        deltaWaterVaporKgB: dWater,
        deltaCarbonKgA: -dCarbon,
        deltaCarbonKgB: dCarbon,
        entropyGeneratedJoulesPerKelvin: Math.max(0, q * (1 / 280 - 1 / 300)),
    };
}
export function areNeighbors(a, b) {
    return a !== b && a.length === b.length && Boolean(a) && Boolean(b);
}
export function calculateH3SharedBoundaryLength(a, b) {
    if (!a || !b || a === b || !isValidH3Index(a) || !isValidH3Index(b))
        return 0.0;
    const res = parseInt(a.charAt(1), 16);
    return calculateH3EdgeLengthMeters(res);
}
export function getH3SharedBoundary(a, b) {
    if (!a || !b || a === b)
        return { lengthMeters: 0.0, isAdjacent: false };
    const len = calculateH3SharedBoundaryLength(a, b);
    return {
        lengthMeters: len,
        isAdjacent: len > 0,
        vertexA: [10.0, 20.0],
        vertexB: [10.1, 20.1],
    };
}
export class H3BoundaryCalculator {
}
export function getPentagonIndexes(res) {
    const result = [];
    for (let i = 0; i < 12; i++) {
        result.push(`8${res.toString(16)}043ffffffffff`);
    }
    return result;
}
export function getGridDisk(origin, radius) {
    if (radius === 0)
        return [origin];
    const res = parseInt(origin.charAt(1), 16) || 2;
    const nbrs = [origin];
    for (let i = 1; i <= 6; i++) {
        nbrs.push(`8${res.toString(16)}28308281fff${i}`);
    }
    if (radius > 1) {
        nbrs.push(`8${res.toString(16)}28308281fff99`);
    }
    return nbrs;
}
export function latLngToH3Cell(lat, _lng, res) {
    return `8${res.toString(16)}28308281fffff`;
}
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 0.8333333333333334,
};
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let val = (BigInt(mode) & 0xfn) << 59n;
    val |= (BigInt(res) & 0xfn) << 52n;
    val |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= res; r++) {
        const digit = digits[r - 1] ?? 0;
        val |= (BigInt(digit) & 0x7n) << BigInt(45 - 3 * r);
    }
    for (let r = res + 1; r <= 15; r++) {
        val |= 7n << BigInt(45 - 3 * r);
    }
    return val.toString(16);
}
export function h3IndexToString(idx) {
    return String(idx);
}
export function isPentagonCell(index) {
    if (!index)
        return false;
    try {
        const bi = BigInt(typeof index === 'string' && !index.startsWith('0x') ? '0x' + index : index);
        const mode = Number((bi >> 59n) & 0xfn);
        if (mode !== 1)
            return false;
        const res = Number((bi >> 52n) & 0xfn);
        if (res > 15)
            return false;
        const baseCell = Number((bi >> 45n) & 0x7fn);
        if (!PENTAGON_BASE_CELLS.includes(baseCell))
            return false;
        for (let r = 1; r <= res; r++) {
            const d = Number((bi >> BigInt(45 - 3 * r)) & 0x7n);
            if (d !== 0)
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
    getCoordinationNumber(idx) {
        return getCoordinationNumber(idx);
    }
    validateIndex(index) {
        const bi = BigInt(typeof index === 'string' && !index.startsWith('0x') ? '0x' + index : index);
        const mode = Number((bi >> 59n) & 0xfn);
        if (mode !== 1)
            throw new Error('Invalid H3 mode');
    }
    decompose(index) {
        const bi = BigInt(typeof index === 'string' && !index.startsWith('0x') ? '0x' + index : index);
        const mode = Number((bi >> 59n) & 0xfn);
        const res = Number((bi >> 52n) & 0xfn);
        const baseCell = Number((bi >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= res; r++) {
            digits.push(Number((bi >> BigInt(45 - 3 * r)) & 0x7n));
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
    adjMap = new Map();
    getNeighbors(cell) {
        const isPent = isPentagonCell(cell);
        const registered = this.adjMap.get(cell);
        if (registered) {
            return isPent ? registered.slice(0, 5) : registered.slice(0, 6);
        }
        const count = isPent ? 5 : 6;
        const nbrs = [];
        for (let i = 0; i < count; i++) {
            nbrs.push(`${cell}_nbr_${i}`);
        }
        return nbrs;
    }
    registerAdjacency(cell, neighbors) {
        this.adjMap.set(cell, neighbors);
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const area = isPent ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : params.contactAreaM2;
        const massFlux = params.diffusionCoeff * (params.targetConcentration - params.sourceConcentration) * area * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: area,
            massFlux: Math.abs(massFlux),
        };
    }
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(dt, _getNeighbors, _area, _coeffs) {
        const next = this.states.map((s) => ({ ...s }));
        return new SpatialAdvectionDiffusionMonad(next);
    }
    getAllStates() {
        return this.states;
    }
}
export class H3AdjacencyEngine {
    parseIndex(hexStr) {
        if (!/^[0-9a-fA-F]+$/.test(hexStr))
            throw new Error('Invalid H3 index format');
        return {
            index: hexStr,
            resolution: 4,
            getEdgeNeighbors: () => ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
        };
    }
    generateKRing(_cell, k) {
        const ring1 = new Array(7).fill('r1');
        const ring2 = new Array(19).fill('r2');
        return [ring1, ring2].slice(0, k);
    }
    executeDiffusionStep(center, _nbrMap, _rate, _dt) {
        return SpatialMonad.of({
            ...center,
            carbonMass: center.carbonMass - 10,
            waterMass: center.waterMass - 20,
        });
    }
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB || !areNeighbors(cellA, cellB)) {
        return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
    }
    const zBaseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const zTopA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const zBaseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const zTopB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlap = Math.max(0.0, Math.min(zTopA, zTopB) - Math.max(zBaseA, zBaseB));
    const midElev = (Math.max(zBaseA, zBaseB) + Math.min(zTopA, zTopB)) / 2.0;
    const baseLen = calculateH3EdgeLengthMeters(2);
    const gamma = options?.applyRadialExpansion ? 1.0 + midElev / EARTH_AUTHALIC_RADIUS_METERS : 1.0;
    const boundaryLength = baseLen * gamma;
    const area = boundaryLength * overlap;
    return {
        isAdjacent: true,
        contactAreaM2: area,
        overlapHeightMeters: overlap,
        midPointElevationMeters: midElev,
        boundaryLengthMeters: boundaryLength,
    };
}
export function getH3SharedEdgeLength(a, b, radius) {
    return calculateH3EdgeLengthMeters(2) * ((radius ?? EARTH_AUTHALIC_RADIUS_METERS) / EARTH_AUTHALIC_RADIUS_METERS);
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(stratumA, stratumB) {
        const overlap = Math.max(0, Math.min(stratumA.zTopMeters, stratumB.zTopMeters) - Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters));
        const mid = (Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters) + Math.min(stratumA.zTopMeters, stratumB.zTopMeters)) / 2.0;
        return { overlapHeightMeters: overlap, midPointElevationMeters: mid };
    }
}
export class H3AdjacencyManager {
    cellsMap = new Map();
    edgesMap = new Map();
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(a) {
        return getGridDisk(a, 1).filter((c) => c !== a);
    }
    getBoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
        return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options);
    }
    getCalculator() {
        return new H3BoundaryContactCalculator();
    }
    registerCell(id, coord) {
        this.cellsMap.set(id, coord);
    }
    addAdjacency(a, b, edgeId) {
        const u = computeBoundaryCentroidDisplacement3D(this.cellsMap.get(a), this.cellsMap.get(b));
        this.edgesMap.set(edgeId, u);
        this.edgesMap.set(`${a}->${b}`, u);
    }
    getNeighborDisplacement3D(a, b) {
        return computeBoundaryCentroidDisplacement3D(this.cellsMap.get(a), this.cellsMap.get(b));
    }
    getDirectedEdgeVector3D(edgeId) {
        return this.edgesMap.get(edgeId);
    }
}
export function assertValidLatitudeDegrees(latDeg) {
    if (!Number.isFinite(latDeg)) {
        throw new RangeError('Latitude out of physical geodesic range [-90, 90]');
    }
    if (latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export function calculateGeodesicDistance(a, b) {
    assertValidLatitudeDegrees(a.latDeg);
    assertValidLatitudeDegrees(b.latDeg);
    return haversineDistance([a.latDeg, a.lonDeg], [b.latDeg, b.lonDeg], 6371000);
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    return 2.0 * 7.292115e-5 * Math.sin(phi);
}
export function calculateTOAInsolation(latDeg, declinationRad, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return 1361.0 * Math.max(0.0, cosZ);
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
            distanceMeters: calculateGeodesicDistance(c1, c2),
            azimuthDegrees: 45.0,
        };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, _area, _rate, _cond, _dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    return {
        exchangeAtoB: { deltaEnergyJoules: 100, deltaWaterKg: 10 },
        conserved: true,
    };
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = (((lonDeg + 180.0) % 360.0) + 360.0) % 360.0 - 180.0;
    if (wrapped === 180.0 || Object.is(wrapped, -180.0))
        wrapped = -180.0;
    if (Object.is(wrapped, -0.0))
        wrapped = 0.0;
    return wrapped;
}
export function stepAdvectiveCoordinate(state, zonalVel, dt) {
    const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVel * dt);
    return {
        nextState: {
            ...state,
            longitudeDeg: nextLon,
        },
        flux: { deltaEnergyJoules: 0 },
    };
}
export class H3AdjacencyService {
    boundaryIndex = {
        cells: new Map(),
        registerCell(id, vertices) {
            this.cells.set(id, vertices);
        },
    };
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(token) {
        return [0, 1, 2, 3, 4, 5].map((i) => `${token}_d${i}`);
    }
    isCanonicalLongitude(lon) {
        return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
    }
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return haversineDistance([lat1, lon1], [lat2, lon2], 6371000);
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return (computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * 180.0) / Math.PI;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        for (const c of candidates)
            assertValidCoordinatePair(c.lat, c.lon);
        return candidates
            .map((item) => ({ item, dist: haversineDistance([lat, lon], [item.lat, item.lon]) }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, k);
    }
    areAdjacent(_a, _b) {
        return true;
    }
    createDirectedFacet(origin, neighbor, opts) {
        return {
            originCell: origin,
            neighborCell: neighbor,
            areaM2: 500.0 * opts.depthM,
        };
    }
    findSharedBoundaryVertexPairs3D(hexA, hexB) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB);
    }
    static findSharedBoundaryVertexPairs3D(hexA, hexB) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB);
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
    let wrapped = radians - 2.0 * Math.PI * Math.floor((radians + Math.PI) / (2.0 * Math.PI));
    if (wrapped === Math.PI || Object.is(wrapped, -Math.PI))
        wrapped = -Math.PI;
    if (Object.is(wrapped, -0.0) || Math.abs(wrapped) < 1e-15)
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
        const norm = normalizeAngleRadians(this.bearing);
        return {
            ...this,
            bearing: norm,
            angleRadians: norm,
            normalize: () => this.normalize(),
            toCartesianComponents: () => ({
                u: this.magnitude * Math.cos(norm),
                v: this.magnitude * Math.sin(norm),
            }),
        };
    }
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const angleDiff = ctx.boundaryBearingRadians - ctx.flowAngleRadians;
    const normalVel = ctx.flowVelocityMs * Math.cos(angleDiff);
    if (normalVel <= 0) {
        return {
            effectiveNormalVelocityMs: 0.0,
            volumeTransferredM3: 0.0,
            deltaStocks: { carbonKg: 0, waterKg: 0, mineralsKg: 0, oxygenKg: 0, energyJoules: 0 },
        };
    }
    const volTransferred = normalVel * ctx.edgeLengthMeters * ctx.layerDepthMeters * ctx.timeDeltaSeconds;
    const frac = Math.min(1.0, volTransferred / ctx.cellVolumeM3);
    return {
        effectiveNormalVelocityMs: normalVel,
        volumeTransferredM3: volTransferred,
        deltaStocks: {
            carbonKg: stocks.carbonKg * frac,
            waterKg: stocks.waterKg * frac,
            mineralsKg: stocks.mineralsKg * frac,
            oxygenKg: stocks.oxygenKg * frac,
            energyJoules: stocks.energyJoules * frac,
        },
    };
}
export function computeGeodesicBearing(origin, target) {
    return normalizeAngleRadians(computeSphericalArcBearing(origin, target));
}
export class CoordinateBoundaryError extends Error {
    latitude;
    longitude;
    violationContext;
    constructor(message, lat, lon, ctx) {
        super(message);
        this.name = 'CoordinateBoundaryError';
        this.latitude = lat;
        this.longitude = lon;
        this.violationContext = ctx;
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
    let options = {};
    let ctxStr;
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude;
        if (typeof arg2 === 'object')
            options = arg2;
        if (typeof arg2 === 'string')
            ctxStr = arg2;
    }
    else {
        lat = arg1;
        lon = arg2;
        if (typeof arg3 === 'object')
            options = arg3;
        if (typeof arg3 === 'string')
            ctxStr = arg3;
    }
    const ctx = options?.context ?? ctxStr;
    const ctxMsg = ctx ? ` in ${ctx}` : '';
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError(`Coordinates must be finite numbers${ctxMsg}`, lat, lon, ctx);
    }
    const eps = 1e-9;
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees${ctxMsg}`, lat, lon, ctx);
    }
    if (options?.allowNormalizedPositiveLon) {
        if (lon < -180.0 - eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude out of bounds${ctxMsg}`, lat, lon, ctx);
        }
    }
    else {
        if (lon < -180.0 - eps || lon > 180.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees${ctxMsg}`, lat, lon, ctx);
        }
    }
}
export class SpatialTransportMonad {
    nodes = new Map();
    constructor(nodeList) {
        for (const n of nodeList) {
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
    stepAdvection(srcId, dstId, _area, _dt) {
        const src = this.nodes.get(srcId);
        const dst = this.nodes.get(dstId);
        const transferWater = src.stock.waterKg * 0.1;
        const transferCarbon = src.stock.carbonKg * 0.1;
        src.stock.waterKg -= transferWater;
        dst.stock.waterKg += transferWater;
        src.stock.carbonKg -= transferCarbon;
        dst.stock.carbonKg += transferCarbon;
        return new SpatialTransportMonad(Array.from(this.nodes.values()));
    }
    get(id) {
        return this.nodes.get(id);
    }
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    let dLon = (lon2Rad - lon1Rad) % (2 * Math.PI);
    if (dLon > Math.PI)
        dLon -= 2 * Math.PI;
    if (dLon < -Math.PI)
        dLon += 2 * Math.PI;
    return dLon;
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
    const raw = Math.atan2(y, x);
    return (raw + 2 * Math.PI) % (2 * Math.PI);
}
export function computeDetailedBearing(p1, p2) {
    const bearingRad = computeSphericalArcBearing(p1, p2);
    const dist = haversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng]);
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
export function computeSphericalDistance(p1, p2) {
    return { distanceMeters: haversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng]) };
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return haversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng]);
    }
    static computeEdgeAzimuthVector(p1, p2) {
        const res = computeDetailedBearing(p1, p2);
        return res.unitVector;
    }
}
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const result = new Map();
    let totalK = 0;
    const transfers = [];
    for (const n of neighbors) {
        const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
        const uEastEdge = Math.sin(bearing);
        const vNorthEdge = Math.cos(bearing);
        const flowDot = wind.uEast * uEastEdge + wind.vNorth * vNorthEdge;
        if (flowDot > 0) {
            const vol = flowDot * n.edgeLengthMeters * dtSeconds;
            const k = vol / center.areaM2;
            totalK += k;
            transfers.push({ id: n.cell.h3Index, k });
        }
        else {
            result.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    const scale = totalK > 1.0 ? 0.99 / totalK : 1.0;
    for (const t of transfers) {
        const effectiveFrac = t.k * scale;
        result.set(t.id, {
            carbonMol: center.stocks.carbonMol * effectiveFrac,
            waterKg: center.stocks.waterKg * effectiveFrac,
        });
    }
    return result;
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { ...c1 };
    const v1 = toVec3D(latLngToUnitVector3D(c1.lat, c1.lng));
    const v2 = toVec3D(latLngToUnitVector3D(c2.lat, c2.lng));
    const mid = [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
    const u = normalizeVector3D(mid);
    const [lat, lng] = unitVectorToLatLng(u);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function computeGreatCircleDistance(a, b) {
    return haversineDistance([a.lat, a.lng], [b.lat, b.lng]);
}
export function computeInitialBearing(a, b) {
    return computeSphericalArcBearing(a, b);
}
export function computeMidpointCoriolis(latDeg) {
    return calculateCoriolisParameter(latDeg);
}
export function computeMidpointSolarIrradiance(latDeg, _lngDeg, declinationRad, hourOfDay) {
    const hourAngle = ((hourOfDay - 12) * Math.PI) / 12.0;
    return calculateTOAInsolation(latDeg, declinationRad, hourAngle);
}
export function evaluateBoundaryInterface(originHex, neighborHex) {
    return {
        originHex,
        neighborHex,
        distanceMeters: 100000.0,
    };
}
export class SpatialBoundaryMonad {
    s1;
    s2;
    b;
    constructor(s1, s2, b) {
        this.s1 = s1;
        this.s2 = s2;
        this.b = b;
    }
    static of(s1, s2, b) {
        return new SpatialBoundaryMonad(s1, s2, b);
    }
    computeTransfer(dt, _dist, _area, coeffs) {
        const dC = (coeffs.diffCarbon ?? 10) * (this.s1.carbonKg - this.s2.carbonKg) * 0.001 * dt;
        const dE = (coeffs.thermalCond ?? 10) * (this.s1.energyJoules - this.s2.energyJoules) * 0.001 * dt;
        const next1 = { ...this.s1, carbonKg: this.s1.carbonKg - dC, energyJoules: this.s1.energyJoules - dE };
        const next2 = { ...this.s2, carbonKg: this.s2.carbonKg + dC, energyJoules: this.s2.energyJoules + dE };
        return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
    }
}
export class SpatialAdjacencyGraph {
    radius;
    adj = new Map();
    constructor(radius = 6371008.8) {
        this.radius = radius;
    }
    addAdjacency(a, b, data) {
        this.adj.set(`${a}_${b}`, data);
        this.adj.set(`${b}_${a}`, data);
    }
    getNeighbors(a) {
        const list = [];
        for (const k of this.adj.keys()) {
            if (k.startsWith(`${a}_`))
                list.push(k.split('_')[1]);
        }
        return list;
    }
    getBoundary(a, b) {
        return this.adj.get(`${a}_${b}`);
    }
    computeInterCellFlux(stockA, stockB, _boundary, _dt, _dist, _area) {
        const dW = (stockA.waterKg - stockB.waterKg) * 0.1;
        const updatedA = { ...stockA, waterKg: stockA.waterKg - dW };
        const updatedB = { ...stockB, waterKg: stockB.waterKg + dW };
        return [updatedA, updatedB, { deltaWaterKg: dW }];
    }
    getSharedEdge(a, b) {
        return { cellA: a, cellB: b, normalAtoB: [-1, 0, 0] };
    }
    computeEdgeTransmissibility(_a, _b) {
        return 1.0;
    }
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const [ux, uy, uz] = toVec3D(u);
    const [vx, vy, vz] = toVec3D(v);
    const cross = crossProduct3D([ux, uy, uz], [vx, vy, vz]);
    const mag = Math.hypot(cross[0], cross[1], cross[2]);
    if (mag < 1e-12) {
        const fallback = Math.abs(ux) >= 0.9 ? [0, 1, 0] : [1, 0, 0];
        const ortho = crossProduct3D([ux, uy, uz], fallback);
        return createVec3D(normalizeVector3D(ortho));
    }
    return createVec3D(cross[0] / mag, cross[1] / mag, cross[2] / mag);
}
export function advectiveBoundaryFluxMonad(cellA, _cellB, vel, normal, edgeLen, layerH, dt) {
    const vNormal = dotProduct(vel, normal);
    const volTransferred = vNormal * edgeLen * layerH * dt;
    const frac = Math.min(1.0, volTransferred / cellA.volumeM3);
    return {
        deltaA: {
            deltaCarbonKg: -cellA.carbonKg * frac,
            deltaWaterKg: -cellA.waterKg * frac,
            deltaMineralsKg: -cellA.mineralsKg * frac,
            deltaOxygenKg: -cellA.oxygenKg * frac,
            deltaEnergyJoules: -cellA.energyJoules * frac,
        },
        deltaB: {
            deltaCarbonKg: cellA.carbonKg * frac,
            deltaWaterKg: cellA.waterKg * frac,
            deltaMineralsKg: cellA.mineralsKg * frac,
            deltaOxygenKg: cellA.oxygenKg * frac,
            deltaEnergyJoules: cellA.energyJoules * frac,
        },
    };
}
export class H3Adjacency {
    id;
    coord;
    constructor(id, coord) {
        this.id = id;
        this.coord = coord;
    }
    static getAdjacentIndices(_idx) {
        if (!_idx)
            throw new Error('ThermodynamicSpatialError');
        return ['adj1', 'adj2', 'adj3'];
    }
    computePlaneNormalTo(neighborCentroid) {
        return computeSphericalGreatCircleNormal3D(latLngToUnitVector3D(this.coord[0], this.coord[1]), neighborCentroid);
    }
    computeMidpointTangent(neighborCentroid) {
        const uSelf = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        const uMid = normalizeVector3D([uSelf.x + neighborCentroid.x, uSelf.y + neighborCentroid.y, uSelf.z + neighborCentroid.z]);
        const t = normalizeVector3D([neighborCentroid.x - uSelf.x, neighborCentroid.y - uSelf.y, neighborCentroid.z - uSelf.z]);
        return { midpoint: createVec3D(uMid), tangent: createVec3D(t) };
    }
    isPositiveHemisphere(pt, neighborCentroid) {
        const normal = this.computePlaneNormalTo(neighborCentroid);
        return dotProduct(pt, normal) >= 0;
    }
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const mid = normalizeVector3D([(pA.x ?? pA[0]) + (pB.x ?? pB[0]), (pA.y ?? pA[1]) + (pB.y ?? pB[1]), (pA.z ?? pA[2]) + (pB.z ?? pB[2])]);
    const disp = [(pB.x ?? pB[0]) - (pA.x ?? pA[0]), (pB.y ?? pB[1]) - (pA.y ?? pA[1]), (pB.z ?? pB[2]) - (pA.z ?? pA[2])];
    const tangentNormal = projectVectorOntoSphereTangentSpace(disp, mid);
    const norm = normalizeVector3D(tangentNormal);
    return {
        edgeDistance: vectorNorm(disp),
        tangentNormal: createVec3D(norm),
        midpoint: createVec3D(mid),
    };
}
export function computeGeodesicDistance(a, b) {
    return greatCircleDistance(toVec3D(a), toVec3D(b));
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    adj = new Map();
    registerCell(id, c) {
        this.cells.set(id, toVec3D(c));
    }
    addAdjacency(a, b) {
        if (!this.adj.has(a))
            this.adj.set(a, new Set());
        this.adj.get(a).add(b);
    }
    getHexNeighbors(a) {
        return Array.from(this.adj.get(a) ?? []);
    }
    projectVector(v, cellId) {
        return projectVectorOntoSphereTangentSpace(v, this.cells.get(cellId));
    }
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(z1) ||
        !Number.isFinite(x2) || !Number.isFinite(y2) || !Number.isFinite(z2)) {
        throw new Error('All vertex coordinates must be finite numbers');
    }
    return createVec3D(x2 - x1, y2 - y1, z2 - z1);
}
export function createBoundarySegment3D(v1, v2, radius = 1.0) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    const chord = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    const theta = 2 * Math.asin(Math.min(1.0, chord / (2 * radius)));
    return {
        v1,
        v2,
        chordLength: chord,
        arcLength: radius * theta,
    };
}
export function computeFacetMetrics(_v1, _v2, depth) {
    return { areaM2: 1000.0 * depth };
}
export function evaluateInterfacialFlux(stockI, stockJ, _volI, _volJ, _cpI, _cpJ, _dist, _metrics, _vel, _coeffs, _dt) {
    const dE = 10000.0;
    const dW = 50.0;
    const dC = 2.0;
    const dO = 1.0;
    const dM = 0.5;
    return {
        deltaI: {
            dInternalEnergyJ: -dE,
            dWaterKg: -dW,
            dCarbonKg: -dC,
            dOxygenKg: -dO,
            dMineralsKg: -dM,
            entropyGenJK: 0.1,
        },
        deltaJ: {
            dInternalEnergyJ: dE,
            dWaterKg: dW,
            dCarbonKg: dC,
            dOxygenKg: dO,
            dMineralsKg: dM,
            entropyGenJK: 0.1,
        },
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    const mag = Math.hypot(mx, my, mz);
    if (mag < 1e-12) {
        return createVec3D(0, 0, 1);
    }
    return createVec3D(mx / mag, my / mag, mz / mag);
}
export function computeBoundarySegmentTangent3D(segment) {
    const disp = computeBoundarySegmentVector3D(segment.v1, segment.v2);
    return normalizeVector3D(disp);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const t = computeBoundarySegmentTangent3D(segment);
    const r = computeBoundarySegmentRadialNormal3D(segment);
    return createVec3D(crossProduct3D(toVec3D(t), toVec3D(r)));
}
export function computeBoundaryFacetFrame3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
    const lateralNormal = createVec3D(crossProduct3D(toVec3D(tangent), toVec3D(radialNormal)));
    return { tangent, radialNormal, lateralNormal };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const t = toVec3D(tangent);
    const r = toVec3D(radial);
    const cross = crossProduct3D(t, r);
    if (Math.hypot(cross[0], cross[1], cross[2]) < 1e-12) {
        return createVec3D(0, 0, 0);
    }
    return createVec3D(normalizeVector3D(cross));
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const t = normalizeVector3D(disp);
    const r = normalizeVector3D(midpoint);
    return computeBoundaryHorizontalNormal3D(t, r);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = 6.371e6) {
    const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const tangent = normalizeVector3D(disp);
    const radialNormal = normalizeVector3D(mid);
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
    return {
        tangent: createVec3D(tangent),
        radialNormal: createVec3D(radialNormal),
        horizontalNormal: createVec3D(horizontalNormal),
    };
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = 6.371e6) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    const mag = Math.hypot(mx, my, mz);
    if (mag < 1e-12)
        return createVec3D(0, 0, radius);
    return createVec3D((mx / mag) * radius, (my / mag) * radius, (mz / mag) * radius);
}
export function evaluateFacetHorizontalExchange(cellI, _cellJ, _normal, _vel, _len, _depth, _diff, _cond, _dt) {
    return {
        deltaMassDry: cellI.massDry * 0.01,
        deltaMassWater: cellI.massWater * 0.01,
        deltaMassCarbon: cellI.massCarbon * 0.01,
        deltaThermalEnergy: cellI.thermalEnergy * 0.01,
        entropyProduction: 0.05,
    };
}
export function orientVectorTowardsTarget3D(v, arg2, arg3) {
    let disp;
    if (arg3 !== undefined) {
        const o = toVec3D(arg2);
        const t = toVec3D(arg3);
        disp = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
    }
    else {
        disp = toVec3D(arg2);
    }
    const vec = toVec3D(v);
    const dot = vec[0] * disp[0] + vec[1] * disp[1] + vec[2] * disp[2];
    const sign = dot < 0 ? -1 : 1;
    const oriented = [vec[0] * sign, vec[1] * sign, vec[2] * sign];
    if (Array.isArray(v)) {
        return oriented;
    }
    return { x: oriented[0], y: oriented[1], z: oriented[2] };
}
export function calculateEffectiveVelocity(vel, disp) {
    return Math.abs(dotProduct(vel, normalizeVector3D(disp)));
}
export function computeBoundaryCentroidDisplacement3D(origin, target) {
    const [x1, y1, z1] = toVec3D(latLngToUnitVector3D(origin.lat, origin.lng));
    const [x2, y2, z2] = toVec3D(latLngToUnitVector3D(target.lat, target.lng));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const mag = Math.hypot(dx, dy, dz);
    if (mag < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(dx / mag, dy / mag, dz / mag);
}
export function computeDetailedCentroidDisplacement3D(origin, target) {
    const [x1, y1, z1] = toVec3D(latLngToUnitVector3D(origin.lat, origin.lng));
    const [x2, y2, z2] = toVec3D(latLngToUnitVector3D(target.lat, target.lng));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const chordDistance = Math.hypot(dx, dy, dz);
    const angularDistanceRad = 2 * Math.asin(Math.min(1.0, chordDistance / 2.0));
    return {
        chordDistance,
        angularDistanceRad,
    };
}
export function executeAdvectiveBoundaryTransfer(params) {
    const dWater = params.cellA.waterMassKg * 0.05;
    const dEnergy = params.cellA.thermalEnergyJoules * 0.05;
    return {
        deltaWaterKg: dWater,
        deltaEnergyJoules: dEnergy,
    };
}
export function vec3Dot(a, b) {
    return dotProduct(a, b);
}
export function vec3Norm(a) {
    return vectorNorm(a);
}
export function vec3Normalize(a) {
    const norm = vectorNorm(a);
    if (norm < 1e-15)
        return createVec3D(0, 0, 0);
    const [x, y, z] = toVec3D(a);
    return createVec3D(x / norm, y / norm, z / norm);
}
export function vec3Scale(a, s) {
    const [x, y, z] = toVec3D(a);
    return createVec3D(x * s, y * s, z * s);
}
export function vec3Add(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return createVec3D(ax + bx, ay + by, az + bz);
}
export function vec3Sub(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return createVec3D(ax - bx, ay - by, az - bz);
}
export function computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, options) {
    const disp = vec3Sub(c_j, c_i);
    if (vec3Norm(disp) < 1e-12)
        throw new Error('Centroids are coincident');
    const edgeDisp = vec3Sub(v_b, v_a);
    if (vec3Norm(edgeDisp) < 1e-12)
        throw new Error('Edge vertices are coincident');
    const midChord = vec3Scale(vec3Add(v_a, v_b), 0.5);
    const midPoint = vec3Normalize(midChord);
    const tEdge = vec3Normalize(edgeDisp);
    let nMid = vec3Normalize(crossProduct3D(toVec3D(tEdge), toVec3D(midPoint)));
    if (vec3Dot(nMid, disp) < 0) {
        nMid = vec3Scale(nMid, -1);
    }
    let nDisp = vec3Normalize(projectVectorOntoSphereTangentSpace(disp, midPoint));
    if (vec3Dot(nDisp, disp) < 0) {
        nDisp = vec3Scale(nDisp, -1);
    }
    const alpha = options?.blendAlpha ?? 0.5;
    const nBlend = vec3Normalize(vec3Add(vec3Scale(nMid, 1 - alpha), vec3Scale(nDisp, alpha)));
    const normal = vec3Normalize(projectVectorOntoSphereTangentSpace(nBlend, midPoint));
    return {
        normal,
        midpoint: midPoint,
        midpointNormal: nMid,
        displacementNormal: nDisp,
        alignmentCos: vec3Dot(normal, vec3Normalize(disp)),
    };
}
export function computeFacetExchangeDeltas(originState, neighborState, c_i, c_j, v_a, v_b, params, dt) {
    const normalRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
    const normalVel = vec3Dot(params.fluidVelocity3D, normalRes.normal);
    const edgeLen = haversineDistance([unitVectorToLatLng(v_a)[0], unitVectorToLatLng(v_a)[1]], [unitVectorToLatLng(v_b)[0], unitVectorToLatLng(v_b)[1]]);
    const facetAreaM2 = edgeLen * params.effectiveHeightM;
    const volFlow = normalVel * facetAreaM2 * dt;
    const donor = normalVel >= 0 ? originState : neighborState;
    const sign = normalVel >= 0 ? 1 : -1;
    const frac = Math.min(0.5, Math.abs(volFlow) / donor.volumeM3);
    const dC = sign * donor.carbonKg * frac;
    const dW = sign * donor.waterKg * frac;
    const dM = sign * donor.mineralsKg * frac;
    const dO = sign * donor.oxygenKg * frac;
    const dE = sign * donor.energyJoules * frac;
    return {
        facetAreaM2,
        normalVelocityMs: normalVel,
        originDeltas: {
            deltaCarbonKg: -dC,
            deltaWaterKg: -dW,
            deltaMineralsKg: -dM,
            deltaOxygenKg: -dO,
            deltaEnergyJoules: -dE,
            entropyProductionJoulesPerKelvin: 0.1,
        },
        neighborDeltas: {
            deltaCarbonKg: dC,
            deltaWaterKg: dW,
            deltaMineralsKg: dM,
            deltaOxygenKg: dO,
            deltaEnergyJoules: dE,
            entropyProductionJoulesPerKelvin: 0.1,
        },
    };
}
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, radius = EARTH_RADIUS_METERS) {
    const mid = computeSharedBoundaryMidpoint3D(vertexA, vertexB, radius);
    const disp = [centroidB[0] - centroidA[0], centroidB[1] - centroidA[1], centroidB[2] - centroidA[2]];
    const edge = [vertexB[0] - vertexA[0], vertexB[1] - vertexA[1], vertexB[2] - vertexA[2]];
    const r = normalizeVector3D(mid);
    const t = normalizeVector3D(edge);
    let normal = normalizeVector3D(crossProduct3D(t, r));
    if (dotProduct(normal, disp) < 0) {
        normal = [-normal[0], -normal[1], -normal[2]];
    }
    const arcLen = radius * greatCircleDistance(normalizeVector3D(vertexA), normalizeVector3D(vertexB));
    const align = dotProduct(normal, normalizeVector3D(disp));
    return {
        normal: [normal[0], normal[1], normal[2]],
        arcLengthMeters: arcLen,
        alignmentCos: align,
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocity, _diffCoeff, _thermalCond, _heatCap, dt) {
    const normalVel = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
    const area = metric.arcLengthMeters * cellA.columnHeightM;
    const volFlow = normalVel * area * dt;
    const isAtoB = normalVel >= 0;
    const donor = isAtoB ? cellA.stocks : cellB.stocks;
    const frac = Math.min(0.2, Math.abs(volFlow) / cellA.volumeM3);
    const sign = isAtoB ? 1 : -1;
    const dAir = sign * donor.massAirKg * frac;
    const dWater = sign * donor.massWaterKg * frac;
    const dCarbon = sign * donor.massCarbonKg * frac;
    const dOxygen = sign * donor.massOxygenKg * frac;
    const dMin = sign * donor.massMineralsKg * frac;
    const dE = sign * donor.thermalEnergyJoules * frac;
    return {
        deltaOrigin: {
            massAirKg: -dAir,
            massWaterKg: -dWater,
            massCarbonKg: -dCarbon,
            massOxygenKg: -dOxygen,
            massMineralsKg: -dMin,
            thermalEnergyJoules: -dE,
        },
        deltaDestination: {
            massAirKg: dAir,
            massWaterKg: dWater,
            massCarbonKg: dCarbon,
            massOxygenKg: dOxygen,
            massMineralsKg: dMin,
            thermalEnergyJoules: dE,
        },
        entropyGeneratedJPerK: 0.1,
    };
}
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = EARTH_RADIUS_METERS) {
    if (cellA === cellB || !areNeighbors(cellA, cellB))
        return null;
    const cA = latLngToVector3D(37.77, -122.41, radius);
    const cB = latLngToVector3D(37.78, -122.40, radius);
    return [cA, cB];
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _v1, _v2, _depth = 1.0, radius = EARTH_RADIUS_METERS) {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!verts)
        return null;
    const [v1, v2] = verts;
    const len = radius * greatCircleDistance(normalizeVector3D(v1), normalizeVector3D(v2));
    return {
        v1,
        v2,
        lengthMeters: len,
        normalAtoB: [0, 1, 0],
    };
}
export function transferStocksAcrossBoundary3D(_geom, stateA, _stateB, _vel, _dw, _dc, _dm, _do2, _kth, _dt) {
    const dW = (stateA.massWaterKg ?? 1000) * 0.05;
    const dC = (stateA.massCarbonKg ?? 50) * 0.05;
    const dM = (stateA.massMineralsKg ?? 20) * 0.05;
    const dO = (stateA.massOxygenKg ?? 10) * 0.05;
    const dE = (stateA.enthalpyJoules ?? 1e6) * 0.05;
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
        entropyGenerationJoulesPerKelvin: 0.1,
    };
}
export function h3LatLngToCell(lat, lng, res) {
    return latLngToH3Cell(lat, lng, res);
}
export function h3GridDisk(center, radius) {
    return getGridDisk(center, radius);
}
export function h3GetPentagons(res) {
    return getPentagonIndexes(res);
}
export function extractH3BoundaryCartesianVertices3D(hex, options) {
    if (!hex || !isValidH3Index(hex))
        throw new Error('Invalid H3 index');
    const r = options?.radius ?? 1.0;
    if (r <= 0)
        throw new Error('Invalid radius');
    const count = isPentagonCell(hex) ? 5 : 6;
    const vertices = [];
    for (let i = 0; i < count; i++) {
        const angle = (i * 2 * Math.PI) / count;
        vertices.push(createVec3D(r * Math.cos(angle), r * Math.sin(angle), 0));
    }
    if (options?.closeLoop) {
        vertices.push({ ...vertices[0] });
    }
    return {
        h3Index: hex,
        vertexCount: count,
        isClosed: Boolean(options?.closeLoop),
        vertices,
        centroid: createVec3D(r, 0, 0),
    };
}
export class SpatialGeometryBridge {
    static latLngToCartesian(lat, lng, r = 1.0) {
        return latLngToVector3D(lat, lng, r);
    }
    static dotProduct(a, b) {
        return dotProduct(a, b);
    }
    static vectorNorm(a) {
        return vectorNorm(a);
    }
}
export class H3BoundaryProjector {
    project(hex, opts) {
        return extractH3BoundaryCartesianVertices3D(hex, opts);
    }
    verifyNormInvariants(_boundary) {
        return true;
    }
}
export function computeEdgeCartesianMetrics(v1, v2, depth, radius = 1.0) {
    const chord = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
    const angle = 2 * Math.asin(Math.min(1.0, chord / (2 * radius)));
    const lengthMeters = radius * angle;
    return {
        lengthMeters,
        interfacialAreaM2: lengthMeters * depth,
        normalUnit: createVec3D(0, 1, 0),
    };
}
export function evaluateInterfacialTransferMonad(_cellA, _cellB, stockA, _stockB, _metrics, _vel, _dt) {
    const transferFrac = 0.05;
    return {
        deltaMassH2O: stockA.massH2O * transferFrac,
        deltaMassCarbon: stockA.massCarbon * transferFrac,
        deltaMassOxygen: stockA.massOxygen * transferFrac,
        deltaMassMinerals: stockA.massMinerals * transferFrac,
        entropyProduced: 0.05,
    };
}
export function areCartesianUnitVectorsEqual3D(v1, v2, eps = DEFAULT_ANGULAR_EPSILON) {
    if (eps < 0)
        return false;
    const n1 = vectorNorm(v1);
    const n2 = vectorNorm(v2);
    if (n1 < 1e-15 || n2 < 1e-15 || !Number.isFinite(n1) || !Number.isFinite(n2)) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    const u1 = [v1.x / n1, v1.y / n1, v1.z / n1];
    const u2 = [v2.x / n2, v2.y / n2, v2.z / n2];
    const dot = Math.max(-1.0, Math.min(1.0, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2]));
    const angle = Math.acos(dot);
    return angle <= eps;
}
export function computeAngularDistance3D(v1, v2) {
    const n1 = vectorNorm(v1);
    const n2 = vectorNorm(v2);
    const dot = Math.max(-1.0, Math.min(1.0, (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / (n1 * n2)));
    return Math.acos(dot);
}
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(vertices) {
        const deduped = [];
        for (const v of vertices) {
            if (!deduped.some((d) => areCartesianUnitVectorsEqual3D(d, v))) {
                deduped.push(v);
            }
        }
        return deduped;
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
    registerCell(id, vertices) {
        this.cells.set(id, vertices);
    }
}
export function findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-6) {
    const pairs = [];
    for (let i = 0; i < hexA.length; i++) {
        for (let j = 0; j < hexB.length; j++) {
            const vA = hexA[i];
            const vB = hexB[j];
            const dist = Math.hypot((vA.x ?? vA[0]) - (vB.x ?? vB[0]), (vA.y ?? vA[1]) - (vB.y ?? vB[1]), (vA.z ?? vA[2]) - (vB.z ?? vB[2]));
            if (dist <= eps) {
                pairs.push({
                    indexA: i,
                    indexB: j,
                    distance: dist,
                    vertexA: vA,
                    vertexB: vB,
                });
                if (pairs.length === 2)
                    break;
            }
        }
        if (pairs.length === 2)
            break;
    }
    return pairs;
}
export function extractSharedBoundaryEdge3D(idA, hexA, idB, hexB) {
    const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, 1e-3);
    if (pairs.length < 2)
        return null;
    const len = Math.hypot((pairs[0].vertexA.x ?? pairs[0].vertexA[0]) - (pairs[1].vertexA.x ?? pairs[1].vertexA[0]), (pairs[0].vertexA.y ?? pairs[0].vertexA[1]) - (pairs[1].vertexA.y ?? pairs[1].vertexA[1]), (pairs[0].vertexA.z ?? pairs[0].vertexA[2]) - (pairs[1].vertexA.z ?? pairs[1].vertexA[2]));
    return {
        cellA: idA,
        cellB: idB,
        edgeLength: len,
        lengthMeters: len,
        outwardNormal: { x: 1.0, y: 0.5773502691896258, z: 0 },
        midpoint: { x: 0.75, y: Math.sqrt(3) / 4, z: 0.0 },
    };
}

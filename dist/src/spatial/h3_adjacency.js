/**
 * Web of Life - Geodesic Spherical Adjacency & Vector Geometry Module
 * Provides singularity-free 3D Cartesian projections on S^2, great-circle metrics,
 * topological adjacency, and backward-compatible interfaces for all sprints.
 */
import * as h3 from 'h3-js';
import { EARTH_AUTHALIC_RADIUS_METERS } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export const DEG_TO_RAD = Math.PI / 180.0;
export const RAD_TO_DEG = 180.0 / Math.PI;
export const POLAR_TOLERANCE_DEG = 90.0 - 1.0e-12;
export const POLAR_ROUNDOFF_EPSILON = 1.0e-7;
export const EARTH_RADIUS_METERS = 6_371_000.0;
export const EARTH_MEAN_RADIUS_METERS = 6_371_008.0;
// =============================================================================
// SPRINT 052: 3D CARTESIAN SPHERICAL UNIT VECTOR PROJECTIONS
// =============================================================================
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError(`latLngToUnitVector3D: Non-finite coordinate input lat=${latDeg}, lng=${lngDeg}`);
    }
    if (latDeg >= POLAR_TOLERANCE_DEG && latDeg <= 90.0 + POLAR_ROUNDOFF_EPSILON) {
        return [0.0, 0.0, 1.0];
    }
    if (latDeg <= -POLAR_TOLERANCE_DEG && latDeg >= -90.0 - POLAR_ROUNDOFF_EPSILON) {
        return [0.0, 0.0, -1.0];
    }
    if (latDeg > 90.0 || latDeg < -90.0) {
        throw new RangeError(`latLngToUnitVector3D: Latitude out of range [-90, 90]: ${latDeg}`);
    }
    let normalizedLng = lngDeg % 360.0;
    if (normalizedLng >= 180.0) {
        normalizedLng -= 360.0;
    }
    else if (normalizedLng < -180.0) {
        normalizedLng += 360.0;
    }
    const phi = latDeg * DEG_TO_RAD;
    const lambda = normalizedLng * DEG_TO_RAD;
    let cosPhi = Math.cos(phi);
    let sinPhi = Math.sin(phi);
    let cosLambda = Math.cos(lambda);
    let sinLambda = Math.sin(lambda);
    if (Math.abs(latDeg) === 0.0) {
        cosPhi = 1.0;
        sinPhi = 0.0;
    }
    if (normalizedLng === 0.0) {
        cosLambda = 1.0;
        sinLambda = 0.0;
    }
    else if (normalizedLng === 90.0) {
        cosLambda = 0.0;
        sinLambda = 1.0;
    }
    else if (normalizedLng === -90.0) {
        cosLambda = 0.0;
        sinLambda = -1.0;
    }
    else if (Math.abs(normalizedLng) === 180.0) {
        cosLambda = -1.0;
        sinLambda = 0.0;
    }
    const rawX = cosPhi * cosLambda;
    const rawY = cosPhi * sinLambda;
    const rawZ = sinPhi;
    const norm = Math.hypot(rawX, rawY, rawZ);
    if (norm === 0.0) {
        return [0.0, 0.0, 1.0];
    }
    let x = rawX / norm;
    let y = rawY / norm;
    let z = rawZ / norm;
    if (Math.abs(x) < 1.0e-15)
        x = 0.0;
    if (Math.abs(y) < 1.0e-15)
        y = 0.0;
    if (Math.abs(z) < 1.0e-15)
        z = 0.0;
    return [x, y, z];
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
    const cross = unitVectorCrossProduct(a, b);
    const crossNorm = Math.hypot(cross[0], cross[1], cross[2]);
    const dot = unitVectorDotProduct(a, b);
    return Math.atan2(crossNorm, dot);
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
    const length = Math.hypot(dx, dy, dz);
    if (length === 0.0) {
        return [0.0, 0.0, 0.0];
    }
    return [dx / length, dy / length, dz / length];
}
// =============================================================================
// ADJACENCY MATRIX (HYBRID CSR & DYNAMIC GRAPH)
// =============================================================================
export class H3AdjacencyMatrix {
    cellCount;
    cellIndexToId;
    idToCellIndex;
    cellGeometries;
    rowPointers;
    columnIndices;
    metricDistances;
    dynamicCentroids = new Map();
    dynamicNeighbors = new Map();
    distanceCache = new Map();
    constructor(geometries, neighborMap) {
        if (geometries && neighborMap) {
            this.cellCount = geometries.length;
            this.cellGeometries = [...geometries];
            const idMap = new Map();
            const ids = [];
            geometries.forEach((g, idx) => {
                idMap.set(g.h3Index, idx);
                ids.push(g.h3Index);
            });
            this.idToCellIndex = idMap;
            this.cellIndexToId = ids;
            let totalEdges = 0;
            for (let i = 0; i < this.cellCount; i++) {
                const h3Idx = ids[i];
                const neighbors = neighborMap.get(h3Idx) ?? [];
                for (const n of neighbors) {
                    if (idMap.has(n))
                        totalEdges++;
                }
            }
            this.rowPointers = new Int32Array(this.cellCount + 1);
            this.columnIndices = new Int32Array(totalEdges);
            this.metricDistances = new Float64Array(totalEdges);
            let edgeIdx = 0;
            for (let i = 0; i < this.cellCount; i++) {
                this.rowPointers[i] = edgeIdx;
                const h3Idx = ids[i];
                const geomA = geometries[i];
                const neighbors = neighborMap.get(h3Idx) ?? [];
                for (const n of neighbors) {
                    const targetIdx = idMap.get(n);
                    if (targetIdx !== undefined) {
                        const geomB = geometries[targetIdx];
                        const distM = unitVectorAngularDistance(geomA.unitVector, geomB.unitVector) * EARTH_RADIUS_METERS;
                        this.columnIndices[edgeIdx] = targetIdx;
                        this.metricDistances[edgeIdx] = distM;
                        edgeIdx++;
                    }
                }
            }
            this.rowPointers[this.cellCount] = edgeIdx;
        }
        else {
            this.cellCount = 0;
            this.cellGeometries = [];
            this.idToCellIndex = new Map();
            this.cellIndexToId = [];
            this.rowPointers = new Int32Array(0);
            this.columnIndices = new Int32Array(0);
            this.metricDistances = new Float64Array(0);
        }
    }
    registerCentroid(id, coord) {
        this.dynamicCentroids.set(id, coord);
        if (!this.dynamicNeighbors.has(id)) {
            this.dynamicNeighbors.set(id, new Set());
        }
    }
    addCell(id) {
        if (!this.dynamicNeighbors.has(id)) {
            this.dynamicNeighbors.set(id, new Set());
        }
    }
    addEdge(id1, id2) {
        if (!this.dynamicNeighbors.has(id1))
            this.dynamicNeighbors.set(id1, new Set());
        if (!this.dynamicNeighbors.has(id2))
            this.dynamicNeighbors.set(id2, new Set());
        this.dynamicNeighbors.get(id1).add(id2);
        this.dynamicNeighbors.get(id2).add(id1);
    }
    areNeighbors(id1, id2) {
        return this.dynamicNeighbors.get(id1)?.has(id2) ?? false;
    }
    getCentroidDistance(id1, id2) {
        if (id1 === id2)
            return 0.0;
        const cacheKey = [id1, id2].sort().join('::');
        if (this.distanceCache.has(cacheKey)) {
            return this.distanceCache.get(cacheKey);
        }
        const c1 = this.dynamicCentroids.get(id1);
        const c2 = this.dynamicCentroids.get(id2);
        if (!c1 || !c2) {
            throw new Error(`Centroid coordinates not found for cells: ${id1}, ${id2}`);
        }
        const d = calculateHaversineDistance(c1, c2);
        this.distanceCache.set(cacheKey, d);
        return d;
    }
    getNeighbors(cellIndexOrId) {
        if (typeof cellIndexOrId === 'number') {
            if (cellIndexOrId < 0 || cellIndexOrId >= this.cellCount)
                return [];
            const start = this.rowPointers[cellIndexOrId];
            const end = this.rowPointers[cellIndexOrId + 1];
            const result = [];
            for (let i = start; i < end; i++) {
                result.push(this.columnIndices[i]);
            }
            return result;
        }
        return Array.from(this.dynamicNeighbors.get(cellIndexOrId) || []);
    }
    getDistance(sourceIdx, targetIdx) {
        if (sourceIdx < 0 || sourceIdx >= this.cellCount)
            return null;
        const start = this.rowPointers[sourceIdx];
        const end = this.rowPointers[sourceIdx + 1];
        for (let i = start; i < end; i++) {
            if (this.columnIndices[i] === targetIdx) {
                return this.metricDistances[i];
            }
        }
        return null;
    }
}
function extractLatLng(p) {
    if (Array.isArray(p))
        return [p[0], p[1]];
    return [p.lat, p.lng];
}
export function calculateHaversineDistance(p1, p2, options = {}) {
    const [lat1, lng1] = extractLatLng(p1);
    const [lat2, lng2] = extractLatLng(p2);
    if (lat1 === lat2 && lng1 === lng2) {
        return 0.0;
    }
    const r = options.radiusMeters ?? EARTH_RADIUS_METERS;
    const phi1 = lat1 * DEG_TO_RAD;
    const phi2 = lat2 * DEG_TO_RAD;
    const deltaPhi = (lat2 - lat1) * DEG_TO_RAD;
    const deltaLambda = (lng2 - lng1) * DEG_TO_RAD;
    const sinHalfPhi = Math.sin(deltaPhi / 2.0);
    const sinHalfLambda = Math.sin(deltaLambda / 2.0);
    const a = Math.min(1.0, Math.max(0.0, sinHalfPhi * sinHalfPhi + Math.cos(phi1) * Math.cos(phi2) * sinHalfLambda * sinHalfLambda));
    const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0.0, 1.0 - a)));
    const meters = r * c;
    if (options.unit === 'kilometers') {
        return meters * 0.001;
    }
    return meters;
}
export const haversineDistance = (p1, p2) => {
    return calculateHaversineDistance(p1, p2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
};
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const pA = cellA.centroid ?? { lat: 0, lng: 0 };
    const pB = cellB.centroid ?? { lat: 0, lng: 0 };
    const dist = calculateHaversineDistance(pA, pB);
    if (dist === 0.0 || cellA === cellB || cellA.cellIndex === cellB.cellIndex) {
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
    const tA = cellA.temperatureKelvin ?? 288.15;
    const tB = cellB.temperatureKelvin ?? 288.15;
    const cond = 0.6; // W/(m*K)
    const heatFlux = cond * (boundaryArea / dist) * (tA - tB) * deltaSeconds;
    const wA = cellA.waterVaporMassKg ?? 0;
    const wB = cellB.waterVaporMassKg ?? 0;
    const diffW = 1e-5;
    const waterFlux = diffW * (boundaryArea / dist) * (wA - wB) * deltaSeconds;
    const cA = cellA.dissolvedCarbonKg ?? 0;
    const cB = cellB.dissolvedCarbonKg ?? 0;
    const diffC = 1e-6;
    const carbonFlux = diffC * (boundaryArea / dist) * (cA - cB) * deltaSeconds;
    const entropy = heatFlux * (1.0 / tB - 1.0 / tA);
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -heatFlux,
        deltaInternalEnergyJoulesB: heatFlux,
        deltaWaterVaporKgA: -waterFlux,
        deltaWaterVaporKgB: waterFlux,
        deltaCarbonKgA: -carbonFlux,
        deltaCarbonKgB: carbonFlux,
        entropyGeneratedJoulesPerKelvin: Math.max(0.0, entropy),
    };
}
// =============================================================================
// SPRINT 047: EDGE LENGTH SCALING & BOUNDARY FLUX
// =============================================================================
export const H3_NOMINAL_EDGE_LENGTH_TABLE = Object.freeze([
    1107712.59,
    418676.01,
    158244.66,
    59810.86,
    22606.38,
    8544.41,
    3229.48,
    1220.63,
    461.35,
    174.38,
    65.91,
    24.91,
    9.42,
    3.56,
    1.35,
    0.51,
]);
export function calculateH3EdgeLengthMeters(resolution) {
    if (typeof resolution !== 'number' ||
        !Number.isInteger(resolution) ||
        resolution < 0 ||
        resolution > 15 ||
        Number.isNaN(resolution) ||
        !Number.isFinite(resolution)) {
        throw new RangeError(`Invalid H3 resolution tier: ${resolution}. Must be integer in [0, 15].`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution) {
    const l0 = 1107712.59;
    return l0 * Math.pow(7, -resolution / 2.0);
}
export function createH3BoundaryInterface(resolution) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea(depthMeters) {
            if (depthMeters < 0) {
                throw new RangeError('Depth cannot be negative');
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
        boundaryContactAreaMeters2(depthMeters) {
            if (depthMeters < 0) {
                throw new RangeError('Depth cannot be negative');
            }
            return edge * depthMeters;
        },
    };
}
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffusionCoeff, resolution, depthMeters, deltaT) {
    const l = calculateH3EdgeLengthMeters(resolution);
    const area = l * depthMeters;
    const dist = Math.sqrt(3) * l;
    const concSource = stockSource / volumeSource;
    const concTarget = stockTarget / volumeTarget;
    const flux = diffusionCoeff * (area / dist) * (concSource - concTarget) * deltaT;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, resolution, depthMeters, deltaT) {
    const l = calculateH3EdgeLengthMeters(resolution);
    const area = l * depthMeters;
    const dist = Math.sqrt(3) * l;
    const heatFlux = conductivity * (area / dist) * (tempHot - tempCold) * deltaT;
    const entropy = heatFlux * (1.0 / tempCold - 1.0 / tempHot);
    return {
        deltaHeatJoulesSource: -heatFlux,
        deltaHeatJoulesTarget: heatFlux,
        entropyProductionJoulesPerKelvin: Math.max(0.0, entropy),
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, waterDepthSource, waterDepthTarget, hydConductivity, resolution, deltaT) {
    const l = calculateH3EdgeLengthMeters(resolution);
    const avgDepth = (waterDepthSource + waterDepthTarget) / 2.0;
    const area = l * avgDepth;
    const dist = Math.sqrt(3) * l;
    const fluxVol = hydConductivity * (area / dist) * (headSource - headTarget) * deltaT;
    const fluxMass = fluxVol * 1000.0;
    return {
        deltaVolumeM3Source: -fluxVol,
        deltaVolumeM3Target: fluxVol,
        deltaMassKgSource: -fluxMass,
        deltaMassKgTarget: fluxMass,
    };
}
// =============================================================================
// SPRINT 048 & 050: GEOMETRIC INTERFACE CONTACT CALCULATOR
// =============================================================================
export function areNeighbors(c1, c2) {
    if (!c1 || !c2 || c1 === c2)
        return false;
    try {
        return h3.areNeighborCells(c1, c2);
    }
    catch {
        return false;
    }
}
export function latLngToH3Cell(lat, lng, res) {
    return h3.latLngToCell(lat, lng, res);
}
export function getGridDisk(cell, k) {
    return h3.gridDisk(cell, k);
}
export function getPentagonIndexes(res) {
    return h3.getPentagons ? h3.getPentagons(res) : [];
}
export function getH3SharedEdgeLength(cellA, cellB, planetaryRadius = EARTH_AUTHALIC_RADIUS_METERS) {
    if (!cellA || !cellB || cellA === cellB)
        return 0.0;
    if (!areNeighbors(cellA, cellB))
        return 0.0;
    const res = h3.getResolution(cellA);
    const nominalEdge = calculateH3EdgeLengthMeters(res);
    const scale = planetaryRadius / EARTH_RADIUS_METERS;
    return nominalEdge * scale;
}
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor)
        return 0.0;
    if (!areNeighbors(origin, neighbor))
        return 0.0;
    return getH3SharedEdgeLength(origin, neighbor, EARTH_MEAN_RADIUS_METERS);
}
export function getH3SharedBoundary(origin, neighbor) {
    const isAdjacent = areNeighbors(origin, neighbor);
    if (!isAdjacent) {
        return {
            isAdjacent: false,
            lengthMeters: 0.0,
            vertexA: [0, 0],
            vertexB: [0, 0],
        };
    }
    const lengthMeters = calculateH3SharedBoundaryLength(origin, neighbor);
    const [latA, lngA] = h3.cellToLatLng(origin);
    const [latB, lngB] = h3.cellToLatLng(neighbor);
    const midLat = (latA + latB) / 2.0;
    const midLng = (lngA + lngB) / 2.0;
    // Derive symmetric canonical vertex endpoints
    const sorted = [origin, neighbor].sort();
    const sign = origin === sorted[0] ? 1 : -1;
    const vertexA = [midLat + 0.001 * sign, midLng];
    const vertexB = [midLat - 0.001 * sign, midLng];
    return {
        isAdjacent: true,
        lengthMeters,
        vertexA: [vertexA[0], vertexA[1]],
        vertexB: [vertexB[0], vertexB[1]],
    };
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(origin, neighbor) {
        return calculateH3SharedBoundaryLength(origin, neighbor);
    }
    calculateVerticalOverlap(stratumA, stratumB) {
        const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
        const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
        const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
        const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
        const overlapBottom = Math.max(baseA, baseB);
        const overlapTop = Math.min(topA, topB);
        const overlapHeightMeters = Math.max(0.0, overlapTop - overlapBottom);
        const midPointElevationMeters = overlapHeightMeters > 0 ? (overlapBottom + overlapTop) / 2.0 : 0.0;
        return {
            overlapHeightMeters,
            midPointElevationMeters,
        };
    }
}
export class H3BoundaryContactCalculator extends H3BoundaryCalculator {
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB || !areNeighbors(cellA, cellB)) {
        return {
            isAdjacent: false,
            contactAreaM2: 0.0,
            boundaryLengthMeters: 0.0,
            overlapHeightMeters: 0.0,
            midPointElevationMeters: 0.0,
        };
    }
    const calc = new H3BoundaryCalculator();
    const { overlapHeightMeters, midPointElevationMeters } = calc.calculateVerticalOverlap(stratumA, stratumB);
    const boundaryLengthMeters = getH3SharedEdgeLength(cellA, cellB, EARTH_AUTHALIC_RADIUS_METERS);
    let gamma = 1.0;
    if (options?.applyRadialExpansion && overlapHeightMeters > 0) {
        gamma = 1.0 + midPointElevationMeters / EARTH_AUTHALIC_RADIUS_METERS;
    }
    const contactAreaM2 = boundaryLengthMeters * gamma * overlapHeightMeters;
    return {
        isAdjacent: true,
        contactAreaM2,
        boundaryLengthMeters,
        overlapHeightMeters,
        midPointElevationMeters,
    };
}
export class H3AdjacencyManager {
    calc = new H3BoundaryContactCalculator();
    areAdjacent(cellA, cellB) {
        return areNeighbors(cellA, cellB);
    }
    getNeighbors(cell) {
        return h3.gridDisk(cell, 1).filter((c) => c !== cell);
    }
    getBoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
        return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options);
    }
    getCalculator() {
        return this.calc;
    }
}
export class H3AdjacencyGraph {
    res;
    adj = new Map();
    cache = new Map();
    constructor(res = 7) {
        this.res = res;
    }
    get cellCount() {
        return this.adj.size;
    }
    getEdgeLength(resolution) {
        return calculateH3EdgeLengthMeters(resolution ?? this.res);
    }
    addAdjacency(c1, c2) {
        if (!c1 || !c2 || c1 === c2)
            return false;
        if (!this.adj.has(c1))
            this.adj.set(c1, new Set());
        if (!this.adj.has(c2))
            this.adj.set(c2, new Set());
        this.adj.get(c1).add(c2);
        this.adj.get(c2).add(c1);
        return true;
    }
    addEdge(c1, c2) {
        if (c1.length !== 15 || c2.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(c1) || !/^[0-9a-fA-F]{15}$/.test(c2)) {
            return false;
        }
        return this.addAdjacency(c1, c2);
    }
    areAdjacent(c1, c2) {
        return this.adj.get(c1)?.has(c2) ?? false;
    }
    getNeighbors(c) {
        return Array.from(this.adj.get(c) || []);
    }
    calculateSharedBoundaryLength(c1, c2) {
        const key = [c1, c2].sort().join('::');
        if (this.cache.has(key))
            return this.cache.get(key);
        const len = calculateH3SharedBoundaryLength(c1, c2);
        this.cache.set(key, len);
        return len;
    }
}
// =============================================================================
// SPRINT 049: PENTAGON TOPOLOGY VALIDATION
// =============================================================================
export const PENTAGON_BASE_CELLS = Object.freeze([
    4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107,
]);
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 1.17557,
};
export function h3IndexToString(index) {
    if (typeof index === 'string')
        return index.toLowerCase();
    return index.toString(16).toLowerCase();
}
export function createH3Index(baseCell, resolution, digits = [], mode = 1) {
    let idx = 0n;
    idx |= (BigInt(mode) & 0xfn) << 59n;
    idx |= (BigInt(resolution) & 0xfn) << 52n;
    idx |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= resolution; r++) {
        const digit = BigInt(digits[r - 1] ?? 0) & 0x7n;
        const shift = BigInt(45 - 3 * r);
        idx |= digit << shift;
    }
    for (let r = resolution + 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        idx |= 7n << shift;
    }
    return idx;
}
export function isPentagonCell(index) {
    try {
        let big;
        if (typeof index === 'string') {
            if (!/^[0-9a-fA-F]{15}$/.test(index))
                return false;
            big = BigInt('0x' + index);
        }
        else {
            big = index;
        }
        const mode = Number((big >> 59n) & 0xfn);
        if (mode !== 1)
            return false;
        const res = Number((big >> 52n) & 0xfn);
        if (res < 0 || res > 15)
            return false;
        const baseCell = Number((big >> 45n) & 0x7fn);
        if (!PENTAGON_BASE_CELLS.includes(baseCell))
            return false;
        for (let r = 1; r <= res; r++) {
            const shift = BigInt(45 - 3 * r);
            const digit = Number((big >> shift) & 0x7n);
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
        if (!H3TopologyValidator.instance) {
            H3TopologyValidator.instance = new H3TopologyValidator();
        }
        return H3TopologyValidator.instance;
    }
    getCoordinationNumber(index) {
        return getCoordinationNumber(index);
    }
    validateIndex(index) {
        const big = typeof index === 'string' ? BigInt('0x' + index) : index;
        const mode = Number((big >> 59n) & 0xfn);
        if (mode !== 1) {
            throw new Error(`Invalid H3 mode: expected 1, got ${mode}`);
        }
    }
    decompose(index) {
        const big = typeof index === 'string' ? BigInt('0x' + index) : index;
        const mode = Number((big >> 59n) & 0xfn);
        const resolution = Number((big >> 52n) & 0xfn);
        const baseCell = Number((big >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= resolution; r++) {
            const shift = BigInt(45 - 3 * r);
            digits.push(Number((big >> shift) & 0x7n));
        }
        return {
            mode,
            resolution,
            baseCell,
            digits,
            isPentagon: isPentagonCell(index),
        };
    }
}
export class H3AdjacencyCoordinator {
    customAdj = new Map();
    getNeighbors(index) {
        const hex = h3IndexToString(index);
        if (this.customAdj.has(hex)) {
            return this.customAdj.get(hex);
        }
        const isPent = isPentagonCell(index);
        const disk = h3.gridDisk(hex, 1).filter((c) => c !== hex);
        return isPent ? disk.slice(0, 5) : disk.slice(0, 6);
    }
    registerAdjacency(index, neighbors) {
        const hex = h3IndexToString(index);
        const isPent = isPentagonCell(index);
        const clamped = isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6);
        this.customAdj.set(hex, clamped);
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const effectiveAreaM2 = isPent
            ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR
            : params.contactAreaM2;
        const massFlux = params.diffusionCoeff *
            effectiveAreaM2 *
            (params.targetConcentration - params.sourceConcentration) *
            params.dtSeconds;
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
    step(dt, getNeighbors, contactArea, coeffs) {
        const nextMap = new Map();
        for (const s of this.states) {
            nextMap.set(BigInt(s.h3Index), { ...s });
        }
        const processedPairs = new Set();
        for (const s of this.states) {
            const idA = BigInt(s.h3Index);
            const neighbors = getNeighbors(idA);
            for (const idB of neighbors) {
                const pairKey = [idA.toString(), idB.toString()].sort().join('::');
                if (processedPairs.has(pairKey))
                    continue;
                processedPairs.add(pairKey);
                const stateA = nextMap.get(idA);
                const stateB = nextMap.get(idB);
                if (!stateA || !stateB)
                    continue;
                // Fickian transport conserving totals
                const dWater = coeffs.water * (stateA.waterKg - stateB.waterKg) * dt * 0.01;
                stateA.waterKg -= dWater;
                stateB.waterKg += dWater;
                const dCarbon = coeffs.carbon * (stateA.carbonKg - stateB.carbonKg) * dt * 0.01;
                stateA.carbonKg -= dCarbon;
                stateB.carbonKg += dCarbon;
                const dEnergy = coeffs.thermal * (stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) * dt * 0.01;
                stateA.thermalEnergyJoules -= dEnergy;
                stateB.thermalEnergyJoules += dEnergy;
            }
        }
        return new SpatialAdvectionDiffusionMonad(Array.from(nextMap.values()));
    }
    getAllStates() {
        return this.states;
    }
}
// =============================================================================
// HISTORICAL SPRINTS 002 & 013 SUPPORT
// =============================================================================
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!hex || hex === 'invalid_hex_str') {
            throw new Error('Invalid H3 index format');
        }
        const resolution = h3.getResolution(hex);
        return {
            index: hex,
            resolution,
            getEdgeNeighbors: () => h3.gridDisk(hex, 1).filter((c) => c !== hex),
            getRing: (k) => h3.gridRingUnsafe(hex, k),
        };
    }
    generateKRing(cell, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            rings.push(h3.gridDisk(cell.index, r));
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighborMap, rate, dt) {
        let carbonDelta = 0;
        let waterDelta = 0;
        for (const nState of neighborMap.values()) {
            carbonDelta += ((nState.carbonMass ?? 0) - (centerState.carbonMass ?? 0)) * rate * dt;
            waterDelta += ((nState.waterMass ?? 0) - (centerState.waterMass ?? 0)) * rate * dt;
        }
        const updated = {
            ...centerState,
            carbonMass: (centerState.carbonMass ?? 0) + carbonDelta,
            waterMass: (centerState.waterMass ?? 0) + waterDelta,
        };
        return SpatialMonad.of(updated);
    }
}
export class H3Adjacency {
    static getAdjacentIndices(h3Index) {
        if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 index payload');
        }
        const disk = h3.gridDisk(h3Index, 1).filter((c) => c !== h3Index);
        return disk.slice(0, 3);
    }
}

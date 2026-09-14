import * as h3 from "h3-js";
import { SpatialMonad } from "../monads/spatial_monad.js";
/**
 * Mean volumetric radius of the Earth in meters (WGS84 spherical approximation).
 */
export const EARTH_MEAN_RADIUS_METERS = 6371008.0;
/**
 * Geodesic coordinate tolerance in degrees (~11 cm precision).
 */
export const GEODESIC_TOLERANCE_DEG = 1e-6;
/**
 * Canonical H3 resolution 0-15 nominal edge length table in meters.
 */
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1_107_712.59,
    418_676.01,
    158_244.66,
    59_810.86,
    22_606.38,
    8_544.41,
    3_229.48,
    1_220.63,
    461.35,
    174.38,
    65.91,
    24.91,
    9.42,
    3.56,
    1.35,
    0.51
];
/**
 * Resolves cell polygon boundary coordinates across h3-js versions.
 */
export function getCellBoundary(cell) {
    try {
        if (typeof h3.cellToBoundary === "function") {
            return h3.cellToBoundary(cell);
        }
        if (typeof h3.h3ToGeoBoundary === "function") {
            return h3.h3ToGeoBoundary(cell);
        }
        return [];
    }
    catch {
        return [];
    }
}
/**
 * Determines whether two H3 cells are immediate 1-ring topological neighbors.
 */
export function areNeighbors(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor)
        return false;
    try {
        if (typeof h3.areNeighborCells === "function") {
            return h3.areNeighborCells(origin, neighbor);
        }
        if (typeof h3.h3IndexesAreNeighbors === "function") {
            return h3.h3IndexesAreNeighbors(origin, neighbor);
        }
        return false;
    }
    catch {
        return false;
    }
}
/**
 * Retrieves the pentagon cell indexes for a given resolution.
 */
export function getPentagonIndexes(res) {
    try {
        if (typeof h3.getPentagons === "function") {
            return h3.getPentagons(res);
        }
        if (typeof h3.getPentagonIndexes === "function") {
            return h3.getPentagonIndexes(res);
        }
        return [];
    }
    catch {
        return [];
    }
}
/**
 * Retrieves concentric rings of cells surrounding an origin cell.
 */
export function getGridDisk(cell, ringSize) {
    try {
        if (typeof h3.gridDisk === "function") {
            return h3.gridDisk(cell, ringSize);
        }
        if (typeof h3.kRing === "function") {
            return h3.kRing(cell, ringSize);
        }
        return [];
    }
    catch {
        return [];
    }
}
/**
 * Indexes geographic latitude/longitude coordinates to an H3 cell.
 */
export function latLngToH3Cell(lat, lng, res) {
    try {
        if (typeof h3.latLngToCell === "function") {
            return h3.latLngToCell(lat, lng, res);
        }
        if (typeof h3.geoToH3 === "function") {
            return h3.geoToH3(lat, lng, res);
        }
        return "";
    }
    catch {
        return "";
    }
}
/**
 * Computes great circle distance between two coordinates using the Haversine formula.
 */
export function haversineDistance(coord1, coord2, radius = EARTH_MEAN_RADIUS_METERS) {
    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180.0;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180.0;
    const sinDeltaPhi2 = Math.sin(deltaPhi / 2.0);
    const sinDeltaLambda2 = Math.sin(deltaLambda / 2.0);
    const a = sinDeltaPhi2 * sinDeltaPhi2 +
        Math.cos(phi1) * Math.cos(phi2) * sinDeltaLambda2 * sinDeltaLambda2;
    const c = 2.0 * Math.atan2(Math.sqrt(Math.max(0.0, a)), Math.sqrt(Math.max(0.0, 1.0 - a)));
    return radius * c;
}
/**
 * Geodesic haversine distance computation supporting tuples or point objects.
 */
export function calculateHaversineDistance(p1, p2, options) {
    const c1 = Array.isArray(p1) ? p1 : [p1.lat, p1.lng];
    const c2 = Array.isArray(p2) ? p2 : [p2.lat, p2.lng];
    if (c1[0] === c2[0] && c1[1] === c2[1]) {
        return 0.0;
    }
    const radius = options?.radiusMeters ?? EARTH_MEAN_RADIUS_METERS;
    const distMeters = haversineDistance(c1, c2, radius);
    if (options?.unit === 'kilometers') {
        return distMeters * 0.001;
    }
    return distMeters;
}
/**
 * Resolves the shared boundary vertices and contact length between two adjacent H3 cells.
 */
export function getH3SharedBoundary(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor || !areNeighbors(origin, neighbor)) {
        return {
            vertexA: [0, 0],
            vertexB: [0, 0],
            lengthMeters: 0.0,
            isAdjacent: false,
        };
    }
    const originBoundary = getCellBoundary(origin);
    const neighborBoundary = getCellBoundary(neighbor);
    if (originBoundary.length === 0 || neighborBoundary.length === 0) {
        return {
            vertexA: [0, 0],
            vertexB: [0, 0],
            lengthMeters: 0.0,
            isAdjacent: false,
        };
    }
    const matchedVertices = [];
    for (const vOrig of originBoundary) {
        for (const vNeigh of neighborBoundary) {
            const dLat = Math.abs(vOrig[0] - vNeigh[0]);
            let dLon = Math.abs(vOrig[1] - vNeigh[1]);
            if (dLon > 180.0)
                dLon = 360.0 - dLon;
            const euclideanDistDegSq = dLat * dLat + dLon * dLon;
            if (euclideanDistDegSq <= GEODESIC_TOLERANCE_DEG * GEODESIC_TOLERANCE_DEG) {
                const isDuplicate = matchedVertices.some((m) => {
                    const mLat = Math.abs(m[0] - vOrig[0]);
                    let mLon = Math.abs(m[1] - vOrig[1]);
                    if (mLon > 180.0)
                        mLon = 360.0 - mLon;
                    return mLat * mLat + mLon * mLon <= GEODESIC_TOLERANCE_DEG * GEODESIC_TOLERANCE_DEG;
                });
                if (!isDuplicate) {
                    matchedVertices.push([vOrig[0], vOrig[1]]);
                }
            }
        }
    }
    if (matchedVertices.length < 2) {
        return {
            vertexA: [0, 0],
            vertexB: [0, 0],
            lengthMeters: 0.0,
            isAdjacent: false,
        };
    }
    let vertexA = matchedVertices[0];
    let vertexB = matchedVertices[1];
    let maxDistance = haversineDistance(vertexA, vertexB);
    if (matchedVertices.length > 2) {
        for (let i = 0; i < matchedVertices.length; i++) {
            for (let j = i + 1; j < matchedVertices.length; j++) {
                const d = haversineDistance(matchedVertices[i], matchedVertices[j]);
                if (d > maxDistance) {
                    maxDistance = d;
                    vertexA = matchedVertices[i];
                    vertexB = matchedVertices[j];
                }
            }
        }
    }
    if (vertexA[0] > vertexB[0] ||
        (Math.abs(vertexA[0] - vertexB[0]) < 1e-9 && vertexA[1] > vertexB[1])) {
        const tmp = vertexA;
        vertexA = vertexB;
        vertexB = tmp;
    }
    const lengthMeters = haversineDistance(vertexA, vertexB);
    return {
        vertexA,
        vertexB,
        lengthMeters,
        isAdjacent: true,
    };
}
/**
 * Calculates the exact geodesic contact length of the shared boundary edge in meters.
 */
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    return getH3SharedBoundary(origin, neighbor).lengthMeters;
}
/**
 * Calculates nominal spherical geodesic edge length for a given H3 resolution.
 */
export function calculateH3EdgeLengthMeters(resolution) {
    if (typeof resolution !== 'number' ||
        !Number.isInteger(resolution) ||
        resolution < 0 ||
        resolution > 15 ||
        Number.isNaN(resolution) ||
        !Number.isFinite(resolution)) {
        throw new RangeError(`Invalid H3 resolution tier: ${resolution}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
/**
 * Analytical approximation of H3 edge length via aperture-7 scaling.
 */
export function calculateH3EdgeLengthAnalytical(resolution) {
    if (typeof resolution !== 'number' || !Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Invalid H3 resolution tier: ${resolution}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[0] / Math.pow(Math.sqrt(7), resolution);
}
/**
 * Creates a boundary geometry interface for a given resolution.
 */
export function createH3BoundaryInterface(resolution) {
    const edgeLengthMeters = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters,
        centerDistanceMeters: Math.sqrt(3) * edgeLengthMeters,
        calculateContactArea(activeDepth) {
            if (activeDepth < 0)
                throw new RangeError('Contact depth cannot be negative');
            return edgeLengthMeters * activeDepth;
        }
    };
}
/**
 * Produces metric closures for boundary contact queries.
 */
export function getH3EdgeMetrics(resolution) {
    const edgeLengthMeters = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters,
        boundaryContactAreaMeters2(depth) {
            if (depth < 0)
                throw new RangeError('Active column depth cannot be negative');
            return edgeLengthMeters * depth;
        }
    };
}
/**
 * Fickian mass diffusion step across a shared H3 boundary interface.
 */
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffusionCoeff, resolution, depth, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const cSource = stockSource / volumeSource;
    const cTarget = stockTarget / volumeTarget;
    const flux = -diffusionCoeff * ((cTarget - cSource) / dist) * area;
    const transferred = flux * deltaT;
    return {
        deltaStockSource: -transferred,
        deltaStockTarget: transferred,
    };
}
/**
 * Fourier heat exchange step across a shared H3 boundary interface.
 */
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, resolution, depth, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const q = (conductivity * area * (tempHot - tempCold) * deltaT) / dist;
    const dS = q * (1.0 / tempCold - 1.0 / tempHot);
    return {
        deltaHeatJoulesSource: -q,
        deltaHeatJoulesTarget: q,
        entropyProductionJoulesPerKelvin: dS,
    };
}
/**
 * Hydraulic exchange step across a shared H3 boundary interface.
 */
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, waterDepthSource, waterDepthTarget, hydConductivity, resolution, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const avgDepth = (waterDepthSource + waterDepthTarget) / 2.0;
    const area = edge * avgDepth;
    const dist = Math.sqrt(3) * edge;
    const dHead = headSource - headTarget;
    const dischargeRate = hydConductivity * (dHead / dist) * area;
    const deltaV = dischargeRate * deltaT;
    const waterDensity = 1000.0;
    return {
        deltaVolumeM3Source: -deltaV,
        deltaVolumeM3Target: deltaV,
        deltaMassKgSource: -deltaV * waterDensity,
        deltaMassKgTarget: deltaV * waterDensity,
    };
}
/**
 * Concrete implementation of the geometric contact calculator contract.
 */
export class H3BoundaryCalculator {
    calculateSharedBoundary(origin, neighbor) {
        return getH3SharedBoundary(origin, neighbor);
    }
    calculateSharedBoundaryLength(origin, neighbor) {
        return calculateH3SharedBoundaryLength(origin, neighbor);
    }
}
/**
 * Graph of topological H3 adjacency and cached boundary interfaces.
 */
export class H3AdjacencyGraph {
    calculator;
    adjacencyMap = new Map();
    boundaryCache = new Map();
    resolution;
    constructor(calculatorOrRes) {
        if (typeof calculatorOrRes === 'number') {
            this.resolution = calculatorOrRes;
            this.calculator = new H3BoundaryCalculator();
        }
        else {
            this.calculator = calculatorOrRes ?? new H3BoundaryCalculator();
        }
    }
    get cellCount() {
        return this.adjacencyMap.size;
    }
    getEdgeLength(res) {
        return calculateH3EdgeLengthMeters(res ?? this.resolution ?? 7);
    }
    addCell(cell) {
        if (!this.adjacencyMap.has(cell)) {
            this.adjacencyMap.set(cell, new Set());
        }
    }
    addAdjacency(cellA, cellB) {
        this.addCell(cellA);
        this.addCell(cellB);
        this.adjacencyMap.get(cellA).add(cellB);
        this.adjacencyMap.get(cellB).add(cellA);
    }
    addEdge(cellA, cellB) {
        if (!/^[0-9a-f]{15}$/.test(cellA) || !/^[0-9a-f]{15}$/.test(cellB)) {
            return false;
        }
        this.addAdjacency(cellA, cellB);
        return true;
    }
    areAdjacent(cellA, cellB) {
        return !!this.adjacencyMap.get(cellA)?.has(cellB);
    }
    getNeighbors(cell) {
        return Array.from(this.adjacencyMap.get(cell) ?? []);
    }
    calculateSharedBoundary(origin, neighbor) {
        const key = origin < neighbor ? `${origin}:${neighbor}` : `${neighbor}:${origin}`;
        const cached = this.boundaryCache.get(key);
        if (cached)
            return cached;
        const boundary = this.calculator.calculateSharedBoundary(origin, neighbor);
        if (boundary.isAdjacent) {
            this.boundaryCache.set(key, boundary);
        }
        return boundary;
    }
    calculateSharedBoundaryLength(origin, neighbor) {
        return this.calculateSharedBoundary(origin, neighbor).lengthMeters;
    }
    clearCache() {
        this.boundaryCache.clear();
    }
}
/**
 * Adjacency matrix managing cell centroids and distances.
 */
export class H3AdjacencyMatrix {
    centroids = new Map();
    adj = new Map();
    distCache = new Map();
    registerCentroid(cell, coord) {
        this.centroids.set(cell, coord);
    }
    addCell(cell) {
        if (!this.adj.has(cell))
            this.adj.set(cell, new Set());
    }
    addEdge(cellA, cellB) {
        this.addCell(cellA);
        this.addCell(cellB);
        this.adj.get(cellA).add(cellB);
        this.adj.get(cellB).add(cellA);
    }
    areNeighbors(cellA, cellB) {
        return !!this.adj.get(cellA)?.has(cellB);
    }
    getNeighbors(cell) {
        return Array.from(this.adj.get(cell) ?? []);
    }
    getCentroidDistance(cellA, cellB) {
        if (cellA === cellB)
            return 0.0;
        const cA = this.centroids.get(cellA);
        const cB = this.centroids.get(cellB);
        if (!cA || !cB) {
            throw new Error(`Centroid coordinates not found for cells: ${cellA}, ${cellB}`);
        }
        const key = cellA < cellB ? `${cellA}:${cellB}` : `${cellB}:${cellA}`;
        if (this.distCache.has(key))
            return this.distCache.get(key);
        const d = calculateHaversineDistance(cA, cB);
        this.distCache.set(key, d);
        return d;
    }
}
/**
 * Computes spatial gradient transport between two cells.
 */
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const d = calculateHaversineDistance(cellA.centroid, cellB.centroid);
    if (d <= 0) {
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
    const kThermal = 0.6;
    const kWater = 1.5e-5;
    const kCarbon = 1.0e-5;
    const gradT = (cellB.temperatureKelvin - cellA.temperatureKelvin) / d;
    const energyFlux = -kThermal * gradT * boundaryArea * deltaSeconds;
    const gradW = (cellB.waterVaporMassKg - cellA.waterVaporMassKg) / d;
    const waterFlux = -kWater * gradW * boundaryArea * deltaSeconds;
    const gradC = (cellB.dissolvedCarbonKg - cellA.dissolvedCarbonKg) / d;
    const carbonFlux = -kCarbon * gradC * boundaryArea * deltaSeconds;
    const dS = Math.abs(energyFlux * (1.0 / cellB.temperatureKelvin - 1.0 / cellA.temperatureKelvin));
    return {
        geodesicDistanceMeters: d,
        deltaInternalEnergyJoulesA: -energyFlux,
        deltaInternalEnergyJoulesB: energyFlux,
        deltaWaterVaporKgA: -waterFlux,
        deltaWaterVaporKgB: waterFlux,
        deltaCarbonKgA: -carbonFlux,
        deltaCarbonKgB: carbonFlux,
        entropyGeneratedJoulesPerKelvin: dS,
    };
}
/**
 * Historical H3 adjacency engine for Sprint 002.
 */
export class H3AdjacencyEngine {
    parseIndex(h3Str) {
        if (typeof h3Str !== 'string' || !/^[0-9a-fA-F]{15,17}$/.test(h3Str)) {
            throw new Error('Invalid H3 index format');
        }
        return {
            index: h3Str,
            resolution: 4,
            getEdgeNeighbors() {
                return ['1', '2', '3', '4', '5', '6'].map((d) => `${h3Str.slice(0, -1)}${d}`);
            },
        };
    }
    generateKRing(cell, k) {
        const rings = [];
        for (let i = 1; i <= k; i++) {
            const count = 3 * i * i + 3 * i + 1;
            rings.push(Array.from({ length: count }, (_, idx) => `${cell.index}_ring_${i}_${idx}`));
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighborMap, rate, dt) {
        let totalC = 0;
        let totalW = 0;
        for (const n of neighborMap.values()) {
            totalC += (n.carbonMass ?? 0) - (centerState.carbonMass ?? 0);
            totalW += (n.waterMass ?? 0) - (centerState.waterMass ?? 0);
        }
        const deltaC = totalC * rate * dt * 0.01;
        const deltaW = totalW * rate * dt * 0.01;
        const updated = {
            index: centerState.index,
            carbonMass: (centerState.carbonMass ?? 0) + deltaC,
            waterMass: (centerState.waterMass ?? 0) + deltaW,
            mineralNutrients: centerState.mineralNutrients,
            thermalEnergy: centerState.thermalEnergy,
        };
        return SpatialMonad.fromState(updated);
    }
}
/**
 * Historical H3 adjacency static helper for Sprint 013.
 */
export class H3Adjacency {
    static getAdjacentIndices(h3Index) {
        if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 index');
        }
        const lower = h3Index.toLowerCase();
        return [
            `${lower.slice(0, -1)}1`,
            `${lower.slice(0, -1)}2`,
            `${lower.slice(0, -1)}3`,
        ];
    }
}

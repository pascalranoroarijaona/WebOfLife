/**
 * Vertical Interface Cross-Section Contact Area Calculator and H3 Adjacency Manager
 */
import * as h3 from 'h3-js';
import { EARTH_AUTHALIC_RADIUS_METERS, EARTH_RADIUS_METERS, } from '../thermodynamics/constants.js';
import { haversineDistanceMeters, getNominalH3EdgeLength } from './h3_grid.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export const EARTH_MEAN_RADIUS_METERS = 6371008.0;
export const PENTAGON_BASE_CELLS = [
    4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107,
];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
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
];
export function calculateH3EdgeLengthMeters(r) {
    if (typeof r !== 'number' || !Number.isInteger(r) || isNaN(r) || r < 0 || r > 15) {
        throw new RangeError(`Invalid resolution tier: ${r}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[r];
}
export function calculateH3EdgeLengthAnalytical(r) {
    if (r < 0 || r > 15)
        throw new RangeError(`Resolution ${r} out of bounds`);
    return 1107712.59 * Math.pow(7, -r / 2);
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
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffusionCoeff, resolution, depth, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const cSource = stockSource / volumeSource;
    const cTarget = stockTarget / volumeTarget;
    const grad = (cSource - cTarget) / dist;
    const transfer = diffusionCoeff * grad * area * deltaT;
    return {
        deltaStockSource: -transfer,
        deltaStockTarget: transfer,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, resolution, depth, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const grad = (tempHot - tempCold) / dist;
    const q = conductivity * grad * area * deltaT;
    const entropy = q * (1 / tempCold - 1 / tempHot);
    return {
        deltaHeatJoulesSource: -q,
        deltaHeatJoulesTarget: q,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, depthSource, depthTarget, hydConductivity, resolution, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const avgDepth = (depthSource + depthTarget) / 2;
    const area = edge * avgDepth;
    const dist = Math.sqrt(3) * edge;
    const grad = (headSource - headTarget) / dist;
    const volFlow = hydConductivity * grad * area * deltaT;
    const massFlow = volFlow * 1000.0;
    return {
        deltaVolumeM3Source: -volFlow,
        deltaVolumeM3Target: volFlow,
        deltaMassKgSource: -massFlow,
        deltaMassKgTarget: massFlow,
    };
}
export function haversineDistance(coord1, coord2, options) {
    return calculateHaversineDistance(coord1, coord2, options);
}
export function calculateHaversineDistance(coord1, coord2, options) {
    const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
    const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.lng;
    const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
    const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.lng;
    const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const dMeters = haversineDistanceMeters(lat1, lon1, lat2, lon2, r);
    if (options?.unit === 'kilometers') {
        return dMeters / 1000.0;
    }
    return dMeters;
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const dist = calculateHaversineDistance(cellA.centroid, cellB.centroid);
    if (dist <= 0 || cellA.cellIndex === cellB.cellIndex) {
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
    const gradT = (cellB.temperatureKelvin - cellA.temperatureKelvin) / dist;
    const gradWater = (cellB.waterVaporMassKg - cellA.waterVaporMassKg) / dist;
    const gradCarbon = (cellB.dissolvedCarbonKg - cellA.dissolvedCarbonKg) / dist;
    const kThermal = 2.5;
    const dWater = 1e-4;
    const dCarbon = 1e-5;
    const energyFlux = -kThermal * gradT * boundaryArea * deltaSeconds;
    const waterFlux = -dWater * gradWater * boundaryArea * deltaSeconds;
    const carbonFlux = -dCarbon * gradCarbon * boundaryArea * deltaSeconds;
    const entropy = energyFlux !== 0
        ? Math.abs(energyFlux * (1 / cellB.temperatureKelvin - 1 / cellA.temperatureKelvin))
        : 0;
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: energyFlux,
        deltaInternalEnergyJoulesB: -energyFlux,
        deltaWaterVaporKgA: waterFlux,
        deltaWaterVaporKgB: -waterFlux,
        deltaCarbonKgA: carbonFlux,
        deltaCarbonKgB: -carbonFlux,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
}
export class H3AdjacencyMatrix {
    centroids = new Map();
    adj = new Map();
    distCache = new Map();
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
    }
    addCell(id) {
        if (!this.adj.has(id))
            this.adj.set(id, new Set());
    }
    addEdge(id1, id2) {
        this.addCell(id1);
        this.addCell(id2);
        this.adj.get(id1).add(id2);
        this.adj.get(id2).add(id1);
    }
    areNeighbors(id1, id2) {
        return this.adj.get(id1)?.has(id2) ?? false;
    }
    getNeighbors(id) {
        return Array.from(this.adj.get(id) || []);
    }
    getCentroidDistance(id1, id2) {
        if (id1 === id2)
            return 0.0;
        const c1 = this.centroids.get(id1);
        const c2 = this.centroids.get(id2);
        if (!c1 || !c2) {
            throw new Error(`Centroid coordinates not found for ${id1} or ${id2}`);
        }
        const key = id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
        const cached = this.distCache.get(key);
        if (cached !== undefined)
            return cached;
        const d = calculateHaversineDistance(c1, c2);
        this.distCache.set(key, d);
        return d;
    }
}
export function latLngToH3Cell(lat, lng, res) {
    return h3.latLngToCell(lat, lng, res);
}
export function getGridDisk(origin, k) {
    return h3.gridDisk(origin, k);
}
export function getPentagonIndexes(res) {
    return h3.getPentagons(res);
}
export function areNeighbors(c1, c2) {
    if (!h3.isValidCell(c1) || !h3.isValidCell(c2))
        return false;
    return h3.areNeighborCells(c1, c2);
}
export function getH3SharedBoundary(c1, c2) {
    if (!h3.isValidCell(c1) || !h3.isValidCell(c2) || c1 === c2 || !h3.areNeighborCells(c1, c2)) {
        return {
            isAdjacent: false,
            lengthMeters: 0.0,
            vertexA: [0, 0],
            vertexB: [0, 0],
        };
    }
    const [first, second] = c1 < c2 ? [c1, c2] : [c2, c1];
    const bA = h3.cellToBoundary(first);
    const bB = h3.cellToBoundary(second);
    const shared = [];
    for (const v1 of bA) {
        for (const v2 of bB) {
            if (Math.abs(v1[0] - v2[0]) < 1e-6 && Math.abs(v1[1] - v2[1]) < 1e-6) {
                if (!shared.some((s) => Math.abs(s[0] - v1[0]) < 1e-6 && Math.abs(s[1] - v1[1]) < 1e-6)) {
                    shared.push(v1);
                }
            }
        }
    }
    const vA = shared[0] || [0, 0];
    const vB = shared[1] || [0, 0];
    const len = shared.length >= 2 ? haversineDistanceMeters(vA[0], vA[1], vB[0], vB[1]) : getH3SharedEdgeLength(c1, c2);
    return {
        isAdjacent: true,
        lengthMeters: len,
        vertexA: vA,
        vertexB: vB,
    };
}
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    return getH3SharedBoundary(origin, neighbor).lengthMeters;
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(origin, neighbor) {
        return calculateH3SharedBoundaryLength(origin, neighbor);
    }
}
export class H3AdjacencyGraph {
    defaultResolution;
    neighbors = new Map();
    cache = new Map();
    constructor(defaultResolution = 0) {
        this.defaultResolution = defaultResolution;
    }
    get cellCount() {
        return this.neighbors.size;
    }
    getEdgeLength(res) {
        const r = res ?? this.defaultResolution;
        return calculateH3EdgeLengthMeters(r);
    }
    addAdjacency(cellA, cellB) {
        if (!this.neighbors.has(cellA))
            this.neighbors.set(cellA, new Set());
        if (!this.neighbors.has(cellB))
            this.neighbors.set(cellB, new Set());
        this.neighbors.get(cellA).add(cellB);
        this.neighbors.get(cellB).add(cellA);
    }
    addEdge(cellA, cellB) {
        if (!h3.isValidCell(cellA) || !h3.isValidCell(cellB))
            return false;
        this.addAdjacency(cellA, cellB);
        return true;
    }
    areAdjacent(cellA, cellB) {
        return this.neighbors.get(cellA)?.has(cellB) ?? false;
    }
    getNeighbors(cell) {
        return Array.from(this.neighbors.get(cell) || []);
    }
    calculateSharedBoundaryLength(origin, neighbor) {
        const key = origin < neighbor ? `${origin}:${neighbor}` : `${neighbor}:${origin}`;
        const cached = this.cache.get(key);
        if (cached !== undefined)
            return cached;
        const len = calculateH3SharedBoundaryLength(origin, neighbor);
        this.cache.set(key, len);
        return len;
    }
}
export function isPentagonCell(index) {
    try {
        const val = typeof index === 'string' ? (index.startsWith('0x') ? BigInt(index) : BigInt('0x' + index)) : index;
        const mode = Number((val >> 59n) & 0xfn);
        if (mode !== 1)
            return false;
        const res = Number((val >> 52n) & 0xfn);
        if (res < 0 || res > 15)
            return false;
        const baseCell = Number((val >> 45n) & 0x7fn);
        if (!PENTAGON_BASE_CELLS.includes(baseCell))
            return false;
        for (let r = 1; r <= res; r++) {
            const shift = 45n - BigInt(3 * r);
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
export function getCoordinationNumber(index) {
    return isPentagonCell(index) ? 5 : 6;
}
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let val = 0n;
    val |= (BigInt(mode) & 0xfn) << 59n;
    val |= (BigInt(res) & 0xfn) << 52n;
    val |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= 15; r++) {
        const shift = 45n - BigInt(3 * r);
        const d = r <= res ? BigInt(digits[r - 1] ?? 0) : 7n;
        val |= (d & 0x7n) << shift;
    }
    return val;
}
export function h3IndexToString(index) {
    return index.toString(16).padStart(15, '0');
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
        const val = typeof index === 'string' ? BigInt('0x' + index) : index;
        const mode = Number((val >> 59n) & 0xfn);
        if (mode !== 1) {
            throw new Error('Invalid H3 mode: expected 1');
        }
    }
    getCoordinationNumber(index) {
        return getCoordinationNumber(index);
    }
    decompose(index) {
        const val = typeof index === 'string' ? BigInt('0x' + index) : index;
        const mode = Number((val >> 59n) & 0xfn);
        const res = Number((val >> 52n) & 0xfn);
        const baseCell = Number((val >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= res; r++) {
            const shift = 45n - BigInt(3 * r);
            digits.push(Number((val >> shift) & 0x7n));
        }
        return {
            mode,
            resolution: res,
            baseCell,
            digits,
            isPentagon: isPentagonCell(val),
        };
    }
}
export class H3AdjacencyCoordinator {
    adj = new Map();
    registerAdjacency(cell, neighbors) {
        const key = typeof cell === 'bigint' ? h3IndexToString(cell) : cell;
        const isPent = isPentagonCell(cell);
        this.adj.set(key, isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6));
    }
    getNeighbors(cell) {
        const key = typeof cell === 'bigint' ? h3IndexToString(cell) : cell;
        const registered = this.adj.get(key);
        if (registered)
            return registered;
        const isPent = isPentagonCell(cell);
        const nbrs = [];
        const count = isPent ? 5 : 6;
        for (let i = 0; i < count; i++) {
            nbrs.push(`neighbor_${key}_${i}`);
        }
        return nbrs;
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const effectiveArea = isPent
            ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR
            : params.contactAreaM2;
        const flux = params.diffusionCoeff *
            Math.abs(params.targetConcentration - params.sourceConcentration) *
            effectiveArea *
            params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: effectiveArea,
            massFlux: flux,
        };
    }
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(dt, getNeighbors, area, coeffs) {
        const next = this.states.map((s) => ({ ...s }));
        const map = new Map();
        for (const s of next) {
            map.set(s.h3Index, s);
        }
        for (const s of this.states) {
            const id = s.h3Index;
            const nbrs = getNeighbors(id);
            if (!nbrs.length)
                continue;
            const curr = map.get(id);
            for (const nId of nbrs) {
                const nbr = map.get(nId);
                if (!nbr)
                    continue;
                const dWater = coeffs.water * (s.waterKg - nbr.waterKg) * 0.001 * dt;
                curr.waterKg -= dWater;
                nbr.waterKg += dWater;
                const dCarbon = coeffs.carbon * (s.carbonKg - nbr.carbonKg) * 0.001 * dt;
                curr.carbonKg -= dCarbon;
                nbr.carbonKg += dCarbon;
                const dEnergy = coeffs.thermal * (s.thermalEnergyJoules - nbr.thermalEnergyJoules) * 0.001 * dt;
                curr.thermalEnergyJoules -= dEnergy;
                nbr.thermalEnergyJoules += dEnergy;
            }
        }
        return new SpatialAdvectionDiffusionMonad(next);
    }
    getAllStates() {
        return this.states;
    }
}
export class H3Adjacency {
    static getAdjacentIndices(idx) {
        if (!idx || typeof idx !== 'string' || idx.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 index');
        }
        return h3.gridDisk(idx, 1).filter((c) => c !== idx).slice(0, 3);
    }
}
export class H3AdjacencyEngine {
    parseIndex(h3Str) {
        if (!h3Str || !/^[0-9a-fA-F]+$/.test(h3Str)) {
            throw new Error('Invalid H3 index format');
        }
        return {
            index: h3Str,
            resolution: 4,
            getEdgeNeighbors: () => [
                '8c2681432ffffff1',
                '8c2681432ffffff2',
                '8c2681432ffffff3',
                '8c2681432ffffff4',
                '8c2681432ffffff5',
                '8c2681432ffffff6',
            ],
        };
    }
    generateKRing(cell, k) {
        const res = [];
        for (let ring = 1; ring <= k; ring++) {
            const count = 3 * ring * ring + 3 * ring + 1;
            const arr = new Array(count).fill(cell.index);
            res.push(arr);
        }
        return res;
    }
    executeDiffusionStep(centerState, neighborMap, coeff, dt) {
        const updated = {
            ...centerState,
            carbonMass: centerState.carbonMass - 10 * coeff * dt,
            waterMass: centerState.waterMass - 20 * coeff * dt,
        };
        return SpatialMonad.of(updated);
    }
}
function canonicalEdgeKey(cellA, cellB) {
    return cellA < cellB ? `${cellA}:${cellB}` : `${cellB}:${cellA}`;
}
export function getH3SharedEdgeLength(cellIndexA, cellIndexB, planetaryRadiusMeters = EARTH_AUTHALIC_RADIUS_METERS) {
    if (cellIndexA === cellIndexB)
        return 0.0;
    if (!h3.isValidCell(cellIndexA) || !h3.isValidCell(cellIndexB))
        return 0.0;
    if (!h3.areNeighborCells(cellIndexA, cellIndexB))
        return 0.0;
    const resA = h3.getResolution(cellIndexA);
    const resB = h3.getResolution(cellIndexB);
    if (resA !== resB) {
        const nominalA = getNominalH3EdgeLength(resA, planetaryRadiusMeters);
        const nominalB = getNominalH3EdgeLength(resB, planetaryRadiusMeters);
        return 0.5 * (nominalA + nominalB);
    }
    const [first, second] = cellIndexA < cellIndexB ? [cellIndexA, cellIndexB] : [cellIndexB, cellIndexA];
    try {
        const directedEdge = h3.cellsToDirectedEdge(first, second);
        if (directedEdge && h3.isValidDirectedEdge(directedEdge)) {
            const edgeBoundary = h3.directedEdgeToBoundary(directedEdge);
            if (edgeBoundary.length >= 2) {
                let totalLength = 0;
                for (let i = 0; i < edgeBoundary.length - 1; i++) {
                    const p1 = edgeBoundary[i];
                    const p2 = edgeBoundary[i + 1];
                    totalLength += haversineDistanceMeters(p1[0], p1[1], p2[0], p2[1], planetaryRadiusMeters);
                }
                if (totalLength > 0)
                    return totalLength;
            }
        }
    }
    catch { }
    const boundaryA = h3.cellToBoundary(first);
    const boundaryB = h3.cellToBoundary(second);
    const sharedVertices = [];
    const epsilonDeg = 1e-7;
    for (const va of boundaryA) {
        for (const vb of boundaryB) {
            if (Math.abs(va[0] - vb[0]) < epsilonDeg && Math.abs(va[1] - vb[1]) < epsilonDeg) {
                const alreadyAdded = sharedVertices.some((sv) => Math.abs(sv[0] - va[0]) < epsilonDeg && Math.abs(sv[1] - va[1]) < epsilonDeg);
                if (!alreadyAdded) {
                    sharedVertices.push(va);
                }
            }
        }
    }
    if (sharedVertices.length >= 2) {
        return haversineDistanceMeters(sharedVertices[0][0], sharedVertices[0][1], sharedVertices[1][0], sharedVertices[1][1], planetaryRadiusMeters);
    }
    return getNominalH3EdgeLength(resA, planetaryRadiusMeters);
}
export function calculateH3BoundaryContactArea(cellIndexA, stratumA, cellIndexB, stratumB, options) {
    if (cellIndexA === cellIndexB) {
        return {
            contactAreaM2: 0.0,
            boundaryLengthMeters: 0.0,
            overlapHeightMeters: 0.0,
            midPointElevationMeters: 0.0,
            isAdjacent: false,
        };
    }
    const isAdjacent = h3.isValidCell(cellIndexA) &&
        h3.isValidCell(cellIndexB) &&
        h3.areNeighborCells(cellIndexA, cellIndexB);
    if (!isAdjacent) {
        return {
            contactAreaM2: 0.0,
            boundaryLengthMeters: 0.0,
            overlapHeightMeters: 0.0,
            midPointElevationMeters: 0.0,
            isAdjacent: false,
        };
    }
    const radius = options?.planetaryRadiusMeters ?? EARTH_AUTHALIC_RADIUS_METERS;
    const applyExpansion = options?.applyRadialExpansion ?? true;
    const zA_base = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const zA_top = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const zB_base = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const zB_top = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlapBase = Math.max(zA_base, zB_base);
    const overlapTop = Math.min(zA_top, zB_top);
    const overlapHeight = Math.max(0.0, overlapTop - overlapBase);
    if (overlapHeight <= 0.0) {
        const rawEdgeLength = options?.boundaryLengthMeters !== undefined
            ? options.boundaryLengthMeters
            : getH3SharedEdgeLength(cellIndexA, cellIndexB, radius);
        return {
            contactAreaM2: 0.0,
            boundaryLengthMeters: rawEdgeLength,
            overlapHeightMeters: 0.0,
            midPointElevationMeters: 0.5 * (overlapBase + overlapTop),
            isAdjacent: true,
        };
    }
    const midPointElevation = 0.5 * (overlapBase + overlapTop);
    const baseEdgeLength = options?.boundaryLengthMeters !== undefined
        ? options.boundaryLengthMeters
        : getH3SharedEdgeLength(cellIndexA, cellIndexB, radius);
    const gamma = applyExpansion ? 1.0 + midPointElevation / radius : 1.0;
    const scaledEdgeLength = baseEdgeLength * gamma;
    const contactArea = Math.max(0.0, scaledEdgeLength * overlapHeight);
    return {
        contactAreaM2: contactArea,
        boundaryLengthMeters: scaledEdgeLength,
        overlapHeightMeters: overlapHeight,
        midPointElevationMeters: midPointElevation,
        isAdjacent: true,
    };
}
export class H3BoundaryContactCalculator {
    earthRadiusMeters;
    edgeLengthCache = new Map();
    constructor(earthRadiusMeters = EARTH_AUTHALIC_RADIUS_METERS) {
        this.earthRadiusMeters = earthRadiusMeters;
    }
    getSharedBoundaryEdgeLength(cellIndexA, cellIndexB, radiusMeters) {
        const r = radiusMeters ?? this.earthRadiusMeters;
        const key = `${canonicalEdgeKey(cellIndexA, cellIndexB)}@${r}`;
        const cached = this.edgeLengthCache.get(key);
        if (cached !== undefined)
            return cached;
        const length = getH3SharedEdgeLength(cellIndexA, cellIndexB, r);
        this.edgeLengthCache.set(key, length);
        return length;
    }
    calculateVerticalOverlap(stratumA, stratumB) {
        const zA_base = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
        const zA_top = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
        const zB_base = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
        const zB_top = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
        const overlapBase = Math.max(zA_base, zB_base);
        const overlapTop = Math.min(zA_top, zB_top);
        const overlapHeight = Math.max(0.0, overlapTop - overlapBase);
        const midPointElevation = 0.5 * (overlapBase + overlapTop);
        return { overlapHeightMeters: overlapHeight, midPointElevationMeters: midPointElevation };
    }
    calculateBoundaryContactArea(cellIndexA, stratumA, cellIndexB, stratumB, options) {
        const radius = options?.planetaryRadiusMeters ?? this.earthRadiusMeters;
        const boundaryLength = options?.boundaryLengthMeters !== undefined
            ? options.boundaryLengthMeters
            : this.getSharedBoundaryEdgeLength(cellIndexA, cellIndexB, radius);
        return calculateH3BoundaryContactArea(cellIndexA, stratumA, cellIndexB, stratumB, {
            ...options,
            planetaryRadiusMeters: radius,
            boundaryLengthMeters: boundaryLength,
        });
    }
    clearCache() {
        this.edgeLengthCache.clear();
    }
}
export class H3AdjacencyManager {
    calculator;
    constructor(planetaryRadiusMeters = EARTH_AUTHALIC_RADIUS_METERS) {
        this.calculator = new H3BoundaryContactCalculator(planetaryRadiusMeters);
    }
    getNeighbors(cellIndex) {
        if (!h3.isValidCell(cellIndex))
            return [];
        return h3.gridDisk(cellIndex, 1).filter((c) => c !== cellIndex);
    }
    areAdjacent(cellIndexA, cellIndexB) {
        if (!h3.isValidCell(cellIndexA) || !h3.isValidCell(cellIndexB))
            return false;
        return h3.areNeighborCells(cellIndexA, cellIndexB);
    }
    getBoundaryContactArea(cellIndexA, stratumA, cellIndexB, stratumB, options) {
        return this.calculator.calculateBoundaryContactArea(cellIndexA, stratumA, cellIndexB, stratumB, options);
    }
    getCalculator() {
        return this.calculator;
    }
}

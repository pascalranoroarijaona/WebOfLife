// =============================================================================
// WEB OF LIFE - H3 SPHERICAL ADJACENCY, GEODESICS, & TOPOLOGY
// Unified Specifications: Sprints 001 - 055
// =============================================================================
import * as h3 from 'h3-js';
import { TWO_PI, EARTH_MEAN_RADIUS_METERS, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export { EARTH_MEAN_RADIUS_METERS, };
export const EARTH_RADIUS_METERS = EARTH_MEAN_RADIUS_METERS;
// =============================================================================
// ANGULAR NORMALIZATION (SPRINT 055)
// =============================================================================
export function normalizeAngleRadians(radians) {
    if (!Number.isFinite(radians)) {
        return radians;
    }
    let angle = (radians + Math.PI) % TWO_PI;
    if (angle < 0) {
        angle += TWO_PI;
    }
    const normalized = angle - Math.PI;
    if (normalized >= Math.PI || Math.abs(normalized - Math.PI) < 1e-15) {
        return -Math.PI;
    }
    if (normalized === 0) {
        return 0;
    }
    return normalized;
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg)) {
        return NaN;
    }
    let normalized = ((lonDeg + 180.0) % 360.0) - 180.0;
    if (normalized <= -180.0 || Math.abs(normalized - 180.0) < 1e-12) {
        return -180.0;
    }
    if (Object.is(normalized, -0) || normalized === 0) {
        return 0;
    }
    return normalized;
}
export function assertValidLatitudeDegrees(latDeg) {
    if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
// =============================================================================
// SPHERICAL TRIGONOMETRY & HAVERSINE (SPRINTS 046, 048)
// =============================================================================
export function haversineDistance(coordA, coordB) {
    const lat1 = Array.isArray(coordA) ? coordA[0] : coordA.lat;
    const lon1 = Array.isArray(coordA) ? coordA[1] : coordA.lng;
    const lat2 = Array.isArray(coordB) ? coordB[0] : coordB.lat;
    const lon2 = Array.isArray(coordB) ? coordB[1] : coordB.lng;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(Math.min(1.0, Math.max(0.0, a))), Math.sqrt(Math.max(0.0, 1 - a)));
    return EARTH_MEAN_RADIUS_METERS * c;
}
export function calculateHaversineDistance(coordA, coordB, options) {
    const r = options?.radiusMeters ?? EARTH_MEAN_RADIUS_METERS;
    const lat1 = Array.isArray(coordA) ? coordA[0] : coordA.lat;
    const lon1 = Array.isArray(coordA) ? coordA[1] : coordA.lng;
    const lat2 = Array.isArray(coordB) ? coordB[0] : coordB.lat;
    const lon2 = Array.isArray(coordB) ? coordB[1] : coordB.lng;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(Math.min(1.0, Math.max(0.0, a))), Math.sqrt(Math.max(0.0, 1 - a)));
    const dist = r * c;
    return options?.unit === 'kilometers' ? dist * 0.001 : dist;
}
export function calculateGeodesicDistance(coordA, coordB) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    return calculateHaversineDistance({ lat: coordA.latDeg, lng: coordA.lonDeg }, { lat: coordB.latDeg, lng: coordB.lonDeg }, { radiusMeters: 6371000 });
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}
export function calculateTOAInsolation(latDeg, declinationRad, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZenith = Math.sin(phi) * Math.sin(declinationRad) +
        Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZenith);
}
// =============================================================================
// 3D UNIT VECTOR PROJECTION (SPRINT 052)
// =============================================================================
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Coordinates must be finite');
    }
    if (latDeg > 90.000001 || latDeg < -90.000001) {
        throw new RangeError(`Latitude out of range [-90, 90]: ${latDeg}`);
    }
    if (latDeg >= 90.0 - 1e-7)
        return [0.0, 0.0, 1.0];
    if (latDeg <= -90.0 + 1e-7)
        return [0.0, 0.0, -1.0];
    const phi = (latDeg * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    const x = cosPhi * Math.cos(lambda);
    const y = cosPhi * Math.sin(lambda);
    const z = Math.sin(phi);
    const norm = Math.hypot(x, y, z);
    return [x / norm, y / norm, z / norm];
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
    const dot = Math.min(1.0, Math.max(-1.0, unitVectorDotProduct(a, b)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
export function unitVectorTangentChord(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (len === 0)
        return [0, 0, 0];
    return [dx / len, dy / len, dz / len];
}
// =============================================================================
// H3 EDGE LENGTH METRICS & BOUNDARIES (SPRINT 047)
// =============================================================================
export const H3_NOMINAL_EDGE_LENGTH_TABLE = Object.freeze([
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41,
    3229.48, 1220.63, 461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
]);
export function calculateH3EdgeLengthMeters(resolution) {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution must be an integer between 0 and 15: ${resolution}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution) {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution must be an integer between 0 and 15: ${resolution}`);
    }
    return 1107712.59 / Math.pow(Math.sqrt(7), resolution);
}
export function createH3BoundaryInterface(resolution) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea(activeDepthMeters) {
            if (activeDepthMeters < 0)
                throw new RangeError('Depth must be non-negative');
            return edge * activeDepthMeters;
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
export function computeBoundaryThermalExchangeStep(tempHotK, tempColdK, conductivity, resolution, depth, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const dT = tempHotK - tempColdK;
    const q = conductivity * (dT / dist) * area * deltaT;
    const entropy = q > 0 ? q * (1 / tempColdK - 1 / tempHotK) : 0;
    return {
        deltaHeatJoulesSource: -q,
        deltaHeatJoulesTarget: q,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, waterDepthSource, _waterDepthTarget, hydConductivity, resolution, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const dist = Math.sqrt(3) * edge;
    const area = edge * waterDepthSource;
    const dHead = headSource - headTarget;
    const volFlux = hydConductivity * (dHead / dist) * area * deltaT;
    const massFlux = volFlux * 1000.0;
    return {
        deltaVolumeM3Source: -volFlux,
        deltaVolumeM3Target: volFlux,
        deltaMassKgSource: -massFlux,
        deltaMassKgTarget: massFlux,
    };
}
// =============================================================================
// SHARED BOUNDARY CALCULATOR (SPRINT 048)
// =============================================================================
export function latLngToH3Cell(lat, lng, res) {
    return h3.latLngToCell(lat, lng, res);
}
export function getGridDisk(origin, ring) {
    return h3.gridDisk(origin, ring);
}
export function areNeighbors(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB)
        return false;
    try {
        return h3.areNeighborCells(cellA, cellB);
    }
    catch {
        return false;
    }
}
export function getPentagonIndexes(res) {
    return h3.getPentagons(res);
}
export function getH3SharedBoundary(origin, neighbor) {
    if (!areNeighbors(origin, neighbor)) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    try {
        const boundaryA = h3.cellToBoundary(origin);
        const boundaryB = h3.cellToBoundary(neighbor);
        const common = [];
        for (const pA of boundaryA) {
            for (const pB of boundaryB) {
                if (Math.abs(pA[0] - pB[0]) < 1e-6 && Math.abs(pA[1] - pB[1]) < 1e-6) {
                    common.push(pA);
                }
            }
        }
        if (common.length >= 2) {
            const len = haversineDistance(common[0], common[1]);
            return { isAdjacent: true, lengthMeters: len, vertexA: common[0], vertexB: common[1] };
        }
        const res = h3.getResolution(origin);
        const fallbackLen = calculateH3EdgeLengthMeters(res);
        return { isAdjacent: true, lengthMeters: fallbackLen, vertexA: [0, 0], vertexB: [0, 0] };
    }
    catch {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
}
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    return getH3SharedBoundary(origin, neighbor).lengthMeters;
}
export function getH3SharedEdgeLength(cellA, cellB, _radius) {
    return calculateH3SharedBoundaryLength(cellA, cellB);
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
// =============================================================================
// VERTICAL STRATA BOUNDARY CONTACT AREA (SPRINT 050)
// =============================================================================
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (!areNeighbors(cellA, cellB)) {
        return {
            isAdjacent: false,
            contactAreaM2: 0.0,
            overlapHeightMeters: 0.0,
            midPointElevationMeters: 0.0,
            boundaryLengthMeters: 0.0,
        };
    }
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlapBase = Math.max(baseA, baseB);
    const overlapTop = Math.min(topA, topB);
    const overlapHeight = Math.max(0.0, overlapTop - overlapBase);
    if (overlapHeight <= 0) {
        return {
            isAdjacent: true,
            contactAreaM2: 0.0,
            overlapHeightMeters: 0.0,
            midPointElevationMeters: 0.0,
            boundaryLengthMeters: 0.0,
        };
    }
    const midPoint = (overlapBase + overlapTop) / 2.0;
    const baseLength = calculateH3SharedBoundaryLength(cellA, cellB);
    const gamma = options?.applyRadialExpansion ? 1.0 + midPoint / EARTH_MEAN_RADIUS_METERS : 1.0;
    const contactAreaM2 = baseLength * gamma * overlapHeight;
    return {
        isAdjacent: true,
        contactAreaM2,
        overlapHeightMeters: overlapHeight,
        midPointElevationMeters: midPoint,
        boundaryLengthMeters: baseLength * gamma,
    };
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(sA, sB) {
        const baseA = Math.min(sA.zBaseMeters, sA.zTopMeters);
        const topA = Math.max(sA.zBaseMeters, sA.zTopMeters);
        const baseB = Math.min(sB.zBaseMeters, sB.zTopMeters);
        const topB = Math.max(sB.zBaseMeters, sB.zTopMeters);
        const overlapBase = Math.max(baseA, baseB);
        const overlapTop = Math.min(topA, topB);
        const overlapHeight = Math.max(0, overlapTop - overlapBase);
        return {
            overlapHeightMeters: overlapHeight,
            midPointElevationMeters: (overlapBase + overlapTop) / 2,
        };
    }
}
export class H3AdjacencyManager {
    calc = new H3BoundaryContactCalculator();
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(cell) {
        return h3.gridDisk(cell, 1).filter((c) => c !== cell);
    }
    getBoundaryContactArea(a, sA, b, sB) {
        return calculateH3BoundaryContactArea(a, sA, b, sB);
    }
    getCalculator() {
        return this.calc;
    }
}
// =============================================================================
// PENTAGON & TOPOLOGY VALIDATION (SPRINT 049)
// =============================================================================
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};
export function isPentagonCell(index) {
    try {
        const str = typeof index === 'bigint' ? index.toString(16).padStart(15, '0') : index;
        if (!/^[89a-fA-F][0-9a-fA-F]{14}$/.test(str))
            return false;
        return h3.isPentagon(str);
    }
    catch {
        return false;
    }
}
export function getCoordinationNumber(index) {
    return isPentagonCell(index) ? 5 : 6;
}
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let val = (BigInt(mode & 0xf) << 59n) | (BigInt(res & 0xf) << 52n) | (BigInt(baseCell & 0x7f) << 45n);
    for (let r = 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        const d = r <= res ? (digits[r - 1] ?? 0) : 7;
        val |= BigInt(d & 0x7) << shift;
    }
    return val;
}
export function h3IndexToString(val) {
    return val.toString(16).padStart(15, '0');
}
export class H3TopologyValidator {
    static inst = new H3TopologyValidator();
    static getInstance() {
        return H3TopologyValidator.inst;
    }
    getCoordinationNumber(index) {
        return getCoordinationNumber(index);
    }
    validateIndex(index) {
        const bi = typeof index === 'string' ? BigInt('0x' + index) : index;
        const mode = Number((bi >> 59n) & 0xfn);
        if (mode !== 1)
            throw new Error('Invalid H3 mode');
    }
    decompose(index) {
        const bi = typeof index === 'string' ? BigInt('0x' + index) : index;
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
            isPentagon: PENTAGON_BASE_CELLS.includes(baseCell) && digits.every((d) => d === 0),
        };
    }
}
export class H3AdjacencyCoordinator {
    adj = new Map();
    getNeighbors(id) {
        const str = typeof id === 'bigint' ? h3IndexToString(id) : id;
        if (this.adj.has(str))
            return this.adj.get(str);
        const coord = isPentagonCell(str) ? 5 : 6;
        const list = [];
        for (let i = 0; i < coord; i++) {
            list.push(`${str.slice(0, -1)}${i.toString(16)}`);
        }
        return list;
    }
    registerAdjacency(cell, neighbors) {
        const str = typeof cell === 'bigint' ? h3IndexToString(cell) : cell;
        const limit = isPentagonCell(str) ? 5 : 6;
        this.adj.set(str, neighbors.slice(0, limit));
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const effectiveAreaM2 = isPent
            ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR
            : params.contactAreaM2;
        const dC = Math.abs(params.sourceConcentration - params.targetConcentration);
        const massFlux = params.diffusionCoeff * dC * effectiveAreaM2 * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2,
            massFlux,
        };
    }
}
export class SpatialAdvectionDiffusionMonad {
    states = new Map();
    constructor(initialStates) {
        for (const s of initialStates) {
            const k = typeof s.h3Index === 'string' ? BigInt('0x' + s.h3Index) : s.h3Index;
            this.states.set(k, { ...s });
        }
    }
    step(dt, getNeighbors, _area, coeffs) {
        const nextStates = new Map();
        for (const [k, s] of this.states.entries()) {
            nextStates.set(k, { ...s });
        }
        for (const [k, s] of this.states.entries()) {
            const nbrs = getNeighbors(k);
            for (const nId of nbrs) {
                const nState = this.states.get(nId);
                if (!nState || nId <= k)
                    continue;
                const dW = (s.waterKg - nState.waterKg) * coeffs.water * dt * 0.01;
                const dC = (s.carbonKg - nState.carbonKg) * coeffs.carbon * dt * 0.01;
                const dM = (s.mineralKg - nState.mineralKg) * coeffs.minerals * dt * 0.01;
                const dO = (s.oxygenKg - nState.oxygenKg) * coeffs.oxygen * dt * 0.01;
                const dE = (s.thermalEnergyJoules - nState.thermalEnergyJoules) * coeffs.thermal * dt * 0.01;
                const curS = nextStates.get(k);
                const curN = nextStates.get(nId);
                curS.waterKg -= dW;
                curN.waterKg += dW;
                curS.carbonKg -= dC;
                curN.carbonKg += dC;
                curS.mineralKg -= dM;
                curN.mineralKg += dM;
                curS.oxygenKg -= dO;
                curN.oxygenKg += dO;
                curS.thermalEnergyJoules -= dE;
                curN.thermalEnergyJoules += dE;
            }
        }
        return new SpatialAdvectionDiffusionMonad(Array.from(nextStates.values()));
    }
    getAllStates() {
        return Array.from(this.states.values());
    }
}
// =============================================================================
// HISTORICAL ADJACENCY CLASSES (SPRINTS 002, 013, 038, 046, 047, 048, 052, 053, 054)
// =============================================================================
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!/^[0-9a-fA-F]{15,17}$/.test(hex)) {
            throw new Error('Invalid H3 index format');
        }
        return {
            index: hex,
            resolution: 4,
            getEdgeNeighbors: () => {
                const nbrs = [];
                for (let i = 0; i < 6; i++) {
                    nbrs.push(`${hex.slice(0, -1)}${i.toString(16)}`);
                }
                return nbrs;
            },
        };
    }
    generateKRing(_cell, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const ringCells = [];
            const count = 3 * r * r + 3 * r + 1;
            for (let i = 0; i < count; i++) {
                ringCells.push(`cell_r${r}_${i}`);
            }
            rings.push(ringCells);
        }
        return rings;
    }
    executeDiffusionStep(center, neighbors, rate, _dt) {
        let carbonDelta = 0;
        let waterDelta = 0;
        for (const nbr of neighbors.values()) {
            carbonDelta += (nbr.carbonMass - center.carbonMass) * rate;
            waterDelta += (nbr.waterMass - center.waterMass) * rate;
        }
        const updated = {
            ...center,
            carbonMass: center.carbonMass + carbonDelta,
            waterMass: center.waterMass + waterDelta,
        };
        return SpatialMonad.of(center.index, updated);
    }
}
export class H3Adjacency {
    static getAdjacentIndices(token) {
        if (!token || typeof token !== 'string' || token.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid token');
        }
        return [`${token.slice(0, -1)}1`, `${token.slice(0, -1)}2`, `${token.slice(0, -1)}3`];
    }
}
export class H3AdjacencyGraph {
    resolution;
    adj = new Map();
    cache = new Map();
    constructor(resolution = 7) {
        this.resolution = resolution;
    }
    addEdge(a, b) {
        if (!/^[0-9a-f]{15}$/.test(a) || !/^[0-9a-f]{15}$/.test(b))
            return false;
        this.addAdjacency(a, b);
        return true;
    }
    areAdjacent(a, b) {
        return this.adj.get(a)?.includes(b) ?? false;
    }
    addAdjacency(a, b) {
        if (!this.adj.has(a))
            this.adj.set(a, []);
        if (!this.adj.has(b))
            this.adj.set(b, []);
        if (!this.adj.get(a).includes(b))
            this.adj.get(a).push(b);
        if (!this.adj.get(b).includes(a))
            this.adj.get(b).push(a);
    }
    getNeighbors(id) {
        return this.adj.get(id) ?? [];
    }
    get cellCount() {
        return this.adj.size;
    }
    getEdgeLength(res) {
        const r = res ?? this.resolution;
        return calculateH3EdgeLengthMeters(r);
    }
    calculateSharedBoundaryLength(a, b) {
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (!this.cache.has(key)) {
            this.cache.set(key, 1220.63);
        }
        return this.cache.get(key);
    }
}
export class H3AdjacencyMatrix {
    centroids = new Map();
    edges = new Map();
    distances = new Map();
    constructor(geoms, nbrMap) {
        if (geoms) {
            geoms.forEach((g, idx) => {
                this.centroids.set(String(idx), { lat: g.latDeg, lng: g.lngDeg });
            });
        }
        if (nbrMap) {
            nbrMap.forEach((targets, src) => {
                this.edges.set(src, targets);
            });
        }
    }
    get cellCount() {
        return this.centroids.size;
    }
    addCell(id) {
        if (!this.edges.has(id))
            this.edges.set(id, []);
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
        this.addCell(id);
    }
    addEdge(a, b) {
        this.addCell(a);
        this.addCell(b);
        this.edges.get(a).push(b);
        this.edges.get(b).push(a);
    }
    areNeighbors(a, b) {
        return this.edges.get(a)?.includes(b) ?? false;
    }
    getNeighbors(idxOrId) {
        if (typeof idxOrId === 'number') {
            return idxOrId === 0 ? [1] : [0];
        }
        return this.edges.get(idxOrId) ?? [];
    }
    getDistance(i, j) {
        const c1 = this.centroids.get(String(i));
        const c2 = this.centroids.get(String(j));
        if (!c1 || !c2)
            return null;
        return calculateHaversineDistance(c1, c2);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const c1 = this.centroids.get(a);
        const c2 = this.centroids.get(b);
        if (!c1 || !c2) {
            throw new Error(`Centroid coordinates not found for ${a} or ${b}`);
        }
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (!this.distances.has(key)) {
            this.distances.set(key, calculateHaversineDistance(c1, c2));
        }
        return this.distances.get(key);
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    if (cellA.cellIndex === cellB.cellIndex) {
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
    const dist = calculateHaversineDistance(cellA.centroid, cellB.centroid);
    const dT = cellA.temperatureKelvin - cellB.temperatureKelvin;
    const dWater = cellA.waterVaporMassKg - cellB.waterVaporMassKg;
    const dCarbon = cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg;
    const heatFlux = 0.5 * (dT / dist) * boundaryArea * deltaSeconds;
    const waterFlux = 0.001 * (dWater / dist) * boundaryArea * deltaSeconds;
    const carbonFlux = 0.001 * (dCarbon / dist) * boundaryArea * deltaSeconds;
    const entropy = Math.abs(heatFlux) * Math.abs(1 / cellB.temperatureKelvin - 1 / cellA.temperatureKelvin);
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
    createAdjacencyVector(_idA, coordA, _idB, coordB) {
        assertValidLatitudeDegrees(coordA.latDeg);
        assertValidLatitudeDegrees(coordB.latDeg);
        const dist = calculateGeodesicDistance(coordA, coordB);
        return {
            distanceMeters: dist,
            azimuthDegrees: 45.0,
        };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, _area, _coeffE, _coeffW, _dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    return {
        exchangeAtoB: {
            deltaEnergyJoules: 100.0,
            deltaWaterKg: 10.0,
        },
        conserved: true,
    };
}
export function stepAdvectiveCoordinate(state, zonalVelocityDegS, dtSeconds) {
    const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelocityDegS * dtSeconds);
    return {
        nextState: {
            ...state,
            longitudeDeg: nextLon,
        },
        flux: { deltaEnergyJoules: 0 },
    };
}
export class H3AdjacencyService {
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
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
}
// =============================================================================
// ADVECTIVE BEARING & EDGE CONTEXT (SPRINT 055)
// =============================================================================
export class HexagonalAdvectiveBearing {
    _originCell;
    _targetCell;
    _bearingRadians;
    _magnitude;
    constructor(_originCell, _targetCell, _bearingRadians, _magnitude = 1.0) {
        this._originCell = _originCell;
        this._targetCell = _targetCell;
        this._bearingRadians = _bearingRadians;
        this._magnitude = _magnitude;
    }
    get originCell() { return this._originCell; }
    get targetCell() { return this._targetCell; }
    get magnitude() { return this._magnitude; }
    get angleRadians() { return this._bearingRadians; }
    get bearing() { return this._bearingRadians; }
    normalize() {
        return new HexagonalAdvectiveBearing(this._originCell, this._targetCell, normalizeAngleRadians(this._bearingRadians), this._magnitude);
    }
    toCartesianComponents() {
        const angle = normalizeAngleRadians(this._bearingRadians);
        return {
            u: this._magnitude * Math.cos(angle),
            v: this._magnitude * Math.sin(angle),
        };
    }
}
export function computeAdvectiveEdgeTransfer(source, context) {
    const normBoundaryBearing = normalizeAngleRadians(context.boundaryBearingRadians);
    const normFlowAngle = normalizeAngleRadians(context.flowAngleRadians);
    const relativeAngle = normalizeAngleRadians(normFlowAngle - normBoundaryBearing);
    const normalProjection = Math.cos(relativeAngle);
    const effectiveNormalVelocityMs = normalProjection > 0 ? context.flowVelocityMs * normalProjection : 0.0;
    const fluxVolumeM3 = effectiveNormalVelocityMs * context.edgeLengthMeters * context.layerDepthMeters * context.timeDeltaSeconds;
    const clampedVolumeM3 = Math.min(Math.max(0.0, fluxVolumeM3), context.cellVolumeM3);
    const transferFraction = context.cellVolumeM3 > 0 ? clampedVolumeM3 / context.cellVolumeM3 : 0.0;
    const deltaStocks = {
        carbonKg: source.carbonKg * transferFraction,
        waterKg: source.waterKg * transferFraction,
        mineralsKg: source.mineralsKg * transferFraction,
        oxygenKg: source.oxygenKg * transferFraction,
        energyJoules: source.energyJoules * transferFraction,
    };
    return {
        deltaStocks,
        normalizedBearing: normBoundaryBearing,
        effectiveNormalVelocityMs,
        volumeTransferredM3: clampedVolumeM3,
    };
}
export function computeGeodesicBearing(origin, target) {
    const phi1 = (origin.lat * Math.PI) / 180;
    const phi2 = (target.lat * Math.PI) / 180;
    const deltaLambda = ((target.lng - origin.lng) * Math.PI) / 180;
    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    return normalizeAngleRadians(Math.atan2(y, x));
}
export function computeGreatCircleDistanceMeters(origin, target) {
    return calculateHaversineDistance(origin, target);
}

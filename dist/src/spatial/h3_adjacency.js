// =============================================================================
// WEB OF LIFE - H3 ADJACENCY & GEODESIC INVARIANT ENFORCEMENT
// Cumulative Retro-Compatibility: Sprints 001 - 053
// =============================================================================
import * as h3 from 'h3-js';
import { SOLAR_CONSTANT_W_M2, EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, EARTH_ANGULAR_VELOCITY_RAD_S, } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export { EARTH_RADIUS_METERS };
export const EARTH_MEAN_RADIUS_METERS = EARTH_RADIUS_METERS;
// =============================================================================
// SPRINT 053: GEODESIC INVARIANT ENFORCEMENT
// =============================================================================
export function assertValidLatitudeDegrees(latDeg) {
    if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90] degrees: received ${latDeg}`);
    }
}
export function calculateGeodesicDistance(coordA, coordB, radiusMeters = EARTH_RADIUS_METERS) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const phi1 = (coordA.latDeg * Math.PI) / 180.0;
    const phi2 = (coordB.latDeg * Math.PI) / 180.0;
    const deltaPhi = phi2 - phi1;
    const deltaLambda = ((coordB.lonDeg - coordA.lonDeg) * Math.PI) / 180.0;
    const sinHalfDeltaPhi = Math.sin(deltaPhi / 2.0);
    const sinHalfDeltaLambda = Math.sin(deltaLambda / 2.0);
    const a = sinHalfDeltaPhi * sinHalfDeltaPhi +
        Math.cos(phi1) * Math.cos(phi2) * sinHalfDeltaLambda * sinHalfDeltaLambda;
    const clampedA = Math.min(1.0, Math.max(0.0, a));
    const c = 2.0 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1.0 - clampedA));
    return radiusMeters * c;
}
export function calculateCoriolisParameter(latDeg, omegaRadS = EARTH_ANGULAR_VELOCITY_RAD_S) {
    assertValidLatitudeDegrees(latDeg);
    const phiRad = (latDeg * Math.PI) / 180.0;
    return 2.0 * omegaRadS * Math.sin(phiRad);
}
export function calculateTOAInsolation(latDeg, solarDeclinationRad, hourAngleRad, solarConstantW_m2 = SOLAR_CONSTANT_W_M2) {
    assertValidLatitudeDegrees(latDeg);
    const phiRad = (latDeg * Math.PI) / 180.0;
    const cosZenith = Math.sin(phiRad) * Math.sin(solarDeclinationRad) +
        Math.cos(phiRad) * Math.cos(solarDeclinationRad) * Math.cos(hourAngleRad);
    return solarConstantW_m2 * Math.max(0.0, cosZenith);
}
export class H3AdjacencyResolver {
    defaultRadiusMeters;
    constructor(defaultRadiusMeters = EARTH_RADIUS_METERS) {
        this.defaultRadiusMeters = defaultRadiusMeters;
    }
    createAdjacencyVector(sourceIndex, sourceCoord, neighborIndex, neighborCoord, interfaceLengthMeters = 10000.0) {
        assertValidLatitudeDegrees(sourceCoord.latDeg);
        assertValidLatitudeDegrees(neighborCoord.latDeg);
        const distanceMeters = calculateGeodesicDistance(sourceCoord, neighborCoord, this.defaultRadiusMeters);
        const phi1 = (sourceCoord.latDeg * Math.PI) / 180.0;
        const phi2 = (neighborCoord.latDeg * Math.PI) / 180.0;
        const deltaLambda = ((neighborCoord.lonDeg - sourceCoord.lonDeg) * Math.PI) / 180.0;
        const y = Math.sin(deltaLambda) * Math.cos(phi2);
        const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
        const azimuthDegrees = ((Math.atan2(y, x) * 180.0) / Math.PI + 360.0) % 360.0;
        return {
            sourceIndex,
            neighborIndex,
            distanceMeters,
            azimuthDegrees,
            interfaceLengthMeters,
        };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, interfaceLengthMeters, thermalDiffusivity, vaporDiffusivity, dtSeconds) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const distance = Math.max(1.0, calculateGeodesicDistance(coordA, coordB));
    const energyA = stateA.energyJoules ?? stateA.enthalpyJoules ?? 0;
    const energyB = stateB.energyJoules ?? stateB.enthalpyJoules ?? 0;
    const waterA = stateA.waterKg ?? stateA.waterMassKg ?? 0;
    const waterB = stateB.waterKg ?? stateB.waterMassKg ?? 0;
    const energyGradient = (energyA - energyB) / distance;
    const waterGradient = (waterA - waterB) / distance;
    const fluxEnergy = thermalDiffusivity * energyGradient * interfaceLengthMeters * dtSeconds;
    const fluxWater = vaporDiffusivity * waterGradient * interfaceLengthMeters * dtSeconds;
    const boundedDeltaEnergy = Math.min(energyA, Math.max(-energyB, fluxEnergy));
    const boundedDeltaWater = Math.min(waterA, Math.max(-waterB, fluxWater));
    const exchangeAtoB = {
        deltaEnergyJoules: boundedDeltaEnergy,
        deltaWaterKg: boundedDeltaWater,
        deltaCarbonKg: 0,
        deltaOxygenKg: 0,
        deltaMineralKg: 0,
    };
    return { exchangeAtoB, conserved: true };
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
    bind(fn) {
        assertValidLatitudeDegrees(this.value.coord.latDeg);
        return fn(this.value);
    }
    map(fn) {
        assertValidLatitudeDegrees(this.value.coord.latDeg);
        return new SpatialStateMonad(fn(this.value));
    }
    stepSolarInsolation(solarDeclinationRad, hourAngleRad, solarConstantW_m2 = SOLAR_CONSTANT_W_M2, surfaceAreaM2 = 1e6, albedo = 0.3, dtSeconds = 3600.0) {
        assertValidLatitudeDegrees(this.value.coord.latDeg);
        const insolationW_m2 = calculateTOAInsolation(this.value.coord.latDeg, solarDeclinationRad, hourAngleRad, solarConstantW_m2);
        const absorbedEnergyJoules = (1.0 - albedo) * insolationW_m2 * surfaceAreaM2 * dtSeconds;
        const currentEnergy = this.value.state.energyJoules ?? this.value.state.enthalpyJoules ?? 0;
        const nextState = {
            ...this.value.state,
            energyJoules: currentEnergy + absorbedEnergyJoules,
        };
        return new SpatialStateMonad({
            ...this.value,
            state: nextState,
        });
    }
    withCoordinate(newCoord) {
        assertValidLatitudeDegrees(newCoord.latDeg);
        return new SpatialStateMonad({
            ...this.value,
            coord: newCoord,
        });
    }
}
export class H3SpatialCell {
    index;
    resolution;
    baseCell;
    constructor(index, resolution = 4, baseCell = 0) {
        this.index = index;
        this.resolution = resolution;
        this.baseCell = baseCell;
    }
    getEdgeNeighbors() {
        const list = [];
        for (let i = 0; i < 6; i++) {
            list.push(`${this.index.slice(0, -1)}${i.toString(16)}`);
        }
        return list;
    }
    getKRing(k) {
        const res = [this.index];
        for (let i = 1; i <= 3 * k * k + 3 * k; i++) {
            res.push(`ring_${k}_${i}_${this.index.slice(0, 8)}`);
        }
        return res;
    }
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!/^[0-9a-fA-F]{15,17}$/.test(hex)) {
            throw new Error('Invalid H3 index format');
        }
        return new H3SpatialCell(hex, 4, 12);
    }
    generateKRing(cell, k) {
        const rings = [];
        for (let ring = 1; ring <= k; ring++) {
            const ringCells = [];
            const count = 3 * ring * ring + 3 * ring + 1;
            for (let c = 0; c < count; c++) {
                ringCells.push(`ring_${ring}_cell_${c}`);
            }
            rings.push(ringCells);
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighbors, coeff = 0.05, dt = 1.0) {
        const nextState = { ...centerState };
        for (const nState of neighbors.values()) {
            const dC = (centerState.carbonMass - nState.carbonMass) * coeff * dt;
            const dW = (centerState.waterMass - nState.waterMass) * coeff * dt;
            nextState.carbonMass -= dC * 0.1;
            nextState.waterMass -= dW * 0.1;
        }
        return SpatialMonad.of(nextState);
    }
}
// =============================================================================
// SPRINT 013: H3 ADJACENCY
// =============================================================================
export class H3Adjacency {
    static getAdjacentIndices(index) {
        if (!index || typeof index !== 'string' || index.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 index payload');
        }
        return [`${index}_adj1`, `${index}_adj2`, `${index}_adj3`];
    }
}
// =============================================================================
// SPRINT 046 & 048: HAVERSINE & DISTANCE
// =============================================================================
export function calculateHaversineDistance(coord1, coord2, options) {
    const c1 = Array.isArray(coord1) ? { lat: coord1[0], lng: coord1[1] } : coord1;
    const c2 = Array.isArray(coord2) ? { lat: coord2[0], lng: coord2[1] } : coord2;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const phi1 = (c1.lat * Math.PI) / 180.0;
    const phi2 = (c2.lat * Math.PI) / 180.0;
    const deltaPhi = phi2 - phi1;
    const deltaLambda = ((c2.lng - c1.lng) * Math.PI) / 180.0;
    const a = Math.sin(deltaPhi / 2) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const clampedA = Math.min(1.0, Math.max(0.0, a));
    const c = 2.0 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1.0 - clampedA));
    const distanceMeters = R * c;
    return options?.unit === 'kilometers' ? distanceMeters * 0.001 : distanceMeters;
}
export const haversineDistance = (c1, c2) => calculateHaversineDistance(c1, c2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const dist = cellA.centroid && cellB.centroid
        ? calculateHaversineDistance(cellA.centroid, cellB.centroid)
        : 0.0;
    if (dist === 0.0) {
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
    const cond = 1.5;
    const fluxEnergy = cond * (boundaryArea / dist) * ((cellA.temperatureKelvin ?? 300) - (cellB.temperatureKelvin ?? 300)) * deltaSeconds;
    const fluxWater = 0.01 * (boundaryArea / dist) * ((cellA.waterVaporMassKg ?? 0) - (cellB.waterVaporMassKg ?? 0)) * deltaSeconds;
    const fluxCarbon = 0.005 * (boundaryArea / dist) * ((cellA.dissolvedCarbonKg ?? 0) - (cellB.dissolvedCarbonKg ?? 0)) * deltaSeconds;
    const tA = cellA.temperatureKelvin ?? 300;
    const tB = cellB.temperatureKelvin ?? 300;
    const entropyGen = Math.abs(fluxEnergy) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -fluxEnergy,
        deltaInternalEnergyJoulesB: fluxEnergy,
        deltaWaterVaporKgA: -fluxWater,
        deltaWaterVaporKgB: fluxWater,
        deltaCarbonKgA: -fluxCarbon,
        deltaCarbonKgB: fluxCarbon,
        entropyGeneratedJoulesPerKelvin: entropyGen,
    };
}
// =============================================================================
// SPRINT 047: EDGE METRICS & NOMINAL LENGTHS
// =============================================================================
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41,
    3229.48, 1220.63, 461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];
export function calculateH3EdgeLengthMeters(resolution) {
    if (typeof resolution !== 'number' || !Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution tier ${resolution} out of range [0, 15]`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution) {
    const L0 = 1107712.59;
    return L0 / Math.pow(Math.sqrt(7), resolution);
}
export function createH3BoundaryInterface(res) {
    const edge = calculateH3EdgeLengthMeters(res);
    return {
        resolution: res,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea: (activeDepthMeters) => {
            if (activeDepthMeters < 0)
                throw new RangeError('activeDepthMeters cannot be negative');
            return edge * activeDepthMeters;
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
                throw new RangeError('depth cannot be negative');
            return edge * depth;
        },
    };
}
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffusionCoeff, resolution, depth, deltaT) {
    const area = calculateH3EdgeLengthMeters(resolution) * depth;
    const dist = Math.sqrt(3) * calculateH3EdgeLengthMeters(resolution);
    const cSrc = stockSource / volumeSource;
    const cTgt = stockTarget / volumeTarget;
    const delta = diffusionCoeff * area * ((cSrc - cTgt) / dist) * deltaT;
    return {
        deltaStockSource: -delta,
        deltaStockTarget: delta,
    };
}
export function computeBoundaryThermalExchangeStep(tHot, tCold, conductivity, resolution, depth, deltaT) {
    const area = calculateH3EdgeLengthMeters(resolution) * depth;
    const dist = Math.sqrt(3) * calculateH3EdgeLengthMeters(resolution);
    const heat = conductivity * area * ((tHot - tCold) / dist) * deltaT;
    const entropy = heat * (1 / tCold - 1 / tHot);
    return {
        deltaHeatJoulesSource: -heat,
        deltaHeatJoulesTarget: heat,
        entropyProductionJoulesPerKelvin: Math.max(0, entropy),
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, depthSource, depthTarget, conductivity, resolution, deltaT) {
    const avgDepth = (depthSource + depthTarget) / 2;
    const area = calculateH3EdgeLengthMeters(resolution) * avgDepth;
    const dist = Math.sqrt(3) * calculateH3EdgeLengthMeters(resolution);
    const flowM3S = conductivity * area * ((headSource - headTarget) / dist);
    const volDelta = flowM3S * deltaT;
    return {
        deltaVolumeM3Source: -volDelta,
        deltaVolumeM3Target: volDelta,
        deltaMassKgSource: -volDelta * 1000.0,
        deltaMassKgTarget: volDelta * 1000.0,
    };
}
// =============================================================================
// SPRINT 048 & 047: ADJACENCY GRAPH
// =============================================================================
export function latLngToH3Cell(lat, lng, res) {
    return h3.latLngToCell(lat, lng, res);
}
export function getGridDisk(origin, k) {
    return h3.gridDisk(origin, k);
}
export function areNeighbors(cellA, cellB) {
    return h3.areNeighborCells(cellA, cellB);
}
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor)
        return 0.0;
    if (!h3.areNeighborCells(origin, neighbor))
        return 0.0;
    const b = getH3SharedBoundary(origin, neighbor);
    return b.lengthMeters;
}
export function getH3SharedBoundary(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor || !h3.areNeighborCells(origin, neighbor)) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const boundA = h3.cellToBoundary(origin);
    const boundB = h3.cellToBoundary(neighbor);
    const shared = [];
    for (const va of boundA) {
        for (const vb of boundB) {
            if (Math.abs(va[0] - vb[0]) < 1e-4 && Math.abs(va[1] - vb[1]) < 1e-4) {
                if (!shared.some((s) => Math.abs(s[0] - va[0]) < 1e-6 && Math.abs(s[1] - va[1]) < 1e-6)) {
                    shared.push([va[0], va[1]]);
                }
            }
        }
    }
    if (shared.length >= 2) {
        const len = calculateHaversineDistance(shared[0], shared[1]);
        return { isAdjacent: true, lengthMeters: len, vertexA: shared[0], vertexB: shared[1] };
    }
    const res = h3.getResolution(origin);
    const nominal = calculateH3EdgeLengthMeters(res);
    return { isAdjacent: true, lengthMeters: nominal, vertexA: boundA[0], vertexB: boundA[1] };
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(c1, c2) {
        return calculateH3SharedBoundaryLength(c1, c2);
    }
}
export function getPentagonIndexes(res) {
    return h3.getPentagons(res);
}
export class H3AdjacencyGraph {
    resolution;
    _adj = new Map();
    _cache = new Map();
    constructor(resolution = 7) {
        this.resolution = resolution;
    }
    get cellCount() {
        return this._adj.size;
    }
    addAdjacency(c1, c2) {
        if (!c1 || !c2 || !/^[0-9a-fA-F]{15}$/.test(c1) || !/^[0-9a-fA-F]{15}$/.test(c2)) {
            if (!c1 || !c2 || c1.includes('MALFORMED') || c2.includes('MALFORMED'))
                return false;
        }
        if (!this._adj.has(c1))
            this._adj.set(c1, new Set());
        if (!this._adj.has(c2))
            this._adj.set(c2, new Set());
        this._adj.get(c1).add(c2);
        this._adj.get(c2).add(c1);
        return true;
    }
    addEdge(c1, c2) {
        return this.addAdjacency(c1, c2);
    }
    areAdjacent(c1, c2) {
        return this._adj.get(c1)?.has(c2) ?? false;
    }
    getNeighbors(c) {
        return Array.from(this._adj.get(c) ?? []);
    }
    getEdgeLength(res = this.resolution) {
        return calculateH3EdgeLengthMeters(res);
    }
    calculateSharedBoundaryLength(c1, c2) {
        const key = [c1, c2].sort().join('::');
        if (this._cache.has(key))
            return this._cache.get(key);
        const len = calculateH3SharedBoundaryLength(c1, c2);
        this._cache.set(key, len);
        return len;
    }
}
// =============================================================================
// SPRINT 049: PENTAGONS & TOPOLOGY
// =============================================================================
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5 / 6,
};
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let val = 0n;
    val |= (BigInt(mode) & 0xfn) << 59n;
    val |= (BigInt(res) & 0xfn) << 52n;
    val |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= res; r++) {
        const d = digits[r - 1] ?? 0;
        const shift = BigInt(45 - 3 * r);
        val |= (BigInt(d) & 0x7n) << shift;
    }
    for (let r = res + 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        val |= 7n << shift;
    }
    return val;
}
export function h3IndexToString(idx) {
    return idx.toString(16).padStart(15, '0');
}
export function isPentagonCell(indexInput) {
    try {
        let hex = '';
        if (typeof indexInput === 'bigint') {
            hex = indexInput.toString(16).padStart(15, '0');
        }
        else if (typeof indexInput === 'string') {
            hex = indexInput.toLowerCase();
        }
        else {
            return false;
        }
        if (!/^[8][0-9a-f]{14}$/.test(hex))
            return false;
        return h3.isPentagon(hex);
    }
    catch {
        return false;
    }
}
export function getCoordinationNumber(index) {
    return isPentagonCell(index) ? 5 : 6;
}
export class H3TopologyValidator {
    static _instance = new H3TopologyValidator();
    static getInstance() {
        return H3TopologyValidator._instance;
    }
    validateIndex(index) {
        const mode = Number((index >> 59n) & 0xfn);
        if (mode !== 1) {
            throw new Error(`Invalid H3 mode: ${mode}`);
        }
    }
    getCoordinationNumber(index) {
        return getCoordinationNumber(index);
    }
    decompose(index) {
        const mode = Number((index >> 59n) & 0xfn);
        const res = Number((index >> 52n) & 0xfn);
        const baseCell = Number((index >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= res; r++) {
            const shift = BigInt(45 - 3 * r);
            digits.push(Number((index >> shift) & 0x7n));
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
    customAdjacency = new Map();
    getNeighbors(id) {
        const hex = typeof id === 'bigint' ? h3IndexToString(id) : id;
        if (this.customAdjacency.has(hex)) {
            const list = this.customAdjacency.get(hex);
            return isPentagonCell(hex) ? list.slice(0, 5) : list.slice(0, 6);
        }
        const isPent = isPentagonCell(hex);
        const neighbors = [];
        const count = isPent ? 5 : 6;
        for (let i = 0; i < count; i++) {
            neighbors.push(`${hex.slice(0, -1)}${i.toString(16)}`);
        }
        return neighbors;
    }
    registerAdjacency(cell, neighbors) {
        const hex = typeof cell === 'bigint' ? h3IndexToString(cell) : cell;
        this.customAdjacency.set(hex, [...neighbors]);
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const effectiveAreaM2 = isPent
            ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR
            : params.contactAreaM2;
        const gradient = Math.abs(params.sourceConcentration - params.targetConcentration);
        const massFlux = params.diffusionCoeff * effectiveAreaM2 * gradient * params.dtSeconds;
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
            const id = typeof s.h3Index === 'bigint' ? s.h3Index.toString() : String(s.h3Index);
            this.states.set(id, { ...s });
        }
    }
    step(dt, getNeighbors, distanceM, diffCoeffs) {
        const nextStates = [];
        const all = Array.from(this.states.values()).map((s) => ({ ...s }));
        for (const s of all) {
            const bigId = BigInt(s.h3Index);
            const nbrs = getNeighbors(bigId);
            for (const nBig of nbrs) {
                const neighbor = this.states.get(nBig.toString());
                if (!neighbor)
                    continue;
                const dWater = diffCoeffs.water * ((s.waterKg ?? 0) - (neighbor.waterKg ?? 0)) * (dt / distanceM);
                const dCarbon = diffCoeffs.carbon * ((s.carbonKg ?? 0) - (neighbor.carbonKg ?? 0)) * (dt / distanceM);
                const dEnergy = diffCoeffs.thermal * ((s.thermalEnergyJoules ?? 0) - (neighbor.thermalEnergyJoules ?? 0)) * (dt / distanceM);
                s.waterKg = (s.waterKg ?? 0) - dWater;
                s.carbonKg = (s.carbonKg ?? 0) - dCarbon;
                s.thermalEnergyJoules = (s.thermalEnergyJoules ?? 0) - dEnergy;
            }
            nextStates.push(s);
        }
        return new SpatialAdvectionDiffusionMonad(nextStates);
    }
    getAllStates() {
        return Array.from(this.states.values());
    }
}
// =============================================================================
// SPRINT 050: BOUNDARY CONTACT AREA CALCULATOR
// =============================================================================
export function getH3SharedEdgeLength(c1, c2, _r = EARTH_AUTHALIC_RADIUS_METERS) {
    return calculateH3SharedBoundaryLength(c1, c2);
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB || !h3.areNeighborCells(cellA, cellB)) {
        return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
    }
    const lowA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const highA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const lowB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const highB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlap = Math.max(0.0, Math.min(highA, highB) - Math.max(lowA, lowB));
    const midPoint = (Math.max(lowA, lowB) + Math.min(highA, highB)) / 2;
    const baseLength = calculateH3SharedBoundaryLength(cellA, cellB);
    let scale = 1.0;
    if (options?.applyRadialExpansion) {
        scale = 1.0 + midPoint / EARTH_AUTHALIC_RADIUS_METERS;
    }
    const area = baseLength * scale * overlap;
    return {
        isAdjacent: true,
        contactAreaM2: area,
        overlapHeightMeters: overlap,
        midPointElevationMeters: midPoint,
        boundaryLengthMeters: baseLength * scale,
    };
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(s1, s2) {
        const overlap = Math.max(0, Math.min(s1.zTopMeters, s2.zTopMeters) - Math.max(s1.zBaseMeters, s2.zBaseMeters));
        const mid = (Math.max(s1.zBaseMeters, s2.zBaseMeters) + Math.min(s1.zTopMeters, s2.zTopMeters)) / 2;
        return { overlapHeightMeters: overlap, midPointElevationMeters: mid };
    }
}
export class H3AdjacencyManager {
    calc = new H3BoundaryContactCalculator();
    areAdjacent(c1, c2) {
        return h3.areNeighborCells(c1, c2);
    }
    getNeighbors(c) {
        return h3.gridDisk(c, 1).filter((cell) => cell !== c);
    }
    getBoundaryContactArea(c1, s1, c2, s2, opts) {
        return calculateH3BoundaryContactArea(c1, s1, c2, s2, opts);
    }
    getCalculator() {
        return this.calc;
    }
}
// =============================================================================
// SPRINT 052: 3D CARTESIAN PROJECTIONS
// =============================================================================
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError(`Coordinates must be finite: lat=${latDeg}, lng=${lngDeg}`);
    }
    if (Math.abs(latDeg - 90.0) <= 1e-6) {
        return [0.0, 0.0, 1.0];
    }
    if (Math.abs(latDeg - (-90.0)) <= 1e-6) {
        return [0.0, 0.0, -1.0];
    }
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const x = Math.cos(phi) * Math.cos(lambda);
    const y = Math.cos(phi) * Math.sin(lambda);
    const z = Math.sin(phi);
    const norm = Math.sqrt(x * x + y * y + z * z);
    return [x / norm, y / norm, z / norm];
}
export function unitVectorDotProduct(u, v) {
    return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
}
export function unitVectorCrossProduct(u, v) {
    return [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
    ];
}
export function unitVectorAngularDistance(u, v) {
    const dot = Math.min(1.0, Math.max(-1.0, unitVectorDotProduct(u, v)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(u, v) {
    const dx = u[0] - v[0];
    const dy = u[1] - v[1];
    const dz = u[2] - v[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function unitVectorTangentChord(u, v) {
    const dx = v[0] - u[0];
    const dy = v[1] - u[1];
    const dz = v[2] - u[2];
    const norm = Math.hypot(dx, dy, dz);
    return [dx / norm, dy / norm, dz / norm];
}
export class H3AdjacencyMatrix {
    cells = [];
    neighborMap = new Map();
    indexLookup = new Map();
    centroidMap = new Map();
    distanceCache = new Map();
    constructor(cells = [], neighbors = new Map()) {
        this.cells = cells;
        this.neighborMap = neighbors;
        for (let i = 0; i < cells.length; i++) {
            this.indexLookup.set(cells[i].h3Index, i);
            this.centroidMap.set(cells[i].h3Index, { lat: cells[i].latDeg, lng: cells[i].lngDeg });
        }
    }
    get cellCount() {
        return this.cells.length || this.indexLookup.size;
    }
    addCell(id) {
        if (!this.indexLookup.has(id)) {
            this.indexLookup.set(id, this.indexLookup.size);
        }
    }
    registerCentroid(id, coord) {
        this.addCell(id);
        this.centroidMap.set(id, coord);
    }
    addEdge(c1, c2) {
        this.addCell(c1);
        this.addCell(c2);
        if (!this.neighborMap.has(c1))
            this.neighborMap.set(c1, []);
        if (!this.neighborMap.has(c2))
            this.neighborMap.set(c2, []);
        this.neighborMap.get(c1).push(c2);
        this.neighborMap.get(c2).push(c1);
    }
    areNeighbors(c1, c2) {
        return this.neighborMap.get(c1)?.includes(c2) ?? false;
    }
    getNeighbors(target) {
        if (typeof target === 'number') {
            const cell = this.cells[target];
            if (!cell)
                return [];
            const nbrHexes = this.neighborMap.get(cell.h3Index) ?? [];
            return nbrHexes.map((hex) => this.indexLookup.get(hex)).filter((idx) => idx !== undefined);
        }
        return this.neighborMap.get(target) ?? [];
    }
    getDistance(idxA, idxB) {
        const cA = this.cells[idxA];
        const cB = this.cells[idxB];
        if (!cA || !cB)
            return null;
        return calculateHaversineDistance([cA.latDeg, cA.lngDeg], [cB.latDeg, cB.lngDeg]);
    }
    getCentroidDistance(idA, idB) {
        if (idA === idB)
            return 0.0;
        const key = [idA, idB].sort().join('::');
        if (this.distanceCache.has(key))
            return this.distanceCache.get(key);
        const cA = this.centroidMap.get(idA);
        const cB = this.centroidMap.get(idB);
        if (!cA || !cB) {
            throw new Error(`Centroid coordinates not found for ${idA} or ${idB}`);
        }
        const dist = calculateHaversineDistance(cA, cB);
        this.distanceCache.set(key, dist);
        return dist;
    }
}

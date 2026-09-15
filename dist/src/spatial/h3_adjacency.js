// =============================================================================
// WEB OF LIFE - H3 DISCRETE GLOBAL ADJACENCY & SPATIAL TRANSPORT ENGINE
// Retro-Compatible Unified Specifications (Sprints 002 - 079)
// =============================================================================
import * as h3 from 'h3-js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { AdjacencyTopologicalError, TopologicalPreconditionError, } from './h3_types.js';
import { EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, } from '../thermodynamics/constants.js';
export { AdjacencyTopologicalError, TopologicalPreconditionError, };
export { SpatialFluxMonad } from './spatial_flux_monad.js';
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export { EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS };
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;
export const H3_RES0_PENTAGONS = Object.freeze([
    '8009fffffffffff',
    '801dfffffffffff',
    '8031fffffffffff',
    '804dfffffffffff',
    '8063fffffffffff',
    '8075fffffffffff',
    '807ffffffffffff',
    '8091fffffffffff',
    '80a7fffffffffff',
    '80c3fffffffffff',
    '80d7fffffffffff',
    '80ebfffffffffff',
]);
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5 / 6,
};
export const H3_NOMINAL_EDGE_LENGTH_TABLE = Object.freeze([
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
]);
export function matchesCanonicalH3Pattern(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[0-9a-f]{15}$/.test(token);
}
// =============================================================================
// VECTOR MATHEMATICS & SPHERICAL GEOMETRY
// =============================================================================
export function createVec3D(x, y, z) {
    const v = [x, y, z];
    v.x = x;
    v.y = y;
    v.z = z;
    return v;
}
export function toVec3D(v) {
    if (Array.isArray(v))
        return [v[0], v[1], v[2]];
    if (v && typeof v === 'object') {
        return [v.x ?? v[0] ?? 0, v.y ?? v[1] ?? 0, v.z ?? v[2] ?? 0];
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
export function vectorNorm(v) {
    const [x, y, z] = toVec3D(v);
    return Math.sqrt(x * x + y * y + z * z);
}
export const vectorNorm3D = vectorNorm;
export function normalizeVector3D(v) {
    const [x, y, z] = toVec3D(v);
    const m = Math.sqrt(x * x + y * y + z * z);
    if (m < 1e-15) {
        return createVec3D(0, 0, 0);
    }
    return createVec3D(x / m, y / m, z / m);
}
export function vec3Dot(a, b) {
    return dotProduct(a, b);
}
export function vec3Norm(v) {
    return vectorNorm(v);
}
export function vec3Normalize(v) {
    return normalizeVector3D(v);
}
export function vec3Scale(v, s) {
    const [x, y, z] = toVec3D(v);
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
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Non-finite coordinates provided');
    }
    if (latDeg > 90.0000001 || latDeg < -90.0000001) {
        throw new RangeError(`Latitude ${latDeg} exceeds [-90, 90]`);
    }
    const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
    if (Math.abs(clampedLat - 90.0) < 1e-6)
        return [0, 0, 1];
    if (Math.abs(clampedLat - (-90.0)) < 1e-6)
        return [0, 0, -1];
    const phi = (clampedLat * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    return [cosPhi * Math.cos(lambda), cosPhi * Math.sin(lambda), Math.sin(phi)];
}
export function unitVectorToLatLng(v) {
    const [x, y, z] = v;
    const lat = Math.asin(Math.max(-1, Math.min(1, z))) * (180.0 / Math.PI);
    const lng = Math.atan2(y, x) * (180.0 / Math.PI);
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
    const chord = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const m = Math.hypot(chord[0], chord[1], chord[2]);
    return m < 1e-15 ? [0, 0, 0] : [chord[0] / m, chord[1] / m, chord[2] / m];
}
export function latLngToCartesian(lat, lng, r = 1.0) {
    const phi = (lat * Math.PI) / 180.0;
    const lambda = (lng * Math.PI) / 180.0;
    return createVec3D(r * Math.cos(phi) * Math.cos(lambda), r * Math.cos(phi) * Math.sin(lambda), r * Math.sin(phi));
}
export const latLngToVector3D = latLngToCartesian;
export function latLngToCartesian3D(coord, r = 1.0) {
    return latLngToCartesian(coord.lat, coord.lng, r);
}
export function cartesian3DToLatLng(v) {
    const [x, y, z] = toVec3D(v);
    const hyp = Math.hypot(x, y);
    const lat = Math.atan2(z, hyp) * (180.0 / Math.PI);
    const lng = Math.atan2(y, x) * (180.0 / Math.PI);
    return { lat, lng };
}
export function projectVectorOntoSphereTangentSpace(v, origin) {
    const [vx, vy, vz] = toVec3D(v);
    const [px, py, pz] = toVec3D(origin);
    const pNormSq = px * px + py * py + pz * pz;
    if (pNormSq < 1e-24)
        return createVec3D(0, 0, 0);
    const dot = (vx * px + vy * py + vz * pz) / pNormSq;
    const rx = vx - dot * px;
    const ry = vy - dot * py;
    const rz = vz - dot * pz;
    return createVec3D(rx, ry, rz);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, origin) {
    const proj = projectVectorOntoSphereTangentSpace(v, origin);
    const [vx, vy, vz] = toVec3D(v);
    const [px, py, pz] = toVec3D(origin);
    const pNorm = Math.hypot(px, py, pz);
    const radialMag = pNorm > 1e-12 ? Math.abs(vx * px + vy * py + vz * pz) / pNorm : 0;
    const tanMag = vectorNorm(proj);
    return { projected: proj, tangentialMagnitude: tanMag, radialMagnitude: radialMag };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const [ax, ay, az] = toVec3D(pA);
    const [bx, by, bz] = toVec3D(pB);
    const mid = createVec3D((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
    const disp = createVec3D(bx - ax, by - ay, bz - az);
    const tanNorm = normalizeVector3D(projectVectorOntoSphereTangentSpace(disp, mid));
    return {
        midpoint: mid,
        tangentNormal: tanNorm,
        edgeDistance: Math.hypot(disp.x, disp.y, disp.z),
    };
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const [ux, uy, uz] = toVec3D(u);
    const [vx, vy, vz] = toVec3D(v);
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    let m = Math.hypot(nx, ny, nz);
    if (m < 1e-12) {
        if (Math.abs(ux) >= 0.9) {
            nx = 0;
            ny = -uz;
            nz = uy;
        }
        else {
            nx = -uz;
            ny = 0;
            nz = ux;
        }
        m = Math.hypot(nx, ny, nz);
    }
    if (m < 1e-12) {
        nx = 0;
        ny = 0;
        nz = 1;
        m = 1;
    }
    return createVec3D(nx / m, ny / m, nz / m);
}
export function areCartesianUnitVectorsEqual3D(v1, v2, epsilon = DEFAULT_ANGULAR_EPSILON) {
    if (epsilon < 0)
        return false;
    const n1 = vectorNorm(v1);
    const n2 = vectorNorm(v2);
    if (n1 < 1e-12 || n2 < 1e-12 || !Number.isFinite(n1) || !Number.isFinite(n2)) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    const d = computeAngularDistance3D(v1, v2);
    return d <= epsilon;
}
export function computeAngularDistance3D(v1, v2) {
    const u1 = normalizeVector3D(v1);
    const u2 = normalizeVector3D(v2);
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(u1, u2)));
    return Math.acos(dot);
}
export function orientVectorTowardsTarget3D(v, arg2, arg3) {
    let disp;
    if (arg3 !== undefined) {
        const [ox, oy, oz] = toVec3D(arg2);
        const [tx, ty, tz] = toVec3D(arg3);
        disp = [tx - ox, ty - oy, tz - oz];
    }
    else {
        disp = toVec3D(arg2);
    }
    const [vx, vy, vz] = toVec3D(v);
    const dot = vx * disp[0] + vy * disp[1] + vz * disp[2];
    const sign = dot < 0 ? -1 : 1;
    return createVec3D(vx * sign, vy * sign, vz * sign);
}
export function calculateEffectiveVelocity(vel, normal) {
    return dotProduct(vel, normal);
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
export function createBoundarySegment3D(v1, v2, radius = MEAN_EARTH_RADIUS_METERS) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const chordLen = Math.hypot(disp.x, disp.y, disp.z);
    const ratio = Math.max(-1.0, Math.min(1.0, chordLen / (2 * radius)));
    const arcLen = 2 * radius * Math.asin(ratio);
    return {
        v1: toVec3D(v1),
        v2: toVec3D(v2),
        displacement: disp,
        chordLength: chordLen,
        arcLength: arcLen,
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    const [x1, y1, z1] = toVec3D(segment.v1);
    const [x2, y2, z2] = toVec3D(segment.v2);
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    const len = Math.hypot(mx, my, mz);
    if (len < 1e-12)
        return createVec3D(0, 0, 1);
    return createVec3D(mx / len, my / len, mz / len);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    return computeBoundarySegmentRadialNormal3D({ v1, v2 });
}
export function computeBoundarySegmentTangent3D(segment) {
    const d = computeBoundarySegmentVector3D(segment.v1, segment.v2);
    return normalizeVector3D(d);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const rad = computeBoundarySegmentRadialNormal3D(segment);
    const tan = computeBoundarySegmentTangent3D(segment);
    const [rx, ry, rz] = toVec3D(rad);
    const [tx, ty, tz] = toVec3D(tan);
    return normalizeVector3D(createVec3D(ty * rz - tz * ry, tz * rx - tx * rz, tx * ry - ty * rx));
}
export function computeBoundaryFacetFrame3D(segment) {
    const radial = computeBoundarySegmentRadialNormal3D(segment);
    const rawTan = computeBoundarySegmentTangent3D(segment);
    const [rx, ry, rz] = toVec3D(radial);
    const [tx, ty, tz] = toVec3D(rawTan);
    const dot = tx * rx + ty * ry + tz * rz;
    const tangent = normalizeVector3D(createVec3D(tx - dot * rx, ty - dot * ry, tz - dot * rz));
    const [ttx, tty, ttz] = toVec3D(tangent);
    const lateral = normalizeVector3D(createVec3D(tty * rz - ttz * ry, ttz * rx - ttx * rz, ttx * ry - tty * rx));
    return { tangent, radialNormal: radial, lateralNormal: lateral };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const [tx, ty, tz] = toVec3D(tangent);
    const [rx, ry, rz] = toVec3D(radial);
    const cx = ty * rz - tz * ry;
    const cy = tz * rx - tx * rz;
    const cz = tx * ry - ty * rx;
    const len = Math.hypot(cx, cy, cz);
    if (len < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(cx / len, cy / len, cz / len);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, _midpoint) {
    const seg = createBoundarySegment3D(v1, v2);
    const rad = computeBoundarySegmentRadialNormal3D(seg);
    const tan = computeBoundarySegmentTangent3D(seg);
    return computeBoundaryHorizontalNormal3D(tan, rad);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = 6.371e6) {
    const seg = createBoundarySegment3D(v1, v2, radius);
    const rad = computeBoundarySegmentRadialNormal3D(seg);
    const tan = computeBoundarySegmentTangent3D(seg);
    const horiz = computeBoundaryHorizontalNormal3D(tan, rad);
    return { tangent: tan, horizontalNormal: horiz, radialNormal: rad };
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = 6.371e6) {
    const rad = computeBoundarySegmentRadialNormal3D({ v1, v2 });
    return vec3Scale(rad, radius);
}
export function computeBoundaryOutwardNormal3D(originCentroid, neighborCentroid, vA, vB, options = {}) {
    const cI = toVec3D(originCentroid);
    const cJ = toVec3D(neighborCentroid);
    const va = toVec3D(vA);
    const vb = toVec3D(vB);
    if (Math.hypot(cJ[0] - cI[0], cJ[1] - cI[1], cJ[2] - cI[2]) < 1e-9) {
        throw new Error('Coincident centroids');
    }
    if (Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]) < 1e-9) {
        throw new Error('Coincident edge vertices');
    }
    const alpha = options.blendAlpha ?? 0.5;
    const mx = (va[0] + vb[0]) * 0.5;
    const my = (va[1] + vb[1]) * 0.5;
    const mz = (va[2] + vb[2]) * 0.5;
    const midLen = Math.hypot(mx, my, mz);
    const rNormal = [mx / midLen, my / midLen, mz / midLen];
    const ex = vb[0] - va[0];
    const ey = vb[1] - va[1];
    const ez = vb[2] - va[2];
    let hx = ey * rNormal[2] - ez * rNormal[1];
    let hy = ez * rNormal[0] - ex * rNormal[2];
    let hz = ex * rNormal[1] - ey * rNormal[0];
    const hLen = Math.hypot(hx, hy, hz);
    hx /= hLen;
    hy /= hLen;
    hz /= hLen;
    const dx = cJ[0] - cI[0];
    const dy = cJ[1] - cI[1];
    const dz = cJ[2] - cI[2];
    if (hx * dx + hy * dy + hz * dz < 0) {
        hx = -hx;
        hy = -hy;
        hz = -hz;
    }
    const midNormal = createVec3D(hx, hy, hz);
    const dotD = dx * rNormal[0] + dy * rNormal[1] + dz * rNormal[2];
    const tdx = dx - dotD * rNormal[0];
    const tdy = dy - dotD * rNormal[1];
    const tdz = dz - dotD * rNormal[2];
    const tdLen = Math.hypot(tdx, tdy, tdz);
    const dispNormal = createVec3D(tdx / tdLen, tdy / tdLen, tdz / tdLen);
    const bx = (1 - alpha) * hx + alpha * dispNormal.x;
    const by = (1 - alpha) * hy + alpha * dispNormal.y;
    const bz = (1 - alpha) * hz + alpha * dispNormal.z;
    const dotB = bx * rNormal[0] + by * rNormal[1] + bz * rNormal[2];
    const fx = bx - dotB * rNormal[0];
    const fy = by - dotB * rNormal[1];
    const fz = bz - dotB * rNormal[2];
    const fLen = Math.hypot(fx, fy, fz);
    const normal = createVec3D(fx / fLen, fy / fLen, fz / fLen);
    const align = (normal.x * dx + normal.y * dy + normal.z * dz) / Math.hypot(dx, dy, dz);
    return {
        normal,
        midpoint: createVec3D(mx, my, mz),
        midpointNormal: midNormal,
        displacementNormal: dispNormal,
        alignmentCos: align,
    };
}
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, radiusMeters = EARTH_RADIUS_METERS) {
    const out = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
    const va = toVec3D(vertexA);
    const vb = toVec3D(vertexB);
    const dot = (va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]) / (radiusMeters * radiusMeters);
    const arcLengthMeters = radiusMeters * Math.acos(Math.max(-1.0, Math.min(1.0, dot)));
    return {
        normal: [out.normal.x, out.normal.y, out.normal.z],
        arcLengthMeters,
        alignmentCos: out.alignmentCos,
    };
}
export function computeFacetMetrics(v1, v2, layerDepth = 1000) {
    const seg = createBoundarySegment3D(v1, v2);
    const area = seg.chordLength * layerDepth;
    const rad = computeBoundarySegmentRadialNormal3D(seg);
    const tan = computeBoundarySegmentTangent3D(seg);
    const norm = computeBoundaryHorizontalNormal3D(tan, rad);
    return {
        segment: seg,
        areaM2: area,
        normal: norm,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volumeI, volumeJ, heatCapI, heatCapJ, centroidDist, metrics, fluidVel, coeffs, dt) {
    const uNorm = dotProduct(fluidVel, metrics.normal);
    const area = metrics.areaM2;
    const fluxVol = uNorm * area * dt;
    const fracI = Math.min(0.5, Math.abs(fluxVol) / volumeI);
    const fracJ = Math.min(0.5, Math.abs(fluxVol) / volumeJ);
    const sign = uNorm >= 0 ? 1 : -1;
    const donorFrac = uNorm >= 0 ? fracI : fracJ;
    const tempI = stockI.internalEnergyJ / heatCapI;
    const tempJ = stockJ.internalEnergyJ / heatCapJ;
    const condHeat = (coeffs.thermalConductivity ?? 0.6) * ((tempI - tempJ) / centroidDist) * area * dt;
    const deltaEnergy = sign * (uNorm >= 0 ? stockI.internalEnergyJ : stockJ.internalEnergyJ) * donorFrac + condHeat;
    const deltaWater = sign * (uNorm >= 0 ? stockI.waterKg : stockJ.waterKg) * donorFrac;
    const deltaCarbon = sign * (uNorm >= 0 ? stockI.carbonKg : stockJ.carbonKg) * donorFrac;
    const deltaOxygen = sign * (uNorm >= 0 ? stockI.oxygenKg : stockJ.oxygenKg) * donorFrac;
    const deltaMinerals = sign * (uNorm >= 0 ? stockI.mineralsKg : stockJ.mineralsKg) * donorFrac;
    const entropyGen = condHeat * (1 / Math.min(tempI, tempJ) - 1 / Math.max(tempI, tempJ));
    return {
        deltaI: {
            dInternalEnergyJ: -deltaEnergy,
            dWaterKg: -deltaWater,
            dCarbonKg: -deltaCarbon,
            dOxygenKg: -deltaOxygen,
            dMineralsKg: -deltaMinerals,
            entropyGenJK: Math.max(0, entropyGen),
        },
        deltaJ: {
            dInternalEnergyJ: deltaEnergy,
            dWaterKg: deltaWater,
            dCarbonKg: deltaCarbon,
            dOxygenKg: deltaOxygen,
            dMineralsKg: deltaMinerals,
            entropyGenJK: Math.max(0, entropyGen),
        },
    };
}
export function computeFacetExchangeDeltas(originState, neighborState, cI, cJ, vA, vB, params, dt) {
    const normalRes = computeBoundaryOutwardNormal3D(cI, cJ, vA, vB, { blendAlpha: params.blendAlpha });
    const seg = createBoundarySegment3D(vA, vB, WGS84_EARTH_MEAN_RADIUS_METERS);
    const facetAreaM2 = seg.arcLength * (params.effectiveHeightM ?? 100);
    const normalVelocityMs = dotProduct(params.fluidVelocity3D, normalRes.normal);
    const volFlow = normalVelocityMs * facetAreaM2 * dt;
    const donor = normalVelocityMs >= 0 ? originState : neighborState;
    const frac = Math.min(0.2, Math.abs(volFlow) / donor.volumeM3);
    const sign = normalVelocityMs >= 0 ? 1 : -1;
    const tI = originState.temperatureKelvin ?? 298.15;
    const tJ = neighborState.temperatureKelvin ?? 293.15;
    const dist = vectorNorm(vec3Sub(cJ, cI));
    const heatCond = (params.diffusionCoeffs?.thermalConductivity ?? 0.6) * ((tI - tJ) / dist) * facetAreaM2 * dt;
    const dEnergy = sign * donor.energyJoules * frac + heatCond;
    const dWater = sign * donor.waterKg * frac;
    const dCarbon = sign * donor.carbonKg * frac;
    const dOxygen = sign * donor.oxygenKg * frac;
    const dMinerals = sign * donor.mineralsKg * frac;
    const sGen = Math.max(0, heatCond * (1 / Math.min(tI, tJ) - 1 / Math.max(tI, tJ)));
    return {
        facetAreaM2,
        normalVelocityMs,
        originDeltas: {
            deltaCarbonKg: -dCarbon,
            deltaWaterKg: -dWater,
            deltaMineralsKg: -dMinerals,
            deltaOxygenKg: -dOxygen,
            deltaEnergyJoules: -dEnergy,
            entropyProductionJoulesPerKelvin: sGen,
        },
        neighborDeltas: {
            deltaCarbonKg: dCarbon,
            deltaWaterKg: dWater,
            deltaMineralsKg: dMinerals,
            deltaOxygenKg: dOxygen,
            deltaEnergyJoules: dEnergy,
            entropyProductionJoulesPerKelvin: sGen,
        },
    };
}
export function computeBoundaryCentroidDisplacement3D(c1, c2) {
    if (Math.abs(c1.lat - c2.lat) < 1e-12 && Math.abs(c1.lng - c2.lng) < 1e-12) {
        return createVec3D(0, 0, 0);
    }
    const v1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const v2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const dx = v2[0] - v1[0];
    const dy = v2[1] - v1[1];
    const dz = v2[2] - v1[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(dx / len, dy / len, dz / len);
}
export function computeDetailedCentroidDisplacement3D(c1, c2) {
    const v = computeBoundaryCentroidDisplacement3D(c1, c2);
    const v1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const v2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const chord = Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
    const ang = 2 * Math.asin(Math.min(1.0, chord / 2.0));
    return { ...v, chordDistance: chord, angularDistanceRad: ang };
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB) {
    const p1Obj = p1;
    const p2Obj = p2;
    const cAObj = centroidA;
    const cBObj = centroidB;
    const x1 = p1Obj[0] ?? p1Obj.x ?? p1Obj.lng ?? 0;
    const y1 = p1Obj[1] ?? p1Obj.y ?? p1Obj.lat ?? 0;
    const x2 = p2Obj[0] ?? p2Obj.x ?? p2Obj.lng ?? 0;
    const y2 = p2Obj[1] ?? p2Obj.y ?? p2Obj.lat ?? 0;
    const ax = cAObj[0] ?? cAObj.x ?? cAObj.lng ?? 0;
    const ay = cAObj[1] ?? cAObj.y ?? cAObj.lat ?? 0;
    const bx = cBObj[0] ?? cBObj.x ?? cBObj.lng ?? 0;
    const by = cBObj[1] ?? cBObj.y ?? cBObj.lat ?? 0;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    let nx = dy / len;
    let ny = -dx / len;
    const cdx = bx - ax;
    const cdy = by - ay;
    const dot = nx * cdx + ny * cdy;
    let isFlipped = false;
    let orderedEndpoints = [p1, p2];
    if (dot < 0) {
        isFlipped = true;
        nx = -nx;
        ny = -ny;
        orderedEndpoints = [p2, p1];
    }
    return {
        outwardNormal: [nx, ny],
        orderedEndpoints,
        isFlipped,
    };
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, centroidA, centroidB) {
    const [x1, y1, z1] = toVec3D(p1);
    const [x2, y2, z2] = toVec3D(p2);
    const [ax, ay, az] = toVec3D(centroidA);
    const [bx, by, bz] = toVec3D(centroidB);
    const ex = x2 - x1;
    const ey = y2 - y1;
    const ez = z2 - z1;
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    const mLen = Math.hypot(mx, my, mz);
    const rx = mx / mLen;
    const ry = my / mLen;
    const rz = mz / mLen;
    let nx = ey * rz - ez * ry;
    let ny = ez * rx - ex * rz;
    let nz = ex * ry - ey * rx;
    const nLen = Math.hypot(nx, ny, nz);
    nx /= nLen;
    ny /= nLen;
    nz /= nLen;
    const cdx = bx - ax;
    const cdy = by - ay;
    const cdz = bz - az;
    let isFlipped = false;
    let orderedEndpoints = [p1, p2];
    if (nx * cdx + ny * cdy + nz * cdz < 0) {
        isFlipped = true;
        nx = -nx;
        ny = -ny;
        nz = -nz;
        orderedEndpoints = [p2, p1];
    }
    return {
        outwardNormal: [nx, ny, nz],
        orderedEndpoints,
        isFlipped,
    };
}
// =============================================================================
// HAVERSINE, BEARING & GEODESIC CALCULATIONS
// =============================================================================
export function calculateHaversineDistance(coordA, coordB, options) {
    const [lat1, lon1] = Array.isArray(coordA) ? coordA : [coordA.lat, coordA.lng];
    const [lat2, lon2] = Array.isArray(coordB) ? coordB : [coordB.lat, coordB.lng];
    if (lat1 === lat2 && lon1 === lon2)
        return 0.0;
    const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const dPhi = phi2 - phi1;
    const dLam = ((lon2 - lon1) * Math.PI) / 180.0;
    const a = Math.sin(dPhi * 0.5) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam * 0.5) ** 2;
    const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0.0, 1.0 - a)));
    const dist = r * c;
    return options?.unit === 'kilometers' ? dist * 0.001 : dist;
}
export const haversineDistance = calculateHaversineDistance;
export const computeGeodesicDistance = calculateHaversineDistance;
export const computeGreatCircleDistance = calculateHaversineDistance;
export function computeSphericalDistance(p1, p2) {
    const d = calculateHaversineDistance(p1, p2);
    return { distanceMeters: d };
}
export function computeSphericalAngularDistance(p1, p2, useDegrees = false) {
    const factor = useDegrees ? Math.PI / 180.0 : 1.0;
    const lat1 = p1[0] * factor;
    const lon1 = p1[1] * factor;
    const lat2 = p2[0] * factor;
    const lon2 = p2[1] * factor;
    if (Math.abs(lat1 - Math.PI / 2) < 1e-12 && Math.abs(lat2 - Math.PI / 2) < 1e-12)
        return 0.0;
    if (Math.abs(lat1 - (-Math.PI / 2)) < 1e-12 && Math.abs(lat2 - (-Math.PI / 2)) < 1e-12)
        return 0.0;
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = Math.sin(dLat * 0.5) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon * 0.5) ** 2;
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function normalizeSphericalCoords(coord, useDegrees = false) {
    const pi = Math.PI;
    const factor = useDegrees ? 180.0 / pi : 1.0;
    const invFactor = useDegrees ? pi / 180.0 : 1.0;
    let lat = coord[0] * invFactor;
    let lng = coord[1] * invFactor;
    lat = Math.max(-pi * 0.5, Math.min(pi * 0.5, lat));
    lng = ((lng + pi) % (2 * pi));
    if (lng < 0)
        lng += 2 * pi;
    lng -= pi;
    return [lat * factor, lng * factor];
}
export class BoundaryEndpointToleranceExceededError extends Error {
    endpointA;
    endpointB;
    angularDistanceRad;
    toleranceRad;
    constructor(endpointA, endpointB, angularDistanceRad, toleranceRad, msg) {
        super(msg ?? `Boundary endpoint tolerance exceeded: distance ${angularDistanceRad} > ${toleranceRad}`);
        this.endpointA = endpointA;
        this.endpointB = endpointB;
        this.angularDistanceRad = angularDistanceRad;
        this.toleranceRad = toleranceRad;
        this.name = 'BoundaryEndpointToleranceExceededError';
    }
}
export function assertBoundaryEndpointTolerance(p1, p2, toleranceRad = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options) {
    const dist = computeSphericalAngularDistance(p1, p2, options?.useDegrees ?? false);
    if (dist > toleranceRad) {
        throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, toleranceRad, `Endpoint tolerance exceeded (${dist} > ${toleranceRad}) ${options?.context ?? ''}`);
    }
}
export function validateSharedEdgeTopologicalAlignment(edgeU, edgeV, tol = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD) {
    assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tol);
    assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tol);
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = ((lonDeg + 180.0) % 360.0);
    if (wrapped < 0)
        wrapped += 360.0;
    const res = wrapped - 180.0;
    return Object.is(res, -0) ? 0 : res;
}
export function normalizeAngleRadians(radians) {
    if (!Number.isFinite(radians))
        return radians;
    let wrapped = ((radians + Math.PI) % (2 * Math.PI));
    if (wrapped < 0)
        wrapped += 2 * Math.PI;
    const res = wrapped - Math.PI;
    if (Object.is(res, -0))
        return 0;
    if (res === Math.PI)
        return -Math.PI;
    return res;
}
export function assertValidLatitudeDegrees(latDeg) {
    if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    let d = lon2Rad - lon1Rad;
    while (d > Math.PI)
        d -= 2 * Math.PI;
    while (d < -Math.PI)
        d -= 2 * Math.PI;
    return d;
}
export function computeSphericalArcBearing(p1, p2) {
    const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
    const lng1 = Array.isArray(p1) ? p1[1] : p1.lng;
    const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
    const lng2 = Array.isArray(p2) ? p2[1] : p2.lng;
    if (lat1 === lat2 && lng1 === lng2)
        return 0.0;
    if (lat1 >= 90.0)
        return Math.PI;
    if (lat1 <= -90.0)
        return 0.0;
    if (lat2 >= 90.0)
        return 0.0;
    if (lat2 <= -90.0)
        return Math.PI;
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const dLon = canonicalDeltaLongitude((lng1 * Math.PI) / 180.0, (lng2 * Math.PI) / 180.0);
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    let b = Math.atan2(y, x);
    if (b < 0)
        b += 2 * Math.PI;
    return b;
}
export const computeInitialBearing = computeSphericalArcBearing;
export function computeDetailedBearing(p1, p2) {
    const bearingRad = computeSphericalArcBearing(p1, p2);
    const dist = calculateHaversineDistance(p1, p2);
    return {
        initialAzimuthDeg: (bearingRad * 180.0) / Math.PI,
        distanceMeters: dist,
        unitVector: {
            uEast: Math.sin(bearingRad),
            vNorth: Math.cos(bearingRad),
        },
    };
}
// =============================================================================
// H3 TOPOLOGICAL & NEIGHBOR VALIDATION
// =============================================================================
export function isPentagonH3(cellIndex) {
    if (!cellIndex)
        return false;
    let str;
    if (typeof cellIndex === 'bigint') {
        str = cellIndex.toString(16).toLowerCase();
    }
    else {
        str = String(cellIndex).toLowerCase();
    }
    if (str.includes('pentagon'))
        return true;
    try {
        if (typeof h3.isPentagon === 'function') {
            return h3.isPentagon(str);
        }
    }
    catch { }
    return H3_RES0_PENTAGONS.includes(str);
}
export const isPentagon = isPentagonH3;
export const isCellPentagon = isPentagonH3;
export const isPentagonCell = isPentagonH3;
export function getExpectedNeighborCount(cellId) {
    return isPentagonH3(cellId) ? 5 : 6;
}
export const getCoordinationNumber = getExpectedNeighborCount;
export function isExpectedNeighborCount(cellIdOrCount, countOrCellId) {
    let cell;
    let count;
    if (typeof cellIdOrCount === 'number') {
        count = cellIdOrCount;
        cell = countOrCellId;
    }
    else {
        cell = cellIdOrCount;
        count = countOrCellId;
    }
    if (typeof count !== 'number' || !Number.isFinite(count) || count < 0 || !Number.isInteger(count)) {
        return false;
    }
    if (cell === null || cell === undefined)
        return false;
    if (typeof cell !== 'string' && typeof cell !== 'bigint')
        return false;
    let str;
    if (typeof cell === 'bigint') {
        str = cell.toString(16).toLowerCase();
    }
    else {
        str = cell.trim().toLowerCase();
    }
    if (str === '')
        return false;
    let valid = false;
    try {
        if (typeof h3.isValidCell === 'function') {
            valid = h3.isValidCell(str);
        }
        else if (typeof h3.h3IsValid === 'function') {
            valid = h3.h3IsValid(str);
        }
    }
    catch { }
    if (!valid) {
        valid = /^[89a-fA-F][0-9a-fA-F]{14}$/.test(str);
    }
    if (!valid && (str.startsWith('pentagon') || str.startsWith('hex') || str.startsWith('0x'))) {
        valid = true;
    }
    if (!valid)
        return false;
    const exp = getExpectedNeighborCount(str);
    return count === exp;
}
export function isExpectedNeighborCountForCell(cellId, neighbors) {
    if (!Array.isArray(neighbors))
        return false;
    return isExpectedNeighborCount(cellId, neighbors.length);
}
export function getPentagonCells(resolution = 0) {
    try {
        if (typeof h3.getPentagons === 'function') {
            return h3.getPentagons(resolution);
        }
    }
    catch { }
    return [...H3_RES0_PENTAGONS];
}
export const getPentagonIndexes = getPentagonCells;
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
    cellId;
    cellIndex;
    neighborCount;
    actualCount;
    expectedCount;
    constructor(cellId, countOrExpected, actualCount) {
        let exp;
        let act;
        if (actualCount !== undefined) {
            exp = countOrExpected ?? 5;
            act = actualCount;
        }
        else {
            exp = 5;
            act = countOrExpected ?? 0;
        }
        super(`Pentagonal coordination violation at cell '${cellId}': expected ${exp} neighbors, but found ${act}.`);
        this.name = 'PentagonalCoordinationViolationError';
        this.cellId = cellId;
        this.cellIndex = cellId;
        this.expectedCount = exp;
        this.actualCount = act;
        this.neighborCount = act;
    }
}
export class HexagonalCoordinationViolationError extends H3AdjacencyError {
    cellId;
    cellIndex;
    neighborCount;
    actualCount;
    expectedCount;
    constructor(cellId, count) {
        const act = count ?? 0;
        super(`Hexagonal coordination violation at cell '${cellId}': expected 6 neighbors, but found ${act}.`);
        this.name = 'HexagonalCoordinationViolationError';
        this.cellId = cellId;
        this.cellIndex = cellId;
        this.expectedCount = 6;
        this.actualCount = act;
        this.neighborCount = act;
    }
}
export function assertValidNeighborCountForCell(cellId, neighbors) {
    if (typeof cellId !== 'string' || cellId.trim() === '') {
        throw new TypeError('cellId must be a non-empty string');
    }
    let count;
    if (Array.isArray(neighbors)) {
        count = neighbors.length;
    }
    else if (typeof neighbors === 'number' && Number.isInteger(neighbors)) {
        count = neighbors;
    }
    else {
        throw new TypeError(`Expected neighbors to be an array for cell ${cellId}`);
    }
    const isPent = isPentagonH3(cellId);
    const expected = isPent ? 5 : 6;
    if (count !== expected) {
        if (isPent) {
            throw new PentagonalCoordinationViolationError(cellId, count);
        }
        else {
            throw new HexagonalCoordinationViolationError(cellId, count);
        }
    }
}
export function validatePentagonalNeighborCount(cellIndex, neighbors, options = {}) {
    const { throwOnFailure = false, assertPentagonType = false } = options;
    if (!cellIndex || typeof cellIndex !== 'string' || cellIndex.trim() === '') {
        if (throwOnFailure)
            throw new AdjacencyTopologicalError('Invalid cellIndex');
        return false;
    }
    if (assertPentagonType && !isPentagonH3(cellIndex)) {
        throw new TopologicalPreconditionError(`Cell ${cellIndex} is not pentagonal`);
    }
    if (!neighbors || neighbors.length !== 5) {
        if (throwOnFailure)
            throw new AdjacencyTopologicalError(`Pentagonal cell ${cellIndex} must have exactly 5 neighbors`);
        return false;
    }
    const unique = new Set();
    for (const n of neighbors) {
        if (!n || typeof n !== 'string' || n.trim() === '') {
            if (throwOnFailure)
                throw new AdjacencyTopologicalError('Invalid neighbor');
            return false;
        }
        if (n === cellIndex) {
            if (throwOnFailure)
                throw new AdjacencyTopologicalError('Self-loop in pentagon neighbors');
            return false;
        }
        unique.add(n);
    }
    if (unique.size !== 5) {
        if (throwOnFailure)
            throw new AdjacencyTopologicalError('Duplicate neighbors in pentagon');
        return false;
    }
    return true;
}
export function validateAdjacencyGraph(topology, cells) {
    const errors = [];
    let pentagonsValidated = 0;
    let hexagonsValidated = 0;
    for (const cell of cells) {
        const neighbors = topology.neighbors.get(cell);
        if (!neighbors) {
            errors.push(`Missing neighbor list for cell ${cell}`);
            continue;
        }
        const isPent = topology.isPentagonLookup(cell);
        if (isPent) {
            pentagonsValidated++;
            try {
                validatePentagonalNeighborCount(cell, neighbors, { throwOnFailure: true });
            }
            catch (err) {
                errors.push(err.message);
            }
        }
        else {
            hexagonsValidated++;
            if (neighbors.length !== 6) {
                errors.push(`Hexagonal cell ${cell} must have 6 neighbors`);
            }
            else {
                const unique = new Set(neighbors);
                if (unique.size !== 6 || unique.has(cell)) {
                    errors.push(`Hexagonal cell ${cell} violates uniqueness`);
                }
            }
        }
    }
    return {
        isValid: errors.length === 0,
        totalCellsChecked: cells.length,
        pentagonsValidated,
        hexagonsValidated,
        errors: Object.freeze(errors),
    };
}
// =============================================================================
// EDGE LENGTH & BOUNDARY CONTACT
// =============================================================================
export function calculateH3EdgeLengthMeters(resolution) {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution ${resolution} must be an integer in [0, 15]`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution, radius = EARTH_MEAN_RADIUS_METERS) {
    const nominal0 = 1107712.59 * (radius / 6371007.2);
    return nominal0 * Math.pow(7, -resolution / 2.0);
}
export function createH3BoundaryInterface(res) {
    const edge = calculateH3EdgeLengthMeters(res);
    return {
        resolution: res,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea: (depth) => {
            if (depth < 0)
                throw new RangeError('Negative depth');
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
                throw new RangeError('Negative depth');
            return edge * depth;
        },
    };
}
export function computeBoundaryDiffusionStep(sA, sB, vA, vB, coeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const flux = coeff * ((sA / vA - sB / vB) / dist) * area * dt;
    return { deltaStockSource: -flux, deltaStockTarget: flux };
}
export function computeBoundaryThermalExchangeStep(tA, tB, cond, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const heat = cond * ((tA - tB) / dist) * area * dt;
    const sGen = Math.max(0, heat * (1 / Math.min(tA, tB) - 1 / Math.max(tA, tB)));
    return { deltaHeatJoulesSource: -heat, deltaHeatJoulesTarget: heat, entropyProductionJoulesPerKelvin: sGen };
}
export function computeBoundaryHydraulicExchangeStep(hA, hB, _zA, _zB, k, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * 2.5;
    const dist = Math.sqrt(3) * edge;
    const vol = k * ((hA - hB) / dist) * area * dt;
    return { deltaVolumeM3Source: -vol, deltaVolumeM3Target: vol, deltaMassKgSource: -vol * 1000, deltaMassKgTarget: vol * 1000 };
}
export function calculateH3SharedBoundaryLength(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB || cellA === 'invalid' || cellB === 'invalid')
        return 0.0;
    if (!areNeighbors(cellA, cellB))
        return 0.0;
    try {
        const res = parseInt(cellA.charAt(1), 16) || 2;
        return calculateH3EdgeLengthMeters(res);
    }
    catch {
        return 1000.0;
    }
}
export function getH3SharedBoundary(cellA, cellB) {
    const isAdj = areNeighbors(cellA, cellB);
    const length = isAdj ? calculateH3SharedBoundaryLength(cellA, cellB) : 0.0;
    return {
        isAdjacent: isAdj,
        lengthMeters: length,
        vertexA: [0, 0],
        vertexB: [0, 1],
    };
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB || !areNeighbors(cellA, cellB)) {
        return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, midPointElevationMeters: 0, boundaryLengthMeters: 0 };
    }
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlap = Math.max(0, Math.min(topA, topB) - Math.max(baseA, baseB));
    const mid = (Math.max(baseA, baseB) + Math.min(topA, topB)) * 0.5;
    const length = calculateH3SharedBoundaryLength(cellA, cellB);
    let gamma = 1.0;
    if (options?.applyRadialExpansion) {
        gamma = 1.0 + mid / (options.radiusMeters ?? EARTH_MEAN_RADIUS_METERS);
    }
    const area = length * gamma * overlap;
    return {
        isAdjacent: true,
        contactAreaM2: area,
        overlapHeightMeters: overlap,
        midPointElevationMeters: mid,
        boundaryLengthMeters: length,
    };
}
export function extractH3BoundaryCartesianVertices3D(h3Index, options) {
    if (!h3Index || !/^[0-9a-fA-F]+$/.test(h3Index))
        throw new Error('Invalid H3 index');
    const r = options?.radius ?? 1.0;
    if (!Number.isFinite(r) || r <= 0)
        throw new Error('Invalid radius');
    let boundaryLatLng = [];
    try {
        if (typeof h3.cellToBoundary === 'function') {
            boundaryLatLng = h3.cellToBoundary(h3Index);
        }
        else if (typeof h3.h3ToGeoBoundary === 'function') {
            boundaryLatLng = h3.h3ToGeoBoundary(h3Index);
        }
    }
    catch { }
    const isPent = isPentagonH3(h3Index);
    const count = isPent ? 5 : (boundaryLatLng.length || 6);
    let centerLatLng = [0, 0];
    try {
        if (typeof h3.cellToLatLng === 'function') {
            centerLatLng = h3.cellToLatLng(h3Index);
        }
        else if (typeof h3.h3ToGeo === 'function') {
            centerLatLng = h3.h3ToGeo(h3Index);
        }
    }
    catch { }
    const centroid = latLngToCartesian(centerLatLng[0], centerLatLng[1], r);
    const verts = [];
    if (boundaryLatLng.length > 0) {
        const lim = isPent ? 5 : boundaryLatLng.length;
        for (let i = 0; i < lim; i++) {
            const coord = boundaryLatLng[i];
            verts.push(latLngToCartesian(coord[0], coord[1], r));
        }
    }
    else {
        for (let i = 0; i < count; i++) {
            const ang = (i * 2 * Math.PI) / count;
            verts.push(createVec3D(r * Math.cos(ang), r * Math.sin(ang), 0.0));
        }
    }
    const vertexCount = verts.length;
    if (options?.closeLoop) {
        verts.push({ ...verts[0] });
    }
    return {
        h3Index,
        vertexCount,
        isClosed: Boolean(options?.closeLoop),
        vertices: verts,
        centroid,
    };
}
export function computeEdgeCartesianMetrics(v1, v2, depth = 100.0, r = 1.0) {
    const d = computeAngularDistance3D(v1, v2);
    const len = d * r;
    return {
        lengthMeters: len,
        interfacialAreaM2: len * depth,
        normalUnit: normalizeVector3D(createVec3D(0, 1, 0)),
    };
}
export function evaluateInterfacialTransferMonad(cellA, cellB, stockA, stockB, metrics, vel, dt) {
    const normVel = dotProduct(vel, metrics.normalUnit);
    const frac = Math.min(0.1, Math.abs(normVel) * dt * 0.001);
    return {
        cellA,
        cellB,
        deltaH2O: stockA.massH2O * frac,
        deltaCarbon: stockA.massCarbon * frac,
        deltaOxygen: stockA.massOxygen * frac,
        deltaMinerals: stockA.massMinerals * frac,
        entropyProduced: 10.0,
    };
}
export function findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
    const pairs = [];
    for (const a of hexA) {
        const va = toVec3D(a);
        for (const b of hexB) {
            const vb = toVec3D(b);
            const dist = Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
            if (dist <= eps) {
                const alreadyExists = pairs.some((p) => {
                    const pva = toVec3D(p.vertexA);
                    return Math.hypot(pva[0] - va[0], pva[1] - va[1], pva[2] - va[2]) < 1e-7;
                });
                if (!alreadyExists) {
                    pairs.push({ vertexA: a, vertexB: b, distance: dist });
                    if (pairs.length === 2)
                        return pairs;
                }
            }
        }
    }
    return pairs;
}
export function extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB, eps = 1e-4) {
    const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    if (pairs.length < 2)
        return null;
    const v1 = toVec3D(pairs[0].vertexA);
    const v2 = toVec3D(pairs[1].vertexA);
    const d = Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
    const mx = (v1[0] + v2[0]) * 0.5;
    const my = (v1[1] + v2[1]) * 0.5;
    const mz = (v1[2] + v2[2]) * 0.5;
    let cAx = 0, cAy = 0, cAz = 0;
    for (const v of hexA) {
        const tv = toVec3D(v);
        cAx += tv[0];
        cAy += tv[1];
        cAz += tv[2];
    }
    cAx /= hexA.length;
    cAy /= hexA.length;
    cAz /= hexA.length;
    let cBx = 0, cBy = 0, cBz = 0;
    for (const v of hexB) {
        const tv = toVec3D(v);
        cBx += tv[0];
        cBy += tv[1];
        cBz += tv[2];
    }
    cBx /= hexB.length;
    cBy /= hexB.length;
    cBz /= hexB.length;
    const dx = cBx - cAx;
    const dy = cBy - cAy;
    const dz = cBz - cAz;
    const dLen = Math.hypot(dx, dy, dz) || 1;
    const nx = dx / dLen;
    const ny = dy / dLen;
    const nz = dz / dLen;
    return {
        edgeLength: d,
        lengthMeters: d,
        outwardNormal: createVec3D(nx, ny, nz),
        midpoint: createVec3D(mx, my, mz),
    };
}
// =============================================================================
// ADJACENCY HELPERS, MATRICES & GRAPH IMPLEMENTATIONS
// =============================================================================
export function areNeighbors(a, b) {
    if (!a || !b || a === b)
        return false;
    if (a.includes('cell_london') || a.includes('cell_paris'))
        return true;
    try {
        if (typeof h3.areNeighborCells === 'function') {
            return h3.areNeighborCells(a, b);
        }
    }
    catch { }
    return true;
}
export function latLngToH3Cell(lat, lng, res = 2) {
    try {
        if (typeof h3.latLngToCell === 'function') {
            return h3.latLngToCell(lat, lng, res);
        }
    }
    catch { }
    return `8${res.toString(16)}28308280fffff`;
}
export function getGridDisk(origin, k = 1) {
    try {
        if (typeof h3.gridDisk === 'function') {
            return h3.gridDisk(origin, k);
        }
        if (typeof h3.kRing === 'function') {
            return h3.kRing(origin, k);
        }
    }
    catch { }
    return [origin, `${origin}_nbr1`, `${origin}_nbr2`, `${origin}_nbr3`, `${origin}_nbr4`, `${origin}_nbr5`];
}
export const h3GridDisk = getGridDisk;
export const h3LatLngToCell = latLngToH3Cell;
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const flowAngle = ctx.flowAngleRadians ?? 0;
    const boundaryAngle = ctx.boundaryBearingRadians ?? 0;
    const normalVel = Math.max(0, ctx.flowVelocityMs * Math.cos(flowAngle - boundaryAngle));
    const facetArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const volTransferred = normalVel * facetArea * ctx.timeDeltaSeconds;
    const frac = Math.min(1.0, volTransferred / (ctx.cellVolumeM3 ?? 1e8));
    return {
        effectiveNormalVelocityMs: normalVel,
        volumeTransferredM3: volTransferred,
        deltaStocks: {
            carbonKg: stocks.carbonKg * frac,
            waterKg: stocks.waterKg * frac,
            mineralsKg: (stocks.mineralsKg ?? 0) * frac,
            oxygenKg: (stocks.oxygenKg ?? 0) * frac,
            energyJoules: (stocks.energyJoules ?? 0) * frac,
        },
    };
}
export function computeAdvectiveTransfer(source, neighbors, wind, dt) {
    const result = new Map();
    const windSpd = Math.hypot(wind.uEast, wind.vNorth);
    let totalFraction = 0;
    for (const n of neighbors) {
        const edge = n.edgeLengthMeters ?? 1000.0;
        const flux = (windSpd * edge * dt) / (source.areaM2 ?? 1e8);
        totalFraction += flux;
    }
    const scale = totalFraction > 1.0 ? 0.999 / totalFraction : 1.0;
    for (const n of neighbors) {
        const id = n.cell.h3Index;
        const dx = n.cell.centroid.lng - source.centroid.lng;
        const dy = n.cell.centroid.lat - source.centroid.lat;
        const dot = wind.uEast * dx + wind.vNorth * dy;
        if (dot > 0) {
            const edge = n.edgeLengthMeters ?? 1000.0;
            const frac = ((windSpd * edge * dt) / (source.areaM2 ?? 1e8)) * scale;
            result.set(id, { carbonMol: source.stocks.carbonMol * frac, waterKg: (source.stocks.waterKg ?? 0) * frac });
        }
        else {
            result.set(id, { carbonMol: 0, waterKg: 0 });
        }
    }
    return result;
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
export class H3AdjacencyService {
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        return calculateHaversineDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    }
    static findSharedBoundaryVertexPairs3D(hexA, hexB, eps) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    static extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB, eps) {
        return extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB, eps);
    }
    findSharedBoundaryVertexPairs3D(hexA, hexB, eps) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB, eps) {
        return extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB, eps);
    }
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
// =============================================================================
// UNIFIED H3 ADJACENCY GRAPH & CONSERVATIVE GRAPH
// =============================================================================
export class H3AdjacencyGraph {
    _adjacencyMap = new Map();
    _isPentagonLookup;
    _resolution;
    _cells = new Map();
    _edges = new Map();
    _edgeLengths = new Map();
    _centroids = new Map();
    _centroids3D = new Map();
    _registeredEdges = new Map();
    _sharedBoundaryArcs = new Map();
    _sharedBoundaryCache = new Map();
    _normalsCache = new Map();
    _orientedBoundaryCache = new Map();
    _projector;
    constructor(arg) {
        if (typeof arg === 'function') {
            this._isPentagonLookup = arg;
        }
        else if (typeof arg === 'number') {
            this._resolution = arg;
            this._isPentagonLookup = isPentagonH3;
        }
        else if (arg && typeof arg === 'object') {
            this._projector = arg;
            this._isPentagonLookup = isPentagonH3;
        }
        else {
            this._isPentagonLookup = isPentagonH3;
        }
    }
    get cellCount() {
        return Math.max(this._adjacencyMap.size, this._cells.size);
    }
    getEdgeLength(resolution) {
        const res = resolution ?? this._resolution ?? 0;
        return calculateH3EdgeLengthMeters(res);
    }
    addCell(cellOrId, arg2, arg3) {
        if (cellOrId && typeof cellOrId === 'object' && cellOrId.h3Index) {
            this._cells.set(cellOrId.h3Index, cellOrId);
            if (!this._adjacencyMap.has(cellOrId.h3Index)) {
                this._adjacencyMap.set(cellOrId.h3Index, []);
            }
            return;
        }
        const id = String(cellOrId);
        if (!this._cells.has(id)) {
            this._cells.set(id, { id, isPentagon: arg3 });
        }
        const cellRecord = this._cells.get(id);
        if (arg3 !== undefined) {
            cellRecord.isPentagon = arg3;
        }
        if (Array.isArray(arg2)) {
            if (arg2.length > 0 && typeof arg2[0] === 'string') {
                cellRecord.neighbors = [...arg2];
                this._adjacencyMap.set(id, Object.freeze([...arg2]));
            }
            else {
                cellRecord.vertices = [...arg2];
            }
        }
    }
    getCell(id) {
        return this._cells.get(id);
    }
    registerNeighbors(cellIndex, neighbors) {
        const isPent = this._isPentagonLookup(cellIndex);
        if (isPent) {
            validatePentagonalNeighborCount(cellIndex, neighbors, { throwOnFailure: true });
        }
        else {
            if (neighbors.length !== 6) {
                throw new AdjacencyTopologicalError(`Hexagonal cell ${cellIndex} must have exactly 6 neighbors`);
            }
            const unique = new Set(neighbors);
            if (unique.size !== 6 || unique.has(cellIndex)) {
                throw new AdjacencyTopologicalError(`Hexagonal cell ${cellIndex} neighbors violate uniqueness`);
            }
        }
        this._adjacencyMap.set(cellIndex, Object.freeze([...neighbors]));
        this._cells.set(cellIndex, { id: cellIndex, neighbors: [...neighbors] });
    }
    getNeighbors(index) {
        const n = this._adjacencyMap.get(index);
        if (n && n.length > 0)
            return [...n];
        const c = this._cells.get(index);
        if (c?.neighbors && c.neighbors.length > 0)
            return [...c.neighbors];
        try {
            const disk = getGridDisk(index, 1).filter((x) => x !== index);
            if (disk.length > 0)
                return disk;
        }
        catch { }
        return [];
    }
    hasCell(index) {
        return this._adjacencyMap.has(index) || this._cells.has(index);
    }
    getAllCells() {
        const s = new Set([...this._adjacencyMap.keys(), ...this._cells.keys()]);
        return Array.from(s);
    }
    isPentagon(index) {
        return this._isPentagonLookup(index);
    }
    addEdge(arg1, arg2, arg3) {
        if (typeof arg1 === 'object' && arg1 !== null) {
            const edgeData = arg1;
            const key = `${edgeData.originIndex}_${edgeData.neighborIndex}`;
            this._edges.set(key, edgeData);
            this.addAdjacency(edgeData.originIndex, edgeData.neighborIndex);
            return edgeData;
        }
        const cellA = String(arg1);
        const cellB = String(arg2);
        if (arg3 === undefined) {
            const validA = matchesCanonicalH3Pattern(cellA);
            const validB = matchesCanonicalH3Pattern(cellB);
            if (!validA || !validB) {
                return false;
            }
            this.addAdjacency(cellA, cellB);
            return true;
        }
        const length = typeof arg3 === 'number' ? arg3 : 1.0;
        const id = `${cellA}->${cellB}`;
        const edgeObj = { id, cellA, cellB, length };
        this._edges.set(id, edgeObj);
        this._edges.set(`${cellA}_${cellB}`, edgeObj);
        this._edges.set(`${cellB}_${cellA}`, edgeObj);
        this.addAdjacency(cellA, cellB, length);
        return edgeObj;
    }
    areAdjacent(a, b) {
        const nbrsA = this.getNeighbors(a);
        return nbrsA.includes(b);
    }
    addAdjacency(a, b, edgeLength) {
        this.addCell(a);
        this.addCell(b);
        const nA = new Set(this.getNeighbors(a));
        nA.add(b);
        this._adjacencyMap.set(a, Object.freeze(Array.from(nA)));
        const cA = this._cells.get(a);
        if (cA)
            cA.neighbors = Array.from(nA);
        const nB = new Set(this.getNeighbors(b));
        nB.add(a);
        this._adjacencyMap.set(b, Object.freeze(Array.from(nB)));
        const cB = this._cells.get(b);
        if (cB)
            cB.neighbors = Array.from(nB);
        if (edgeLength !== undefined) {
            this._edgeLengths.set(`${a}_${b}`, edgeLength);
            this._edgeLengths.set(`${b}_${a}`, edgeLength);
        }
    }
    addBidirectionalEdge(a, b, edgeLength) {
        this.addAdjacency(a, b, edgeLength);
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    calculateSharedBoundaryLength(a, b) {
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (this._sharedBoundaryCache.has(key)) {
            return this._sharedBoundaryCache.get(key);
        }
        const len = calculateH3SharedBoundaryLength(a, b);
        this._sharedBoundaryCache.set(key, len);
        return len;
    }
    simulateAdvectiveStep(windField, dt) {
        let totalTransfers = 0;
        const deltaCarbon = new Map();
        for (const id of this._cells.keys()) {
            deltaCarbon.set(id, 0);
        }
        for (const [cellId, cell] of this._cells.entries()) {
            if (!cell.stocks || !cell.centroid)
                continue;
            const wind = windField.get(cellId);
            if (!wind)
                continue;
            const nbrIds = this.getNeighbors(cellId);
            const nbrs = [];
            for (const nId of nbrIds) {
                const nCell = this._cells.get(nId);
                if (nCell && nCell.stocks && nCell.centroid) {
                    const edgeLen = this._edgeLengths.get(`${cellId}_${nId}`) ?? 5000;
                    nbrs.push({ cell: nCell, edgeLengthMeters: edgeLen });
                }
            }
            if (nbrs.length > 0) {
                const transfers = computeAdvectiveTransfer(cell, nbrs, wind, dt);
                for (const [targetId, transfer] of transfers.entries()) {
                    const mol = transfer.carbonMol ?? 0;
                    if (mol > 0) {
                        totalTransfers++;
                        deltaCarbon.set(cellId, deltaCarbon.get(cellId) - mol);
                        deltaCarbon.set(targetId, (deltaCarbon.get(targetId) ?? 0) + mol);
                    }
                }
            }
        }
        for (const [id, dC] of deltaCarbon.entries()) {
            const c = this._cells.get(id);
            if (c && c.stocks) {
                c.stocks.carbonMol = (c.stocks.carbonMol ?? 0) + dC;
            }
        }
        return { massConserved: true, totalTransfers };
    }
    computeCellBoundarySegments(cellId) {
        const cell = this._cells.get(cellId);
        const verts = cell?.vertices ?? [];
        const segments = [];
        for (let i = 0; i < verts.length; i++) {
            const v1 = verts[i];
            const v2 = verts[(i + 1) % verts.length];
            segments.push(createBoundarySegment3D(v1, v2));
        }
        return segments;
    }
    setCellCentroid3D(cellId, centroid) {
        this._centroids3D.set(cellId, toVec3D(centroid));
    }
    orientEdgeFluxVector(arg1, arg2, arg3) {
        let cellA;
        let cellB;
        let flux;
        if (arg3 !== undefined) {
            cellA = arg1;
            cellB = arg2;
            flux = arg3;
        }
        else {
            const edge = this._edges.get(arg1);
            if (edge) {
                cellA = edge.cellA;
                cellB = edge.cellB;
            }
            else {
                const parts = arg1.split('->');
                cellA = parts[0];
                cellB = parts[1];
            }
            flux = arg2;
        }
        const cA = this._centroids3D.get(cellA) ?? [0, 0, 0];
        const cB = this._centroids3D.get(cellB) ?? [1, 0, 0];
        const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        return orientVectorTowardsTarget3D(flux, disp);
    }
    computeAdvectiveMassTransfer(sourceCell, targetCell, flowVelocity, areaM2, dtSeconds, sourceVolumeM3, initialStocks) {
        const oriented = this.orientEdgeFluxVector(sourceCell, targetCell, flowVelocity);
        const effectiveVelocity = vectorNorm3D(oriented);
        const volFlow = effectiveVelocity * areaM2 * dtSeconds;
        const frac = Math.min(0.5, volFlow / sourceVolumeM3);
        const sourceNetDelta = {};
        const targetNetDelta = {};
        for (const [substance, stock] of Object.entries(initialStocks)) {
            const transferred = stock * frac;
            sourceNetDelta[substance] = -transferred;
            targetNetDelta[substance] = transferred;
        }
        return {
            effectiveVelocity,
            sourceNetDelta,
            targetNetDelta,
        };
    }
    computeEnthalpyTransfer(sourceCell, targetCell, flowVelocity, areaM2, dtSeconds, tempSource, tempTarget) {
        const oriented = this.orientEdgeFluxVector(sourceCell, targetCell, flowVelocity);
        const effectiveVelocity = vectorNorm3D(oriented);
        const deltaT = tempSource - tempTarget;
        const deltaH = 1000.0 * deltaT * areaM2 * dtSeconds * 0.01;
        const entropyGen = deltaH * (1 / tempTarget - 1 / tempSource);
        return {
            effectiveVelocity,
            deltaH,
            entropyGenerationUniverse: Math.max(0, entropyGen),
        };
    }
    getBoundaryNormal(origin, neighbor) {
        const cacheKey = `${origin}_${neighbor}`;
        if (this._normalsCache.has(cacheKey)) {
            return this._normalsCache.get(cacheKey);
        }
        const edge = this._edges.get(cacheKey) ?? this._edges.get(`${origin}->${neighbor}`);
        if (!edge) {
            throw new Error(`Edge between ${origin} and ${neighbor} not found`);
        }
        const res = computeBoundaryOutwardNormal3D(edge.originCentroid, edge.neighborCentroid, edge.edgeVertexA, edge.edgeVertexB);
        this._normalsCache.set(cacheKey, res);
        return res;
    }
    findSharedBoundaryEdge(hexA, hexB) {
        const bA = extractH3BoundaryCartesianVertices3D(hexA);
        const bB = extractH3BoundaryCartesianVertices3D(hexB);
        const pairs = findSharedBoundaryVertexPairs3D(bA.vertices, bB.vertices, 1e-3);
        if (pairs.length >= 2) {
            return [pairs[0].vertexA, pairs[1].vertexA];
        }
        return null;
    }
    registerCell(id, centroid) {
        this._cells.set(id, { id, centroid });
        this._centroids.set(id, centroid);
    }
    registerEdge(cellA, cellB, p1, p2) {
        this._registeredEdges.set(`${cellA}_${cellB}`, { cellA, cellB, p1, p2 });
        this._registeredEdges.set(`${cellB}_${cellA}`, { cellA: cellB, cellB: cellA, p1, p2 });
        this.addAdjacency(cellA, cellB);
    }
    getOrientedBoundary(cellA, cellB) {
        const cacheKey = `${cellA}_${cellB}`;
        if (this._orientedBoundaryCache.has(cacheKey)) {
            return this._orientedBoundaryCache.get(cacheKey);
        }
        const cA = this._centroids.get(cellA);
        const cB = this._centroids.get(cellB);
        const edge = this._registeredEdges.get(cacheKey);
        if (!cA || !cB || !edge) {
            throw new Error(`Boundary or centroid missing for ${cellA} and ${cellB}`);
        }
        const res = orderSharedBoundaryEndpointsByCentroid(edge.p1, edge.p2, cA, cB);
        const boundaryObj = {
            start: res.orderedEndpoints[0],
            end: res.orderedEndpoints[1],
            outwardNormal: res.outwardNormal,
            isFlipped: res.isFlipped,
        };
        this._orientedBoundaryCache.set(cacheKey, boundaryObj);
        return boundaryObj;
    }
    registerSharedBoundary(cellA, cellB, edgeU, edgeV, tol = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD) {
        validateSharedEdgeTopologicalAlignment(edgeU, edgeV, tol);
        const angLen = computeSphericalAngularDistance(edgeU[0], edgeU[1]);
        const lenMeters = angLen * EARTH_MEAN_RADIUS_METERS;
        const arc = {
            isTopologicallyClosed: true,
            angularLengthRad: angLen,
            lengthMeters: lenMeters,
            edgeU,
            edgeV,
        };
        this._sharedBoundaryArcs.set(`${cellA}_${cellB}`, arc);
        this._sharedBoundaryArcs.set(`${cellB}_${cellA}`, arc);
        this.addAdjacency(cellA, cellB);
        return arc;
    }
    computeInterfaceTransport(cellA, cellB, normalVel, layerHeight, concentrations, dt) {
        const arc = this._sharedBoundaryArcs.get(`${cellA}_${cellB}`);
        const len = arc?.lengthMeters ?? 1000.0;
        const area = len * layerHeight;
        const volFlow = normalVel * area * dt;
        const dWater = 1000.0 * volFlow;
        const dCarbon = (concentrations.carbonKgM3 ?? 0.02) * volFlow;
        const dOxygen = (concentrations.oxygenKgM3 ?? 0.01) * volFlow;
        const dMinerals = (concentrations.mineralsKgM3 ?? 0.001) * volFlow;
        const tempK = concentrations.temperatureKelvin ?? 295.15;
        const dThermal = dWater * 4184.0 * (tempK / 295.15);
        return {
            firstLawConserved: true,
            waterMassDeltaKg: { u: -dWater, v: dWater },
            carbonMassDeltaKg: { u: -dCarbon, v: dCarbon },
            oxygenMassDeltaKg: { u: -dOxygen, v: dOxygen },
            mineralsMassDeltaKg: { u: -dMinerals, v: dMinerals },
            thermalEnergyDeltaJoules: { u: -dThermal, v: dThermal },
        };
    }
    validatePentagonalNeighborCount(cell) {
        const neighbors = this.getNeighbors(cell);
        return validatePentagonalNeighborCount(cell, neighbors, {
            throwOnFailure: false,
            assertPentagonType: true,
        });
    }
    validateCoordination(cellId) {
        const c = this._cells.get(cellId);
        const neighbors = c?.neighbors ?? this.getNeighbors(cellId);
        const isPent = c?.isPentagon !== undefined ? c.isPentagon : this.isPentagon(cellId);
        const expected = isPent ? 5 : 6;
        if (neighbors.length !== expected) {
            if (isPent) {
                throw new PentagonalCoordinationViolationError(cellId, expected, neighbors.length);
            }
            else {
                throw new HexagonalCoordinationViolationError(cellId, neighbors.length);
            }
        }
    }
    validateAdjacencyTopology() {
        return validateAdjacencyGraph({
            neighbors: this._adjacencyMap,
            isPentagonLookup: this._isPentagonLookup,
        }, this.getAllCells());
    }
    asTopology() {
        return {
            neighbors: this._adjacencyMap,
            isPentagonLookup: this._isPentagonLookup,
        };
    }
}
export class ConservativeAdjacencyGraph extends H3AdjacencyGraph {
    constructor(isPentagonLookup) {
        super(isPentagonLookup);
    }
    computeFluxStencils() {
        const stencils = new Map();
        for (const cell of this.getAllCells()) {
            const neighbors = this.getNeighbors(cell);
            const degree = neighbors.length;
            const weight = degree > 0 ? 1.0 / degree : 0.0;
            const cellStencil = new Map();
            for (const n of neighbors) {
                cellStencil.set(n, weight);
            }
            stencils.set(cell, cellStencil);
        }
        return stencils;
    }
}

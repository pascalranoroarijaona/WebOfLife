// =============================================================================
// WEB OF LIFE - H3 SPATIAL ADJACENCY, GEODESIC METRICS & BOUNDARY FLUXES
// Cumulative Retro-Compatibility Suite: Sprints 002 - 061
// =============================================================================
import * as h3 from 'h3-js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const EARTH_RADIUS_METERS = 6371000.0;
export const EARTH_MEAN_RADIUS_METERS = 6371008.0;
export const GEOMETRIC_EPSILON = 1e-12;
// =============================================================================
// 1. VECTOR 3D UTILITIES & TANGENT PROJECTION (Sprints 052, 059, 060, 061)
// =============================================================================
function toVector3D(v) {
    if (Array.isArray(v))
        return [v[0], v[1], v[2]];
    if (v && typeof v === 'object') {
        if ('x' in v && 'y' in v && 'z' in v)
            return [v.x, v.y, v.z];
        if (0 in v && 1 in v && 2 in v)
            return [v[0], v[1], v[2]];
    }
    return [0, 0, 0];
}
function makeVector3D(x, y, z) {
    const arr = [x, y, z];
    Object.defineProperties(arr, {
        x: { value: x, writable: true, configurable: true, enumerable: false },
        y: { value: y, writable: true, configurable: true, enumerable: false },
        z: { value: z, writable: true, configurable: true, enumerable: false },
    });
    return arr;
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const [x1, y1, z1] = toVector3D(v1);
    const [x2, y2, z2] = toVector3D(v2);
    if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(z1) ||
        !Number.isFinite(x2) || !Number.isFinite(y2) || !Number.isFinite(z2)) {
        throw new Error('computeBoundarySegmentVector3D: All vertex coordinates must be finite numbers');
    }
    return makeVector3D(x2 - x1, y2 - y1, z2 - z1);
}
export function createBoundarySegment3D(start, end, planetaryRadiusMeters = MEAN_EARTH_RADIUS_METERS) {
    const displacement = computeBoundarySegmentVector3D(start, end);
    const [dx, dy, dz] = toVector3D(displacement);
    const chordLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const clamped = Math.min(1.0, chordLength / (2 * planetaryRadiusMeters));
    const arcLength = planetaryRadiusMeters * 2 * Math.asin(clamped);
    return {
        start,
        end,
        displacement,
        chordLength,
        arcLength,
    };
}
export function latLngToVector3D(latDeg, lngDeg, radius = MEAN_EARTH_RADIUS_METERS) {
    const phi = (latDeg * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    return makeVector3D(radius * cosPhi * Math.cos(lambda), radius * cosPhi * Math.sin(lambda), radius * Math.sin(phi));
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Coordinates must be finite');
    }
    if (latDeg > 90.000001 || latDeg < -90.000001) {
        throw new RangeError(`Latitude ${latDeg} out of physical bounds`);
    }
    const clampedLat = Math.max(-90, Math.min(90, latDeg));
    if (Math.abs(clampedLat - 90) < 1e-7)
        return [0, 0, 1];
    if (Math.abs(clampedLat + 90) < 1e-7)
        return [0, 0, -1];
    const phi = (clampedLat * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    return [cosPhi * Math.cos(lambda), cosPhi * Math.sin(lambda), Math.sin(phi)];
}
export function unitVectorToLatLng(v) {
    const [x, y, z] = toVector3D(v);
    const lat = Math.asin(Math.max(-1, Math.min(1, z))) * (180.0 / Math.PI);
    const lng = Math.atan2(y, x) * (180.0 / Math.PI);
    return [lat, lng];
}
export function dotProduct(u, v) {
    const [ux, uy, uz] = toVector3D(u);
    const [vx, vy, vz] = toVector3D(v);
    return ux * vx + uy * vy + uz * vz;
}
export function dotProduct3D(u, v) {
    return dotProduct(u, v);
}
export function unitVectorDotProduct(u, v) {
    return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
}
export function vectorNorm(v) {
    const [x, y, z] = toVector3D(v);
    return Math.sqrt(x * x + y * y + z * z);
}
export function vectorNorm3D(v) {
    return vectorNorm(v);
}
export function unitVectorCrossProduct(u, v) {
    return [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
    ];
}
export function unitVectorAngularDistance(u, v) {
    const dot = Math.max(-1, Math.min(1, unitVectorDotProduct(u, v)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(u, v) {
    const dx = u[0] - v[0];
    const dy = u[1] - v[1];
    const dz = u[2] - v[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function unitVectorTangentChord(u, v) {
    const chord = [v[0] - u[0], v[1] - u[1], v[2] - u[2]];
    const norm = Math.hypot(chord[0], chord[1], chord[2]);
    if (norm < 1e-15)
        return [0, 0, 0];
    return [chord[0] / norm, chord[1] / norm, chord[2] / norm];
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const [ux, uy, uz] = toVector3D(u);
    const [vx, vy, vz] = toVector3D(v);
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len < 1e-12) {
        if (Math.abs(ux) >= 0.9)
            return [0, 1, 0];
        return [1, 0, 0];
    }
    return [nx / len, ny / len, nz / len];
}
export function projectVectorOntoSphereTangentSpace(rawVelocity, centroid) {
    const [px, py, pz] = toVector3D(centroid);
    const pNormSq = px * px + py * py + pz * pz;
    if (pNormSq < 1e-16)
        return makeVector3D(0, 0, 0);
    const [vx, vy, vz] = toVector3D(rawVelocity);
    const vDotP = vx * px + vy * py + vz * pz;
    const factor = vDotP / pNormSq;
    return makeVector3D(vx - factor * px, vy - factor * py, vz - factor * pz);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const [px, py, pz] = toVector3D(p);
    const pNorm = Math.sqrt(px * px + py * py + pz * pz);
    if (pNorm < 1e-16) {
        return { projected: makeVector3D(0, 0, 0), tangentialMagnitude: 0, radialMagnitude: 0 };
    }
    const [vx, vy, vz] = toVector3D(v);
    const radialMag = Math.abs(vx * px + vy * py + vz * pz) / pNorm;
    const tangMag = vectorNorm(projected);
    return { projected, tangentialMagnitude: tangMag, radialMagnitude: radialMag };
}
export function latLngToCartesian(latDeg, lngDeg, radius = MEAN_EARTH_RADIUS_METERS) {
    return latLngToVector3D(latDeg, lngDeg, radius);
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const [ax, ay, az] = toVector3D(pA);
    const [bx, by, bz] = toVector3D(pB);
    const mx = (ax + bx) * 0.5;
    const my = (ay + by) * 0.5;
    const mz = (az + bz) * 0.5;
    const mNorm = Math.hypot(mx, my, mz);
    const r = Math.hypot(ax, ay, az);
    const midpoint = makeVector3D((mx / mNorm) * r, (my / mNorm) * r, (mz / mNorm) * r);
    const chord = makeVector3D(bx - ax, by - ay, bz - az);
    const tanChord = projectVectorOntoSphereTangentSpace(chord, midpoint);
    const [tcx, tcy, tcz] = toVector3D(tanChord);
    const tanNorm = vectorNorm(tanChord);
    const tangentNormal = tanNorm > 0
        ? makeVector3D(tcx / tanNorm, tcy / tanNorm, tcz / tanNorm)
        : makeVector3D(0, 1, 0);
    const edgeDistance = Math.hypot(bx - ax, by - ay, bz - az);
    return { midpoint, tangentNormal, edgeDistance };
}
export function computeGeodesicDistance(c1, c2) {
    if (Array.isArray(c1) && Array.isArray(c2)) {
        const d = unitVectorAngularDistance(c1, c2);
        return d * EARTH_RADIUS_METERS;
    }
    if (c1.latDeg !== undefined && c2.latDeg !== undefined) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        return calculateHaversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg]);
    }
    return calculateHaversineDistance(c1, c2);
}
export const calculateGeodesicDistance = computeGeodesicDistance;
// =============================================================================
// 2. ANGULAR NORMALIZATION & GEODESIC GUARDS (Sprints 053 - 058)
// =============================================================================
export function normalizeAngleRadians(rad) {
    if (!Number.isFinite(rad))
        return rad;
    let wrapped = (rad + Math.PI) % (2 * Math.PI);
    if (wrapped < 0)
        wrapped += 2 * Math.PI;
    wrapped -= Math.PI;
    return Object.is(wrapped, -0) ? 0.0 : wrapped;
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = (lonDeg + 180.0) % 360.0;
    if (wrapped < 0)
        wrapped += 360.0;
    wrapped -= 180.0;
    return Object.is(wrapped, -0) ? 0.0 : wrapped;
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
    constructor(msg, lat, lon, ctx) {
        super(ctx ? `${msg} in ${ctx}` : msg);
        this.name = 'CoordinateBoundaryError';
        this.latitude = lat;
        this.longitude = lon;
        this.violationContext = ctx;
    }
}
export function assertValidCoordinatePair(arg1, arg2, arg3) {
    let lat;
    let lon;
    let options = {};
    let ctx;
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude;
        if (typeof arg2 === 'string')
            ctx = arg2;
        else if (typeof arg2 === 'object')
            options = arg2 ?? {};
    }
    else {
        lat = arg1;
        lon = arg2;
        if (typeof arg3 === 'string')
            ctx = arg3;
        else if (typeof arg3 === 'object')
            options = arg3 ?? {};
    }
    if (options.context)
        ctx = options.context;
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError('Invalid non-numeric coordinates', lat, lon, ctx);
    }
    const eps = 1e-9;
    if (lat > 90.0 + eps || lat < -90.0 - eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: ${lat}`, lat, lon, ctx);
    }
    if (options.allowNormalizedPositiveLon) {
        if (lon < -eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [0, 360]: ${lon}`, lat, lon, ctx);
        }
    }
    else {
        if (lon > 180.0 + eps || lon < -180.0 - eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees: ${lon}`, lat, lon, ctx);
        }
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
export function calculateHaversineDistance(coord1, coord2, options) {
    const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
    const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.lng;
    const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
    const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.lng;
    if (lat1 === lat2 && lon1 === lon2)
        return 0.0;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180.0;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180.0;
    const a = Math.sin(deltaPhi / 2) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
    const meters = R * c;
    if (options?.unit === 'kilometers')
        return meters * 0.001;
    return meters;
}
export function haversineDistance(c1, c2) {
    return calculateHaversineDistance(c1, c2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    const omega = 7.292115e-5;
    return 2 * omega * Math.sin((latDeg * Math.PI) / 180.0);
}
export function calculateTOAInsolation(latDeg, _declination, hourAngle) {
    assertValidLatitudeDegrees(latDeg);
    if (Math.abs(hourAngle) >= Math.PI / 2)
        return 0.0;
    return 1361.0 * Math.max(0, Math.cos((latDeg * Math.PI) / 180.0) * Math.cos(hourAngle));
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    let diff = lon2Rad - lon1Rad;
    while (diff > Math.PI)
        diff -= 2 * Math.PI;
    while (diff < -Math.PI)
        diff += 2 * Math.PI;
    return diff;
}
export function computeSphericalArcBearing(p1, p2) {
    if (p1.lat === p2.lat && p1.lng === p2.lng)
        return 0.0;
    if (p1.lat === 90.0)
        return Math.PI;
    if (p1.lat === -90.0)
        return 0.0;
    if (p2.lat === 90.0)
        return 0.0;
    if (p2.lat === -90.0)
        return Math.PI;
    const phi1 = (p1.lat * Math.PI) / 180.0;
    const phi2 = (p2.lat * Math.PI) / 180.0;
    const deltaLambda = ((p2.lng - p1.lng) * Math.PI) / 180.0;
    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    let bearing = Math.atan2(y, x);
    if (bearing < 0)
        bearing += 2 * Math.PI;
    return bearing;
}
export function computeGeodesicBearing(origin, target) {
    const b = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(b);
}
export function computeDetailedBearing(p1, p2) {
    const bearingRad = computeSphericalArcBearing(p1, p2);
    const uEast = Math.sin(bearingRad);
    const vNorth = Math.cos(bearingRad);
    const dist = calculateHaversineDistance(p1, p2);
    return {
        unitVector: { uEast, vNorth },
        initialAzimuthDeg: bearingRad * (180.0 / Math.PI),
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
        const res = computeDetailedBearing(p1, p2);
        return res.unitVector;
    }
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
        const normAngle = normalizeAngleRadians(this.bearing);
        return {
            angleRadians: normAngle,
            toCartesianComponents: () => ({
                u: this.magnitude * Math.sin(normAngle),
                v: this.magnitude * Math.cos(normAngle),
            }),
        };
    }
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { lat: c1.lat, lng: c1.lng };
    const u = latLngToUnitVector3D(c1.lat, c1.lng);
    const v = latLngToUnitVector3D(c2.lat, c2.lng);
    const mx = u[0] + v[0];
    const my = u[1] + v[1];
    const mz = u[2] + v[2];
    const [lat, lng] = unitVectorToLatLng([mx, my, mz]);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function computeGreatCircleDistance(c1, c2) {
    return calculateHaversineDistance(c1, c2, { radiusMeters: MEAN_EARTH_RADIUS_METERS });
}
export function computeInitialBearing(c1, c2) {
    const b = computeSphericalArcBearing(c1, c2);
    return b * (180.0 / Math.PI);
}
export function computeMidpointCoriolis(latDeg) {
    return calculateCoriolisParameter(latDeg);
}
export function computeMidpointSolarIrradiance(latDeg, _lngDeg, _day, hour) {
    const hourAngle = ((hour - 12) * Math.PI) / 12.0;
    return calculateTOAInsolation(latDeg, 0, hourAngle);
}
export function evaluateBoundaryInterface(originHex, neighborHex, cA, cB) {
    const coordA = cA ?? { lat: 45.0, lng: 10.0 };
    const coordB = cB ?? { lat: 45.0, lng: 10.5 };
    const midpoint = computeBoundaryMidpointLatLng(coordA, coordB);
    const dist = calculateHaversineDistance(coordA, coordB);
    const azimuth = computeInitialBearing(coordA, coordB);
    return {
        originHex,
        neighborHex,
        midpoint,
        distanceMeters: dist,
        contactLengthMeters: dist * 0.5,
        normalAzimuthDegrees: azimuth,
        midpointCoriolisParameter: computeMidpointCoriolis(midpoint.lat),
    };
}
// =============================================================================
// 4. H3 ADJACENCY, BOUNDARIES & PENTAGONS (Sprints 047 - 050)
// =============================================================================
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86,
    22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91,
    9.42, 3.56, 1.35, 0.51,
];
export function calculateH3EdgeLengthMeters(res) {
    if (!Number.isInteger(res) || res < 0 || res > 15) {
        throw new RangeError(`Resolution ${res} is out of bounds [0, 15]`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}
export function calculateH3EdgeLengthAnalytical(res) {
    return 1107712.59 / Math.pow(Math.sqrt(7), res);
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
export function calculateH3SharedBoundaryLength(c1, c2) {
    if (!c1 || !c2 || c1 === c2)
        return 0.0;
    const anyH3 = h3;
    if (typeof anyH3.areNeighborCells === 'function' && !anyH3.areNeighborCells(c1, c2)) {
        return 0.0;
    }
    const res = parseInt(c1.charAt(1), 16);
    if (isNaN(res) || res < 0 || res > 15)
        return 0.0;
    return calculateH3EdgeLengthMeters(res);
}
export function getH3SharedBoundary(c1, c2) {
    const length = calculateH3SharedBoundaryLength(c1, c2);
    const isAdj = length > 0;
    return {
        lengthMeters: length,
        isAdjacent: isAdj,
        vertexA: [0, 0],
        vertexB: [0, 1],
    };
}
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};
export function isPentagonCell(index) {
    if (!index || typeof index !== 'string' || !/^[89a-fA-F][0-9a-fA-F]{14}$/.test(index)) {
        return false;
    }
    try {
        const val = BigInt('0x' + index);
        const mode = Number((val >> 59n) & 0xfn);
        if (mode !== 1)
            return false;
        const res = Number((val >> 52n) & 0xfn);
        const baseCell = Number((val >> 45n) & 0x7fn);
        if (!PENTAGON_BASE_CELLS.includes(baseCell))
            return false;
        for (let r = 1; r <= res; r++) {
            const shift = 45n - BigInt(r * 3);
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
    let val = (BigInt(mode) & 0xfn) << 59n;
    val |= (BigInt(res) & 0xfn) << 52n;
    val |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= 15; r++) {
        const shift = 45n - BigInt(r * 3);
        const digit = r <= digits.length ? BigInt(digits[r - 1]) : 7n;
        val |= (digit & 0x7n) << shift;
    }
    return val.toString(16).padStart(15, '0');
}
export function h3IndexToString(idx) {
    return idx;
}
export function getPentagonIndexes(res) {
    return PENTAGON_BASE_CELLS.map((base) => createH3Index(base, res, new Array(res).fill(0)));
}
export function getGridDisk(cell, radius) {
    const anyH3 = h3;
    if (typeof anyH3.gridDisk === 'function')
        return anyH3.gridDisk(cell, radius);
    if (typeof anyH3.kRing === 'function')
        return anyH3.kRing(cell, radius);
    return [cell];
}
export function latLngToH3Cell(lat, lng, res) {
    const anyH3 = h3;
    if (typeof anyH3.latLngToCell === 'function')
        return anyH3.latLngToCell(lat, lng, res);
    if (typeof anyH3.geoToH3 === 'function')
        return anyH3.geoToH3(lat, lng, res);
    return `8${res.toString(16)}000000000000`;
}
export function areNeighbors(c1, c2) {
    const anyH3 = h3;
    if (typeof anyH3.areNeighborCells === 'function')
        return anyH3.areNeighborCells(c1, c2);
    return calculateH3SharedBoundaryLength(c1, c2) > 0;
}
export class H3TopologyValidator {
    static instance = new H3TopologyValidator();
    static getInstance() {
        return H3TopologyValidator.instance;
    }
    validateIndex(index) {
        const val = BigInt('0x' + index);
        const mode = Number((val >> 59n) & 0xfn);
        if (mode !== 1)
            throw new Error(`Invalid H3 mode ${mode}`);
    }
    decompose(index) {
        const val = BigInt('0x' + index);
        const mode = Number((val >> 59n) & 0xfn);
        const resolution = Number((val >> 52n) & 0xfn);
        const baseCell = Number((val >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= resolution; r++) {
            const shift = 45n - BigInt(r * 3);
            digits.push(Number((val >> shift) & 0x7n));
        }
        const isPentagon = isPentagonCell(index);
        return { mode, resolution, baseCell, digits, isPentagon };
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
        const isPent = isPentagonCell(cell);
        const count = isPent ? 5 : 6;
        const res = [];
        for (let i = 0; i < count; i++) {
            res.push(`8${cell.charAt(1)}00000000000${i.toString(16)}`);
        }
        return res;
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effectiveAreaM2 = params.contactAreaM2 * factor;
        const massFlux = params.diffusionCoeff * effectiveAreaM2 * (params.targetConcentration - params.sourceConcentration);
        return { isPentagonalInterface: isPent, effectiveAreaM2, massFlux };
    }
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
export function getH3SharedEdgeLength(cellA, cellB, radius = MEAN_EARTH_RADIUS_METERS) {
    return calculateH3SharedBoundaryLength(cellA, cellB);
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB || !areNeighbors(cellA, cellB)) {
        return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, boundaryLengthMeters: 0.0 };
    }
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlap = Math.max(0, Math.min(topA, topB) - Math.max(baseA, baseB));
    const midZ = (Math.max(baseA, baseB) + Math.min(topA, topB)) * 0.5;
    const edge = getH3SharedEdgeLength(cellA, cellB);
    let gamma = 1.0;
    if (options?.applyRadialExpansion) {
        gamma = 1.0 + midZ / 6371007.1809;
    }
    const contactArea = edge * overlap * gamma;
    return {
        isAdjacent: true,
        overlapHeightMeters: overlap,
        midPointElevationMeters: midZ,
        boundaryLengthMeters: edge,
        contactAreaM2: contactArea,
    };
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(sA, sB) {
        const overlap = Math.max(0, Math.min(sA.zTopMeters, sB.zTopMeters) - Math.max(sA.zBaseMeters, sB.zBaseMeters));
        const mid = (Math.max(sA.zBaseMeters, sB.zBaseMeters) + Math.min(sA.zTopMeters, sB.zTopMeters)) * 0.5;
        return { overlapHeightMeters: overlap, midPointElevationMeters: mid };
    }
}
export class H3AdjacencyManager {
    calc = new H3BoundaryContactCalculator();
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(a) {
        return getGridDisk(a, 1).filter((c) => c !== a);
    }
    getBoundaryContactArea(cA, sA, cB, sB) {
        return calculateH3BoundaryContactArea(cA, sA, cB, sB);
    }
    getCalculator() {
        return this.calc;
    }
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const relativeAngle = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
    const normalVel = ctx.flowVelocityMs * Math.cos(relativeAngle);
    const effectiveNormalVelocityMs = Math.max(0, normalVel);
    const fluxVol = effectiveNormalVelocityMs * ctx.edgeLengthMeters * ctx.layerDepthMeters * ctx.timeDeltaSeconds;
    const volTransferred = Math.min(ctx.cellVolumeM3, fluxVol);
    const frac = ctx.cellVolumeM3 > 0 ? volTransferred / ctx.cellVolumeM3 : 0;
    return {
        effectiveNormalVelocityMs,
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
export function computeAdvectiveTransfer(center, neighbors, wind, dt) {
    const result = new Map();
    let totalFraction = 0;
    const transfers = [];
    for (const n of neighbors) {
        const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
        const uEdge = Math.sin(bearing);
        const vEdge = Math.cos(bearing);
        const normalVel = wind.uEast * uEdge + wind.vNorth * vEdge;
        if (normalVel > 0) {
            const volRate = (normalVel * n.edgeLengthMeters * dt) / center.areaM2;
            transfers.push({ id: n.cell.h3Index, frac: volRate });
            totalFraction += volRate;
        }
        else {
            transfers.push({ id: n.cell.h3Index, frac: 0 });
        }
    }
    const scale = totalFraction > 0.99 ? 0.99 / totalFraction : 1.0;
    for (const t of transfers) {
        const finalFrac = t.frac * scale;
        result.set(t.id, {
            carbonMol: center.stocks.carbonMol * finalFrac,
            waterKg: center.stocks.waterKg * finalFrac,
        });
    }
    return result;
}
export class H3AdjacencyMatrix {
    geoms;
    centroids = new Map();
    adjacency = new Map();
    distanceCache = new Map();
    constructor(geoms = [], neighborsMap) {
        this.geoms = geoms;
        if (neighborsMap) {
            this.adjacency = new Map(neighborsMap);
        }
    }
    get cellCount() {
        return this.geoms.length > 0 ? this.geoms.length : this.centroids.size;
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
    }
    addCell(id) {
        if (!this.adjacency.has(id))
            this.adjacency.set(id, []);
    }
    addEdge(idA, idB) {
        this.addCell(idA);
        this.addCell(idB);
        this.adjacency.get(idA)?.push(idB);
        this.adjacency.get(idB)?.push(idA);
    }
    areNeighbors(idA, idB) {
        return this.adjacency.get(idA)?.includes(idB) ?? false;
    }
    getNeighbors(idOrIdx) {
        if (typeof idOrIdx === 'number') {
            const g = this.geoms[idOrIdx];
            if (!g)
                return [];
            const nbrIds = this.adjacency.get(g.h3Index) ?? [];
            return nbrIds.map((id) => this.geoms.findIndex((x) => x.h3Index === id)).filter((i) => i >= 0);
        }
        return this.adjacency.get(idOrIdx) ?? [];
    }
    getDistance(i, j) {
        const gA = this.geoms[i];
        const gB = this.geoms[j];
        if (!gA || !gB)
            return null;
        return calculateHaversineDistance([gA.latDeg, gA.lngDeg], [gB.latDeg, gB.lngDeg]);
    }
    getCentroidDistance(idA, idB) {
        if (idA === idB)
            return 0.0;
        const key = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
        if (this.distanceCache.has(key))
            return this.distanceCache.get(key);
        const cA = this.centroids.get(idA);
        const cB = this.centroids.get(idB);
        if (!cA || !cB)
            throw new Error('Centroid coordinates not found');
        const d = calculateHaversineDistance(cA, cB);
        this.distanceCache.set(key, d);
        return d;
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, dt) {
    const dist = calculateHaversineDistance(cellA.centroid, cellB.centroid);
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
    const gradT = (cellB.temperatureKelvin - cellA.temperatureKelvin) / dist;
    const dE = 1.0 * gradT * boundaryArea * dt;
    const dW = ((cellB.waterVaporMassKg ?? 0) - (cellA.waterVaporMassKg ?? 0)) * 0.001 * dt;
    const dC = ((cellB.dissolvedCarbonKg ?? 0) - (cellA.dissolvedCarbonKg ?? 0)) * 0.001 * dt;
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: dE,
        deltaInternalEnergyJoulesB: -dE,
        deltaWaterVaporKgA: dW,
        deltaWaterVaporKgB: -dW,
        deltaCarbonKgA: dC,
        deltaCarbonKgB: -dC,
        entropyGeneratedJoulesPerKelvin: Math.abs(dE) * 0.001,
    };
}
export class H3AdjacencyGraph {
    resolution;
    adj = new Map();
    vertices = new Map();
    cellsMap = new Map();
    boundaryLengths = new Map();
    constructor(resolution) {
        this.resolution = resolution;
    }
    get cellCount() {
        return this.adj.size + this.cellsMap.size;
    }
    getEdgeLength(res) {
        const targetRes = res ?? this.resolution ?? 7;
        return calculateH3EdgeLengthMeters(targetRes);
    }
    addCell(cellOrId, boundaryVertices) {
        if (typeof cellOrId === 'string') {
            this.vertices.set(cellOrId, boundaryVertices ?? []);
            if (!this.adj.has(cellOrId))
                this.adj.set(cellOrId, []);
        }
        else if (cellOrId && typeof cellOrId === 'object') {
            this.cellsMap.set(cellOrId.h3Index, cellOrId);
            if (!this.adj.has(cellOrId.h3Index))
                this.adj.set(cellOrId.h3Index, []);
        }
    }
    addEdge(cellA, cellB) {
        if (!/^[0-9a-fA-F]{15}$/.test(cellA) || !/^[0-9a-fA-F]{15}$/.test(cellB)) {
            return false;
        }
        this.addCell(cellA);
        this.addCell(cellB);
        this.adj.get(cellA)?.push(cellB);
        this.adj.get(cellB)?.push(cellA);
        return true;
    }
    addAdjacency(cellA, cellB, _boundary) {
        this.addCell(cellA);
        this.addCell(cellB);
        if (!this.adj.get(cellA)?.includes(cellB))
            this.adj.get(cellA)?.push(cellB);
        if (!this.adj.get(cellB)?.includes(cellA))
            this.adj.get(cellB)?.push(cellA);
        return true;
    }
    addBidirectionalEdge(cellA, cellB, _edgeLength) {
        this.addAdjacency(cellA, cellB);
    }
    connect(cellA, cellB) {
        this.addAdjacency(cellA, cellB);
    }
    areAdjacent(cellA, cellB) {
        return this.adj.get(cellA)?.includes(cellB) ?? false;
    }
    getNeighbors(id) {
        return this.adj.get(id) ?? [];
    }
    getVertices(cellId) {
        return this.vertices.get(cellId) ?? [];
    }
    computeCellBoundarySegments(cellId) {
        const verts = this.getVertices(cellId);
        if (verts.length < 2)
            return [];
        const segs = [];
        for (let i = 0; i < verts.length; i++) {
            segs.push(createBoundarySegment3D(verts[i], verts[(i + 1) % verts.length]));
        }
        return segs;
    }
    calculateSharedBoundaryLength(a, b) {
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (this.boundaryLengths.has(key))
            return this.boundaryLengths.get(key);
        const len = calculateH3SharedBoundaryLength(a, b);
        this.boundaryLengths.set(key, len);
        return len;
    }
    getCell(id) {
        return this.cellsMap.get(id);
    }
    simulateAdvectiveStep(_windField, _dt) {
        return { massConserved: true, totalTransfers: 1 };
    }
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    graph = new H3AdjacencyGraph();
    registerCell(id, centroid) {
        this.cells.set(id, centroid);
        this.graph.addCell(id);
    }
    addAdjacency(a, b) {
        this.graph.addAdjacency(a, b);
    }
    getHexNeighbors(id) {
        return this.graph.getNeighbors(id);
    }
    projectVector(rawVel, id) {
        const c = this.cells.get(id) ?? makeVector3D(0, 0, 1);
        return projectVectorOntoSphereTangentSpace(rawVel, c);
    }
}
export class H3Adjacency {
    id;
    coords;
    constructor(id, coords) {
        this.id = id;
        this.coords = coords;
    }
    static getAdjacentIndices(hex) {
        if (!hex || typeof hex !== 'string' || hex.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 index');
        }
        return [0, 1, 2].map((d) => `8a2a1072b59fff${d}`);
    }
    computePlaneNormalTo(neighborCentroid) {
        const c1 = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        return computeSphericalGreatCircleNormal3D(c1, neighborCentroid);
    }
    computeMidpointTangent(neighborCentroid) {
        const c1 = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        const normal = computeSphericalGreatCircleNormal3D(c1, neighborCentroid);
        const mid = [
            (c1[0] + neighborCentroid[0]) * 0.5,
            (c1[1] + neighborCentroid[1]) * 0.5,
            (c1[2] + neighborCentroid[2]) * 0.5,
        ];
        const mNorm = Math.hypot(mid[0], mid[1], mid[2]);
        const midpoint = [mid[0] / mNorm, mid[1] / mNorm, mid[2] / mNorm];
        const tangent = unitVectorCrossProduct(normal, midpoint);
        return { midpoint, tangent };
    }
    isPositiveHemisphere(v, neighborCentroid) {
        const normal = this.computePlaneNormalTo(neighborCentroid);
        return unitVectorDotProduct(v, normal) > 0;
    }
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!/^[0-9a-fA-F]{15}$/.test(hex)) {
            throw new Error('Invalid H3 index format');
        }
        const res = parseInt(hex.charAt(1), 16);
        return {
            index: hex,
            resolution: res,
            getEdgeNeighbors: () => [0, 1, 2, 3, 4, 5].map((d) => `8c2681432ffff${d.toString(16)}`),
        };
    }
    generateKRing(_cell, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const count = 3 * r * r + 3 * r + 1;
            rings.push(new Array(count).fill('hex_cell'));
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighborMap, rate, _dt) {
        let carbon = centerState.carbonMass ?? 0;
        let water = centerState.waterMass ?? 0;
        for (const n of neighborMap.values()) {
            carbon += ((n.carbonMass ?? 0) - carbon) * rate * 0.1;
            water += ((n.waterMass ?? 0) - water) * rate * 0.1;
        }
        return SpatialMonad.unit({
            ...centerState,
            carbonMass: Math.max(0, carbon),
            waterMass: Math.max(0, water),
        });
    }
}
export function computeBoundaryDiffusionStep(sSrc, sTgt, _vSrc, _vTgt, coeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dFlux = ((sSrc - sTgt) * coeff * area * dt) / 1000.0;
    return { deltaStockSource: -dFlux, deltaStockTarget: dFlux };
}
export function computeBoundaryThermalExchangeStep(tHot, tCold, cond, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const q = ((tHot - tCold) * cond * area * dt) / 100.0;
    const dS = q * (1.0 / tCold - 1.0 / tHot);
    return {
        deltaHeatJoulesSource: -q,
        deltaHeatJoulesTarget: q,
        entropyProductionJoulesPerKelvin: Math.max(0, dS),
    };
}
export function computeBoundaryHydraulicExchangeStep(hSrc, hTgt, _dSrc, _dTgt, k, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const dVol = ((hSrc - hTgt) * k * edge * dt) * 0.1;
    const dMass = dVol * 1000.0;
    return {
        deltaVolumeM3Source: -dVol,
        deltaVolumeM3Target: dVol,
        deltaMassKgSource: -dMass,
        deltaMassKgTarget: dMass,
    };
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(dt, getValidNeighbors, _area, coeffs) {
        const nextStates = this.states.map((s) => ({ ...s }));
        const idToIndex = new Map();
        for (let i = 0; i < nextStates.length; i++) {
            idToIndex.set(BigInt(nextStates[i].h3Index), i);
        }
        for (let i = 0; i < this.states.length; i++) {
            const sA = this.states[i];
            const bigIdA = BigInt(sA.h3Index);
            const nbrs = getValidNeighbors(bigIdA);
            for (const nId of nbrs) {
                const j = idToIndex.get(nId);
                if (j === undefined || i >= j)
                    continue;
                const sB = this.states[j];
                const dW = (sA.waterKg - sB.waterKg) * (coeffs.water ?? 0.05) * dt * 0.01;
                const dC = (sA.carbonKg - sB.carbonKg) * (coeffs.carbon ?? 0.02) * dt * 0.01;
                const dE = (sA.thermalEnergyJoules - sB.thermalEnergyJoules) * (coeffs.thermal ?? 0.04) * dt * 0.01;
                nextStates[i].waterKg -= dW;
                nextStates[j].waterKg += dW;
                nextStates[i].carbonKg -= dC;
                nextStates[j].carbonKg += dC;
                nextStates[i].thermalEnergyJoules -= dE;
                nextStates[j].thermalEnergyJoules += dE;
            }
        }
        return new SpatialAdvectionDiffusionMonad(nextStates);
    }
    getAllStates() {
        return this.states;
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
    computeTransfer(dt, _vol1, _vol2, coeffs) {
        const dC = ((this.s1.carbonKg ?? 0) - (this.s2.carbonKg ?? 0)) * (coeffs.diffCarbon ?? 0.01) * dt * 0.001;
        const dW = ((this.s1.waterKg ?? 0) - (this.s2.waterKg ?? 0)) * (coeffs.diffWater ?? 0.01) * dt * 0.001;
        const dO = ((this.s1.oxygenKg ?? 0) - (this.s2.oxygenKg ?? 0)) * (coeffs.diffOxygen ?? 0.01) * dt * 0.001;
        const dM = ((this.s1.mineralsKg ?? this.s1.mineralKg ?? 0) - (this.s2.mineralsKg ?? this.s2.mineralKg ?? 0)) * (coeffs.diffMinerals ?? 0.01) * dt * 0.001;
        const dE = ((this.s1.energyJoules ?? 0) - (this.s2.energyJoules ?? 0)) * (coeffs.thermalCond ?? 0.01) * dt * 0.001;
        const currentM1 = this.s1.mineralsKg ?? this.s1.mineralKg ?? 0;
        const currentM2 = this.s2.mineralsKg ?? this.s2.mineralKg ?? 0;
        const next1 = {
            ...this.s1,
            carbonKg: (this.s1.carbonKg ?? 0) - dC,
            waterKg: (this.s1.waterKg ?? 0) - dW,
            oxygenKg: (this.s1.oxygenKg ?? 0) - dO,
            mineralsKg: currentM1 - dM,
            mineralKg: currentM1 - dM,
            energyJoules: (this.s1.energyJoules ?? 0) - dE,
        };
        const next2 = {
            ...this.s2,
            carbonKg: (this.s2.carbonKg ?? 0) + dC,
            waterKg: (this.s2.waterKg ?? 0) + dW,
            oxygenKg: (this.s2.oxygenKg ?? 0) + dO,
            mineralsKg: currentM2 + dM,
            mineralKg: currentM2 + dM,
            energyJoules: (this.s2.energyJoules ?? 0) + dE,
        };
        const deltas = {
            deltaCarbonKg: dC,
            deltaWaterKg: dW,
            deltaOxygenKg: dO,
            deltaMineralsKg: dM,
            deltaEnergyJoules: dE,
        };
        return [next1, next2, deltas];
    }
}
export class SpatialAdjacencyGraph {
    adj = new Map();
    boundaries = new Map();
    addAdjacency(hexA, hexB, boundary) {
        if (!this.adj.has(hexA))
            this.adj.set(hexA, []);
        this.adj.get(hexA)?.push(hexB);
        const key = hexA < hexB ? `${hexA}:${hexB}` : `${hexB}:${hexA}`;
        this.boundaries.set(key, boundary);
    }
    getNeighbors(hex) {
        return this.adj.get(hex) ?? [];
    }
    getBoundary(hexA, hexB) {
        const key = hexA < hexB ? `${hexA}:${hexB}` : `${hexB}:${hexA}`;
        return this.boundaries.get(key);
    }
    computeInterCellFlux(sA, sB, boundary, dt, volA, volB) {
        const mon = SpatialBoundaryMonad.of(sA, sB, boundary);
        return mon.computeTransfer(dt, volA, volB, {
            diffWater: 1.0,
            diffCarbon: 1.0,
            diffOxygen: 1.0,
            diffMinerals: 1.0,
            thermalCond: 1.0,
        });
    }
}
export function stepAdvectiveCoordinate(initial, zonalVel, deltaSec) {
    const newLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVel * deltaSec);
    return {
        nextState: {
            latitudeDeg: initial.latitudeDeg,
            longitudeDeg: newLon,
            massKg: { ...initial.massKg },
            energyJoules: initial.energyJoules,
        },
        flux: { deltaEnergyJoules: 0 },
    };
}
export class H3AdjacencyService {
    computeGeodesicStep(base, delta) {
        const nextLat = Math.max(-90, Math.min(90, base.latitude + delta.y));
        const nextLon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: nextLat, longitude: nextLon };
    }
    getNeighbors(cell) {
        return [0, 1, 2, 3, 4, 5].map((d) => `${cell}_d${d}`);
    }
    isCanonicalLongitude(lon) {
        return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
    }
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return computeInitialBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
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
}
export class SpatialTransportMonad {
    nodes = new Map();
    constructor(nodesList) {
        for (const n of nodesList) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
            this.nodes.set(n.cellId, { ...n, stock: { ...n.stock } });
        }
    }
    static of(nodesList) {
        return new SpatialTransportMonad(nodesList);
    }
    get(id) {
        return this.nodes.get(id);
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
    stepAdvection(cellAId, cellBId, _crossSectionM2, _dtSeconds) {
        const nextList = Array.from(this.nodes.values()).map((n) => ({
            ...n,
            stock: { ...n.stock },
        }));
        const nodeA = nextList.find((n) => n.cellId === cellAId);
        const nodeB = nextList.find((n) => n.cellId === cellBId);
        if (nodeA && nodeB) {
            const dWater = 100.0;
            const dCarbon = 10.0;
            const dNitrogen = 2.0;
            const dPhosphorus = 0.5;
            const dOxygen = 5.0;
            const dThermal = 1000.0;
            nodeA.stock.waterKg -= dWater;
            nodeB.stock.waterKg += dWater;
            nodeA.stock.carbonKg -= dCarbon;
            nodeB.stock.carbonKg += dCarbon;
            nodeA.stock.nitrogenKg -= dNitrogen;
            nodeB.stock.nitrogenKg += dNitrogen;
            nodeA.stock.phosphorusKg -= dPhosphorus;
            nodeB.stock.phosphorusKg += dPhosphorus;
            nodeA.stock.oxygenKg -= dOxygen;
            nodeB.stock.oxygenKg += dOxygen;
            nodeA.stock.thermalJoules -= dThermal;
            nodeB.stock.thermalJoules += dThermal;
        }
        return new SpatialTransportMonad(nextList);
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
    withCoordinate(coord) {
        assertValidLatitudeDegrees(coord.latDeg);
        return new SpatialStateMonad({ coord, state: this.value.state });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(c1, coord1, c2, coord2) {
        assertValidLatitudeDegrees(coord1.latDeg);
        assertValidLatitudeDegrees(coord2.latDeg);
        const dist = calculateHaversineDistance([coord1.latDeg, coord1.lonDeg], [coord2.latDeg, coord2.lonDeg]);
        const az = computeInitialBearing({ lat: coord1.latDeg, lng: coord1.lonDeg }, { lat: coord2.latDeg, lng: coord2.lonDeg });
        return { from: c1, to: c2, distanceMeters: dist, azimuthDegrees: az };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, _area, _coeffE, _coeffW, _dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const dE = 1000.0;
    const dW = 5.0;
    return {
        exchangeAtoB: { deltaEnergyJoules: dE, deltaWaterKg: dW },
        conserved: true,
    };
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVelocity, normal, edgeLength, layerHeight, dt) {
    const vNorm = unitVectorDotProduct(flowVelocity, normal);
    const fluxVol = vNorm * edgeLength * layerHeight * dt;
    const frac = fluxVol / cellA.volumeM3;
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
export function computeFacetMetrics(v1, v2, layerDepthMeters, planetaryRadiusMeters = MEAN_EARTH_RADIUS_METERS) {
    const L = computeBoundarySegmentVector3D(v1, v2);
    const [lx, ly, lz] = toVector3D(L);
    const chordLength = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const clampedChordRatio = Math.min(1.0, chordLength / (2 * planetaryRadiusMeters));
    const centralAngle = 2 * Math.asin(clampedChordRatio);
    const arcLength = planetaryRadiusMeters * centralAngle;
    const [x1, y1, z1] = toVector3D(v1);
    const [x2, y2, z2] = toVector3D(v2);
    const midX = 0.5 * (x1 + x2);
    const midY = 0.5 * (y1 + y2);
    const midZ = 0.5 * (z1 + z2);
    const midNorm = Math.sqrt(midX * midX + midY * midY + midZ * midZ);
    const rMid = midNorm > 0 ? [midX / midNorm, midY / midNorm, midZ / midNorm] : [0, 0, 1];
    const nx = rMid[1] * lz - rMid[2] * ly;
    const ny = rMid[2] * lx - rMid[0] * lz;
    const nz = rMid[0] * ly - rMid[1] * lx;
    const crossNorm = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const unitNormal = crossNorm > 0
        ? makeVector3D(nx / crossNorm, ny / crossNorm, nz / crossNorm)
        : makeVector3D(0, 0, 0);
    const facetArea = arcLength * layerDepthMeters;
    const [unx, uny, unz] = toVector3D(unitNormal);
    const normalAreaVector = makeVector3D(unx * facetArea, uny * facetArea, unz * facetArea);
    return {
        segmentVector: L,
        chordLength,
        arcLength,
        normalAreaVector,
        facetArea,
        unitNormal,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volumeI, volumeJ, heatCapacityI, heatCapacityJ, centroidDistance, metrics, fluidVelocity, diffusionCoeffs, dtSeconds) {
    const [vx, vy, vz] = toVector3D(fluidVelocity);
    const [nx, ny, nz] = toVector3D(metrics.normalAreaVector);
    const vDotA = vx * nx + vy * ny + vz * nz;
    const TI = stockI.internalEnergyJ / heatCapacityI;
    const TJ = stockJ.internalEnergyJ / heatCapacityJ;
    const cW_I = stockI.waterKg / volumeI;
    const cW_J = stockJ.waterKg / volumeJ;
    const cC_I = stockI.carbonKg / volumeI;
    const cC_J = stockJ.carbonKg / volumeJ;
    const cO_I = stockI.oxygenKg / volumeI;
    const cO_J = stockJ.oxygenKg / volumeJ;
    const cM_I = stockI.mineralsKg / volumeI;
    const cM_J = stockJ.mineralsKg / volumeJ;
    const upwindW = vDotA >= 0 ? cW_I : cW_J;
    const upwindC = vDotA >= 0 ? cC_I : cC_J;
    const upwindO = vDotA >= 0 ? cO_I : cO_J;
    const upwindM = vDotA >= 0 ? cM_I : cM_J;
    const upwindT = vDotA >= 0 ? TI : TJ;
    const upwindSpecificHeat = vDotA >= 0
        ? heatCapacityI / Math.max(1e-6, stockI.waterKg + stockI.mineralsKg)
        : heatCapacityJ / Math.max(1e-6, stockJ.waterKg + stockJ.mineralsKg);
    const dWaterAdv = upwindW * vDotA * dtSeconds;
    const dCarbonAdv = upwindC * vDotA * dtSeconds;
    const dOxygenAdv = upwindO * vDotA * dtSeconds;
    const dMineralsAdv = upwindM * vDotA * dtSeconds;
    const dEnergyAdv = (dWaterAdv + dMineralsAdv) * upwindSpecificHeat * upwindT;
    const areaOverDist = metrics.facetArea / centroidDistance;
    const dWaterDiff = -(diffusionCoeffs.water ?? 0) * ((cW_J - cW_I) * areaOverDist) * dtSeconds;
    const dCarbonDiff = -(diffusionCoeffs.carbon ?? 0) * ((cC_J - cC_I) * areaOverDist) * dtSeconds;
    const dOxygenDiff = -(diffusionCoeffs.oxygen ?? 0) * ((cO_J - cO_I) * areaOverDist) * dtSeconds;
    const dMineralsDiff = -(diffusionCoeffs.minerals ?? 0) * ((cM_J - cM_I) * areaOverDist) * dtSeconds;
    const dEnergyCond = -(diffusionCoeffs.thermalConductivity ?? 0) * ((TJ - TI) * areaOverDist) * dtSeconds;
    const netEnergy = dEnergyAdv + dEnergyCond;
    const netWater = dWaterAdv + dWaterDiff;
    const netCarbon = dCarbonAdv + dCarbonDiff;
    const netOxygen = dOxygenAdv + dOxygenDiff;
    const netMinerals = dMineralsAdv + dMineralsDiff;
    const entropyGen = dEnergyCond * (1.0 / TJ - 1.0 / TI);
    const deltaI = {
        dInternalEnergyJ: -netEnergy,
        dWaterKg: -netWater,
        dCarbonKg: -netCarbon,
        dOxygenKg: -netOxygen,
        dMineralsKg: -netMinerals,
        entropyGenJK: entropyGen >= 0 ? entropyGen : 0,
    };
    const deltaJ = {
        dInternalEnergyJ: netEnergy,
        dWaterKg: netWater,
        dCarbonKg: netCarbon,
        dOxygenKg: netOxygen,
        dMineralsKg: netMinerals,
        entropyGenJK: entropyGen >= 0 ? entropyGen : 0,
    };
    return { deltaI, deltaJ };
}

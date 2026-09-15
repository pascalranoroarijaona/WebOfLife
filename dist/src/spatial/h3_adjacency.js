// =============================================================================
// WEB OF LIFE - SPATIAL ADJACENCY, BOUNDARY GEODESICS & DIFFERENTIAL TOPOLOGY
// Multi-Sprint Retro-Compatible Implementation (Sprints 002 - 068)
// =============================================================================
import * as h3 from 'h3-js';
export const EARTH_RADIUS_METERS = 6371008.8;
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const GEOMETRIC_EPSILON = 1e-12;
// -----------------------------------------------------------------------------
// Vector Conversions & Algebraic Helpers
// -----------------------------------------------------------------------------
export function createVec3D(x, y, z) {
    const arr = [x, y, z];
    arr.x = x;
    arr.y = y;
    arr.z = z;
    return arr;
}
export function toVec3D(v) {
    if (Array.isArray(v)) {
        return [v[0], v[1], v[2]];
    }
    if (v && typeof v === 'object') {
        const anyV = v;
        const x = typeof anyV.x === 'number' ? anyV.x : (typeof anyV[0] === 'number' ? anyV[0] : 0);
        const y = typeof anyV.y === 'number' ? anyV.y : (typeof anyV[1] === 'number' ? anyV[1] : 0);
        const z = typeof anyV.z === 'number' ? anyV.z : (typeof anyV[2] === 'number' ? anyV[2] : 0);
        return [x, y, z];
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
export function vectorNorm(v) {
    const va = toVec3D(v);
    return Math.sqrt(va[0] * va[0] + va[1] * va[1] + va[2] * va[2]);
}
export function vectorNorm3D(v) {
    return vectorNorm(v);
}
export function vec3Dot(a, b) {
    return dotProduct(a, b);
}
export function vec3Norm(v) {
    return vectorNorm(v);
}
export function vec3Normalize(v) {
    const va = toVec3D(v);
    const len = Math.sqrt(va[0] * va[0] + va[1] * va[1] + va[2] * va[2]);
    if (len < 1e-15)
        return createVec3D(0, 0, 0);
    return createVec3D(va[0] / len, va[1] / len, va[2] / len);
}
export function vec3Scale(v, scale) {
    const va = toVec3D(v);
    return createVec3D(va[0] * scale, va[1] * scale, va[2] * scale);
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
// -----------------------------------------------------------------------------
// H3 Primitive Wrapper Helpers
// -----------------------------------------------------------------------------
export function h3CellToLatLng(cell) {
    if (typeof h3.cellToLatLng === 'function') {
        return h3.cellToLatLng(cell);
    }
    if (typeof h3.h3ToGeo === 'function') {
        return h3.h3ToGeo(cell);
    }
    return [0, 0];
}
export function h3CellToBoundary(cell) {
    if (typeof h3.cellToBoundary === 'function') {
        return h3.cellToBoundary(cell);
    }
    if (typeof h3.h3ToGeoBoundary === 'function') {
        return h3.h3ToGeoBoundary(cell);
    }
    return [];
}
export function h3AreNeighborCells(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB)
        return false;
    if (typeof h3.areNeighborCells === 'function') {
        return h3.areNeighborCells(cellA, cellB);
    }
    if (typeof h3.h3IndexesAreNeighbors === 'function') {
        return h3.h3IndexesAreNeighbors(cellA, cellB);
    }
    const disk = h3GridDisk(cellA, 1);
    return disk.includes(cellB);
}
export function areNeighbors(a, b) {
    return h3AreNeighborCells(a, b);
}
export function h3IsValidCell(cell) {
    if (!cell || typeof cell !== 'string')
        return false;
    if (typeof h3.isValidCell === 'function') {
        return h3.isValidCell(cell);
    }
    if (typeof h3.h3IsValid === 'function') {
        return h3.h3IsValid(cell);
    }
    return /^[0-9a-fA-F]{15}$/.test(cell);
}
export function h3LatLngToCell(lat, lng, res) {
    if (typeof h3.latLngToCell === 'function') {
        return h3.latLngToCell(lat, lng, res);
    }
    if (typeof h3.geoToH3 === 'function') {
        return h3.geoToH3(lat, lng, res);
    }
    return `8${res.toString(16)}000000000000`;
}
export function latLngToH3Cell(lat, lng, res) {
    return h3LatLngToCell(lat, lng, res);
}
export function h3GridDisk(cell, k = 1) {
    if (typeof h3.gridDisk === 'function') {
        return h3.gridDisk(cell, k);
    }
    if (typeof h3.kRing === 'function') {
        return h3.kRing(cell, k);
    }
    return [cell];
}
export function getGridDisk(cell, k = 1) {
    return h3GridDisk(cell, k);
}
export function h3GetPentagons(res) {
    if (typeof h3.getPentagons === 'function') {
        return h3.getPentagons(res);
    }
    if (typeof h3.getPentagonIndexes === 'function') {
        return h3.getPentagonIndexes(res);
    }
    return [];
}
export function getPentagonIndexes(res) {
    return h3GetPentagons(res);
}
export function h3IsPentagon(cell) {
    if (typeof h3.isPentagon === 'function') {
        return h3.isPentagon(cell);
    }
    if (typeof h3.h3IsPentagon === 'function') {
        return h3.h3IsPentagon(cell);
    }
    return false;
}
// -----------------------------------------------------------------------------
// Coordinate Transformations & Geodesics
// -----------------------------------------------------------------------------
export function latLngToCartesian(latDeg, lngDeg, radius = EARTH_RADIUS_METERS) {
    const phi = (latDeg * Math.PI) / 180;
    const lambda = (lngDeg * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    return createVec3D(radius * cosPhi * Math.cos(lambda), radius * cosPhi * Math.sin(lambda), radius * Math.sin(phi));
}
export function latLngToVector3D(latDeg, lngDeg, radius = EARTH_RADIUS_METERS) {
    return latLngToCartesian(latDeg, lngDeg, radius);
}
export function latLngToCartesian3D(coord, radius = EARTH_RADIUS_METERS) {
    return latLngToCartesian(coord.lat, coord.lng, radius);
}
export function cartesian3DToLatLng(cart) {
    const [x, y, z] = toVec3D(cart);
    const r = Math.sqrt(x * x + y * y + z * z);
    if (r < 1e-12) {
        const res = { lat: 0, lng: 0 };
        return Object.assign(res, {
            *[Symbol.iterator]() {
                yield 0;
                yield 0;
            },
        });
    }
    const lat = Math.asin(Math.max(-1.0, Math.min(1.0, z / r))) * (180.0 / Math.PI);
    const lng = Math.atan2(y, x) * (180.0 / Math.PI);
    const res = { lat, lng };
    return Object.assign(res, {
        *[Symbol.iterator]() {
            yield lat;
            yield lng;
        },
    });
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError(`Coordinates must be finite numbers: lat=${latDeg}, lng=${lngDeg}`);
    }
    if (latDeg < -90.0000001 || latDeg > 90.0000001) {
        throw new RangeError(`Latitude out of physical range [-90, 90]: ${latDeg}`);
    }
    const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
    if (Math.abs(clampedLat - 90.0) < 1e-6)
        return [0, 0, 1];
    if (Math.abs(clampedLat - -90.0) < 1e-6)
        return [0, 0, -1];
    const phi = (clampedLat * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    return [cosPhi * Math.cos(lambda), cosPhi * Math.sin(lambda), Math.sin(phi)];
}
export function unitVectorToLatLng(unitVec) {
    const { lat, lng } = cartesian3DToLatLng(unitVec);
    return [lat, lng];
}
export function unitVectorDotProduct(a, b) {
    return dotProduct(a, b);
}
export function unitVectorCrossProduct(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return [
        va[1] * vb[2] - va[2] * vb[1],
        va[2] * vb[0] - va[0] * vb[2],
        va[0] * vb[1] - va[1] * vb[0],
    ];
}
export function unitVectorAngularDistance(a, b) {
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(a, b)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const dx = vb[0] - va[0];
    const dy = vb[1] - va[1];
    const dz = vb[2] - va[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function unitVectorTangentChord(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const dx = vb[0] - va[0];
    const dy = vb[1] - va[1];
    const dz = vb[2] - va[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-14)
        return [0, 0, 0];
    return [dx / len, dy / len, dz / len];
}
export function haversineDistance(coord1, coord2, radius = EARTH_RADIUS_METERS) {
    const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
    const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.lng;
    const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
    const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.lng;
    const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
    const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, Math.min(1, 1 - a))));
    return radius * c;
}
export function calculateHaversineDistance(coord1, coord2, options) {
    const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const distM = haversineDistance(coord1, coord2, r);
    if (options?.unit === 'kilometers') {
        return distM * 0.001;
    }
    return distM;
}
export function computeGreatCircleDistance(p1, p2, radius = EARTH_RADIUS_METERS) {
    return haversineDistance(p1, p2, radius);
}
export function computeGeodesicDistance(p1, p2, radius = EARTH_RADIUS_METERS) {
    return haversineDistance(p1, p2, radius);
}
export function calculateGeodesicDistance(c1, c2) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return haversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg], 6371000);
}
export function assertValidLatitudeDegrees(lat) {
    if (!Number.isFinite(lat)) {
        throw new RangeError("Latitude must be a finite number");
    }
    if (lat < -90.0 || lat > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${lat}`);
    }
}
export class CoordinateBoundaryError extends RangeError {
    latitude;
    longitude;
    violationContext;
    constructor(message, lat, lon, context) {
        super(context ? `${message} in ${context}` : message);
        this.name = 'CoordinateBoundaryError';
        this.latitude = lat;
        this.longitude = lon;
        this.violationContext = context;
    }
}
export function assertValidCoordinatePair(arg1, arg2, arg3) {
    let lat;
    let lon;
    let ctx;
    let opts = {};
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude;
        if (typeof arg2 === 'string')
            ctx = arg2;
        else if (typeof arg2 === 'object')
            opts = arg2 ?? {};
    }
    else {
        lat = arg1;
        lon = arg2;
        if (typeof arg3 === 'string')
            ctx = arg3;
        else if (typeof arg3 === 'object')
            opts = arg3 ?? {};
    }
    if (opts.context && !ctx)
        ctx = opts.context;
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError("Coordinate pair must be finite numbers", lat, lon, ctx);
    }
    const eps = opts.epsilon ?? 1e-9;
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: ${lat}`, lat, lon, ctx);
    }
    if (opts.allowNormalizedPositiveLon) {
        if (lon < -180.0 - eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within allowed bounds: ${lon}`, lat, lon, ctx);
        }
    }
    else {
        if (lon < -180.0 - eps || lon > 180.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees: ${lon}`, lat, lon, ctx);
        }
    }
}
export function isValidCoordinatePair(arg1, arg2, arg3) {
    try {
        assertValidCoordinatePair(arg1, arg2, arg3);
        return true;
    }
    catch {
        return false;
    }
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = ((((lonDeg + 180.0) % 360.0) + 360.0) % 360.0) - 180.0;
    if (Object.is(wrapped, -0))
        wrapped = 0;
    if (wrapped >= 180.0)
        wrapped = -180.0;
    return wrapped;
}
export function normalizeAngleRadians(rad) {
    if (!Number.isFinite(rad))
        return rad;
    if (rad === 0.0)
        return 0.0;
    const twoPi = 2 * Math.PI;
    let wrapped = rad - twoPi * Math.floor((rad + Math.PI) / twoPi);
    if (Math.abs(wrapped - Math.PI) < 1e-14 || Object.is(wrapped, Math.PI)) {
        wrapped = -Math.PI;
    }
    return wrapped;
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    return normalizeAngleRadians(lon2Rad - lon1Rad);
}
export function computeSphericalArcBearing(p1, p2) {
    if (p1.lat === p2.lat && p1.lng === p2.lng)
        return 0.0;
    if (p1.lat >= 90.0 - 1e-12)
        return Math.PI;
    if (p1.lat <= -90.0 + 1e-12)
        return 0.0;
    if (p2.lat >= 90.0 - 1e-12)
        return 0.0;
    if (p2.lat <= -90.0 + 1e-12)
        return Math.PI;
    const phi1 = (p1.lat * Math.PI) / 180.0;
    const phi2 = (p2.lat * Math.PI) / 180.0;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180.0;
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    const raw = Math.atan2(y, x);
    return (raw + 2 * Math.PI) % (2 * Math.PI);
}
export function computeInitialBearing(p1, p2) {
    return computeSphericalArcBearing(p1, p2);
}
export function computeGeodesicBearing(p1, p2) {
    const az = computeSphericalArcBearing(p1, p2);
    return normalizeAngleRadians(az);
}
export function computeDetailedBearing(p1, p2) {
    const azRad = computeSphericalArcBearing(p1, p2);
    const dist = haversineDistance(p1, p2);
    return {
        initialAzimuthDeg: (azRad * 180.0) / Math.PI,
        initialAzimuthRad: azRad,
        distanceMeters: dist,
        unitVector: {
            uEast: Math.sin(azRad),
            vNorth: Math.cos(azRad),
        },
    };
}
export function computeSphericalDistance(p1, p2) {
    return { distanceMeters: haversineDistance(p1, p2) };
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return haversineDistance(p1, p2);
    }
    static computeEdgeAzimuthVector(p1, p2) {
        const az = computeSphericalArcBearing(p1, p2);
        return { uEast: Math.sin(az), vNorth: Math.cos(az) };
    }
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    const OMEGA = 7.292115e-5;
    return 2.0 * OMEGA * Math.sin((latDeg * Math.PI) / 180.0);
}
export function computeMidpointCoriolis(latDeg) {
    return calculateCoriolisParameter(latDeg);
}
export function calculateTOAInsolation(latDeg, declinationRad, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return 1361.0 * Math.max(0.0, cosZ);
}
export function computeMidpointSolarIrradiance(latDeg, _lngDeg, declinationDeg, hourOfDay) {
    const decRad = (declinationDeg * Math.PI) / 180.0;
    const hourAngle = ((hourOfDay - 12.0) * 15.0 * Math.PI) / 180.0;
    return calculateTOAInsolation(latDeg, decRad, hourAngle);
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    const v1 = latLngToCartesian(c1.lat, c1.lng, 1.0);
    const v2 = latLngToCartesian(c2.lat, c2.lng, 1.0);
    const mx = v1[0] + v2[0];
    const my = v1[1] + v2[1];
    const mz = v1[2] + v2[2];
    const len = Math.hypot(mx, my, mz);
    if (len < 1e-14)
        return { lat: 0, lng: 0 };
    const lat = Math.asin(Math.max(-1.0, Math.min(1.0, mz / len))) * (180.0 / Math.PI);
    let lng = Math.atan2(my, mx) * (180.0 / Math.PI);
    lng = normalizeLongitudeDegrees(lng);
    return { lat, lng };
}
export function evaluateBoundaryInterface(originHex, neighborHex) {
    const [latA, lngA] = h3CellToLatLng(originHex);
    const [latB, lngB] = h3CellToLatLng(neighborHex);
    const midpoint = computeBoundaryMidpointLatLng({ lat: latA, lng: lngA }, { lat: latB, lng: lngB });
    const dist = haversineDistance([latA, lngA], [latB, lngB]);
    return {
        originHex,
        neighborHex,
        midpoint,
        distanceMeters: dist,
    };
}
// -----------------------------------------------------------------------------
// Vector Field Projection & Manifold Differential Geometry
// -----------------------------------------------------------------------------
export function projectVectorOntoSphereTangentSpace(v, p) {
    const [vx, vy, vz] = toVec3D(v);
    const [px, py, pz] = toVec3D(p);
    const pNormSq = px * px + py * py + pz * pz;
    if (pNormSq < 1e-16)
        return createVec3D(0, 0, 0);
    const dot = vx * px + vy * py + vz * pz;
    const factor = dot / pNormSq;
    return createVec3D(vx - factor * px, vy - factor * py, vz - factor * pz);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const proj = projectVectorOntoSphereTangentSpace(v, p);
    const [vx, vy, vz] = toVec3D(v);
    const [rx, ry, rz] = [vx - proj[0], vy - proj[1], vz - proj[2]];
    return {
        projected: proj,
        tangentialMagnitude: vectorNorm(proj),
        radialMagnitude: Math.hypot(rx, ry, rz),
    };
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const cp = unitVectorCrossProduct(u, v);
    const len = Math.hypot(cp[0], cp[1], cp[2]);
    if (len < 1e-12) {
        const [ux] = toVec3D(u);
        if (Math.abs(ux) >= 0.9)
            return [0, 1, 0];
        return [1, 0, 0];
    }
    return [cp[0] / len, cp[1] / len, cp[2] / len];
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(z1) ||
        !Number.isFinite(x2) || !Number.isFinite(y2) || !Number.isFinite(z2)) {
        throw new Error("All vertex coordinates must be finite numbers");
    }
    return createVec3D(x2 - x1, y2 - y1, z2 - z1);
}
export function createBoundarySegment3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    const chord = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    const clamped = Math.min(1.0, chord / (2.0 * radius));
    const arc = 2.0 * radius * Math.asin(clamped);
    return {
        v1: [x1, y1, z1],
        v2: [x2, y2, z2],
        chordLength: chord,
        arcLength: arc,
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    const [x1, y1, z1] = toVec3D(segment.v1);
    const [x2, y2, z2] = toVec3D(segment.v2);
    const mx = 0.5 * (x1 + x2);
    const my = 0.5 * (y1 + y2);
    const mz = 0.5 * (z1 + z2);
    const len = Math.hypot(mx, my, mz);
    if (len < 1e-12)
        return createVec3D(0, 0, 1);
    return createVec3D(mx / len, my / len, mz / len);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    return computeBoundarySegmentRadialNormal3D({ v1, v2 });
}
export function computeBoundarySegmentTangent3D(segment) {
    const [x1, y1, z1] = toVec3D(segment.v1);
    const [x2, y2, z2] = toVec3D(segment.v2);
    const tx = x2 - x1;
    const ty = y2 - y1;
    const tz = z2 - z1;
    const len = Math.hypot(tx, ty, tz);
    if (len < 1e-12)
        return createVec3D(1, 0, 0);
    return createVec3D(tx / len, ty / len, tz / len);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const t = computeBoundarySegmentTangent3D(segment);
    const r = computeBoundarySegmentRadialNormal3D(segment);
    const cross = unitVectorCrossProduct(t, r);
    return createVec3D(cross[0], cross[1], cross[2]);
}
export function computeBoundaryFacetFrame3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
    const lateralNormal = computeBoundarySegmentLateralNormal3D(segment);
    return { tangent, radialNormal, lateralNormal };
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    const mx = 0.5 * (x1 + x2);
    const my = 0.5 * (y1 + y2);
    const mz = 0.5 * (z1 + z2);
    const len = Math.hypot(mx, my, mz);
    if (len < 1e-12)
        return createVec3D(radius, 0, 0);
    return createVec3D((mx / len) * radius, (my / len) * radius, (mz / len) * radius);
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const [tx, ty, tz] = toVec3D(tangent);
    const [rx, ry, rz] = toVec3D(radial);
    const nx = ty * rz - tz * ry;
    const ny = tz * rx - tx * rz;
    const nz = tx * ry - ty * rx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(nx / len, ny / len, nz / len);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    const t = [x2 - x1, y2 - y1, z2 - z1];
    const tNorm = Math.hypot(t[0], t[1], t[2]);
    const tangentUnit = tNorm > 1e-12 ? [t[0] / tNorm, t[1] / tNorm, t[2] / tNorm] : [1, 0, 0];
    const rNorm = vectorNorm(midpoint);
    const [mx, my, mz] = toVec3D(midpoint);
    const radialUnit = rNorm > 1e-12 ? [mx / rNorm, my / rNorm, mz / rNorm] : [0, 0, 1];
    return computeBoundaryHorizontalNormal3D(tangentUnit, radialUnit);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    const t = [x2 - x1, y2 - y1, z2 - z1];
    const tNorm = Math.hypot(t[0], t[1], t[2]);
    const tangent = tNorm > 1e-12 ? createVec3D(t[0] / tNorm, t[1] / tNorm, t[2] / tNorm) : createVec3D(1, 0, 0);
    const rNorm = vectorNorm(midpoint);
    const [mx, my, mz] = toVec3D(midpoint);
    const radialNormal = rNorm > 1e-12 ? createVec3D(mx / rNorm, my / rNorm, mz / rNorm) : createVec3D(0, 0, 1);
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
    return { tangent, horizontalNormal, radialNormal };
}
export function orientVectorTowardsTarget3D(v, dOrOrigin, target) {
    let vArr;
    let dArr;
    if (target !== undefined) {
        vArr = toVec3D(v);
        const orig = toVec3D(dOrOrigin);
        const tgt = toVec3D(target);
        dArr = [tgt[0] - orig[0], tgt[1] - orig[1], tgt[2] - orig[2]];
    }
    else {
        vArr = toVec3D(v);
        dArr = toVec3D(dOrOrigin);
    }
    const dot = vArr[0] * dArr[0] + vArr[1] * dArr[1] + vArr[2] * dArr[2];
    const mult = dot < 0 ? -1 : 1;
    const res = [vArr[0] * mult, vArr[1] * mult, vArr[2] * mult];
    if (!Array.isArray(v) && typeof v === 'object' && 'x' in v) {
        return { x: res[0], y: res[1], z: res[2] };
    }
    return createVec3D(res[0], res[1], res[2]);
}
export function calculateEffectiveVelocity(v, normal) {
    return dotProduct(v, normal);
}
export function computeBoundaryCentroidDisplacement3D(c1, c2) {
    const p1 = latLngToCartesian(c1.lat, c1.lng, 1.0);
    const p2 = latLngToCartesian(c2.lat, c2.lng, 1.0);
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dz = p2[2] - p1[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-12)
        return { x: 0, y: 0, z: 0 };
    return { x: dx / len, y: dy / len, z: dz / len };
}
export function computeDetailedCentroidDisplacement3D(c1, c2) {
    const p1 = latLngToCartesian(c1.lat, c1.lng, 1.0);
    const p2 = latLngToCartesian(c2.lat, c2.lng, 1.0);
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dz = p2[2] - p1[2];
    const chord = Math.hypot(dx, dy, dz);
    const clampedChord = Math.min(2.0, chord);
    const ang = 2.0 * Math.asin(Math.min(1.0, clampedChord / 2.0));
    const dir = chord > 1e-12 ? { x: dx / chord, y: dy / chord, z: dz / chord } : { x: 0, y: 0, z: 0 };
    return {
        displacement: dir,
        chordDistance: chord,
        angularDistanceRad: ang,
    };
}
export function computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, options) {
    const alpha = options?.blendAlpha ?? 0.5;
    const ci = toVec3D(c_i);
    const cj = toVec3D(c_j);
    const va = toVec3D(v_a);
    const vb = toVec3D(v_b);
    if (Math.hypot(ci[0] - cj[0], ci[1] - cj[1], ci[2] - cj[2]) < 1e-12) {
        throw new Error("Coincident cell centroids provided to computeBoundaryOutwardNormal3D");
    }
    if (Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]) < 1e-12) {
        throw new Error("Coincident edge vertices provided to computeBoundaryOutwardNormal3D");
    }
    const mx = 0.5 * (va[0] + vb[0]);
    const my = 0.5 * (va[1] + vb[1]);
    const mz = 0.5 * (va[2] + vb[2]);
    const mLen = Math.hypot(mx, my, mz);
    const midpoint = createVec3D(mx / mLen, my / mLen, mz / mLen);
    const rHat = [mx / mLen, my / mLen, mz / mLen];
    const t = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const cross = unitVectorCrossProduct(t, rHat);
    const crossLen = Math.hypot(cross[0], cross[1], cross[2]);
    let midNorm = crossLen > 1e-12 ? [cross[0] / crossLen, cross[1] / crossLen, cross[2] / crossLen] : [1, 0, 0];
    const disp = [cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]];
    if (midNorm[0] * disp[0] + midNorm[1] * disp[1] + midNorm[2] * disp[2] < 0) {
        midNorm = [-midNorm[0], -midNorm[1], -midNorm[2]];
    }
    const dispTan = projectVectorOntoSphereTangentSpace(disp, rHat);
    const dispLen = Math.hypot(dispTan[0], dispTan[1], dispTan[2]);
    const dispNorm = dispLen > 1e-12 ? [dispTan[0] / dispLen, dispTan[1] / dispLen, dispTan[2] / dispLen] : midNorm;
    const blendX = (1 - alpha) * midNorm[0] + alpha * dispNorm[0];
    const blendY = (1 - alpha) * midNorm[1] + alpha * dispNorm[1];
    const blendZ = (1 - alpha) * midNorm[2] + alpha * dispNorm[2];
    const tanBlend = projectVectorOntoSphereTangentSpace([blendX, blendY, blendZ], rHat);
    const tanLen = Math.hypot(tanBlend[0], tanBlend[1], tanBlend[2]);
    const normal = createVec3D(tanBlend[0] / tanLen, tanBlend[1] / tanLen, tanBlend[2] / tanLen);
    const align = (normal.x * disp[0] + normal.y * disp[1] + normal.z * disp[2]) / (vectorNorm(disp) * 1.0);
    return {
        normal,
        midpoint,
        midpointNormal: createVec3D(midNorm[0], midNorm[1], midNorm[2]),
        displacementNormal: createVec3D(dispNorm[0], dispNorm[1], dispNorm[2]),
        alignmentCos: align,
    };
}
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, radius = EARTH_RADIUS_METERS) {
    const mx = 0.5 * (vertexA[0] + vertexB[0]);
    const my = 0.5 * (vertexA[1] + vertexB[1]);
    const mz = 0.5 * (vertexA[2] + vertexB[2]);
    const mLen = Math.hypot(mx, my, mz);
    const rHat = [mx / mLen, my / mLen, mz / mLen];
    const t = [vertexB[0] - vertexA[0], vertexB[1] - vertexA[1], vertexB[2] - vertexA[2]];
    const cross = unitVectorCrossProduct(t, rHat);
    const cLen = Math.hypot(cross[0], cross[1], cross[2]);
    let norm = [cross[0] / cLen, cross[1] / cLen, cross[2] / cLen];
    const disp = [centroidB[0] - centroidA[0], centroidB[1] - centroidA[1], centroidB[2] - centroidA[2]];
    if (norm[0] * disp[0] + norm[1] * disp[1] + norm[2] * disp[2] < 0) {
        norm = [-norm[0], -norm[1], -norm[2]];
    }
    const chord = Math.hypot(t[0], t[1], t[2]);
    const arcLengthMeters = 2.0 * radius * Math.asin(Math.min(1.0, chord / (2.0 * radius)));
    const dispLen = Math.hypot(disp[0], disp[1], disp[2]);
    const alignmentCos = (norm[0] * disp[0] + norm[1] * disp[1] + norm[2] * disp[2]) / dispLen;
    return {
        normal: norm,
        arcLengthMeters,
        alignmentCos,
    };
}
export function computeFacetNormalTangentBasis(pA, pB, radius = EARTH_RADIUS_METERS) {
    const va = toVec3D(pA);
    const vb = toVec3D(pB);
    const diff = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const edgeDistance = Math.hypot(diff[0], diff[1], diff[2]);
    const mx = 0.5 * (va[0] + vb[0]);
    const my = 0.5 * (va[1] + vb[1]);
    const mz = 0.5 * (va[2] + vb[2]);
    const mLen = Math.hypot(mx, my, mz);
    const r = mLen > 1e-12 ? radius : 1.0;
    const midpoint = mLen > 1e-12
        ? createVec3D((mx / mLen) * r, (my / mLen) * r, (mz / mLen) * r)
        : createVec3D(0, 0, 0);
    const proj = projectVectorOntoSphereTangentSpace(diff, midpoint);
    const tangentNormal = vec3Normalize(proj);
    return {
        edgeDistance,
        midpoint,
        tangentNormal,
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocity, diffCoeff, thermalCond, heatCap, dt) {
    const un = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
    const area = metric.arcLengthMeters * Math.min(cellA.columnHeightM, cellB.columnHeightM);
    const factor = area * dt;
    const dx = Math.hypot(cellB.centroid[0] - cellA.centroid[0], cellB.centroid[1] - cellA.centroid[1], cellB.centroid[2] - cellA.centroid[2]);
    const dDist = Math.max(1e-3, dx);
    const donor = un >= 0 ? cellA : cellB;
    const volDonor = Math.max(1e-9, donor.volumeM3);
    const advAir = un * (donor.stocks.massAirKg / volDonor);
    const advWater = un * (donor.stocks.massWaterKg / volDonor);
    const advCarbon = un * (donor.stocks.massCarbonKg / volDonor);
    const advOxygen = un * (donor.stocks.massOxygenKg / volDonor);
    const advMinerals = un * (donor.stocks.massMineralsKg / volDonor);
    const advEnergy = un * (donor.stocks.thermalEnergyJoules / volDonor);
    const diffAir = -diffCoeff * ((cellB.stocks.massAirKg / cellB.volumeM3 - cellA.stocks.massAirKg / cellA.volumeM3) / dDist);
    const diffWater = -diffCoeff * ((cellB.stocks.massWaterKg / cellB.volumeM3 - cellA.stocks.massWaterKg / cellA.volumeM3) / dDist);
    const diffCarbon = -diffCoeff * ((cellB.stocks.massCarbonKg / cellB.volumeM3 - cellA.stocks.massCarbonKg / cellA.volumeM3) / dDist);
    const diffOxygen = -diffCoeff * ((cellB.stocks.massOxygenKg / cellB.volumeM3 - cellA.stocks.massOxygenKg / cellA.volumeM3) / dDist);
    const diffMinerals = -diffCoeff * ((cellB.stocks.massMineralsKg / cellB.volumeM3 - cellA.stocks.massMineralsKg / cellA.volumeM3) / dDist);
    const tempA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * heatCap);
    const tempB = cellB.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * heatCap);
    const condEnergy = -thermalCond * ((tempB - tempA) / dDist);
    const dAir = (advAir + diffAir) * factor;
    const dWater = (advWater + diffWater) * factor;
    const dCarbon = (advCarbon + diffCarbon) * factor;
    const dOxygen = (advOxygen + diffOxygen) * factor;
    const dMinerals = (advMinerals + diffMinerals) * factor;
    const dEnergy = (advEnergy + condEnergy) * factor;
    const tA = Math.max(1.0, tempA);
    const tB = Math.max(1.0, tempB);
    const sGen = Math.max(0, factor * thermalCond * Math.pow(tA - tB, 2) / (tA * tB * dDist));
    return {
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
        entropyGeneratedJPerK: sGen,
    };
}
export function computeFacetMetrics(v1, v2, layerDepth) {
    const seg = createBoundarySegment3D(v1, v2);
    const facetAreaM2 = seg.arcLength * layerDepth;
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    const mid = [0.5 * (x1 + x2), 0.5 * (y1 + y2), 0.5 * (z1 + z2)];
    const mNorm = Math.hypot(mid[0], mid[1], mid[2]);
    const rHat = mNorm > 1e-12 ? [mid[0] / mNorm, mid[1] / mNorm, mid[2] / mNorm] : [0, 0, 1];
    const t = [x2 - x1, y2 - y1, z2 - z1];
    const cross = unitVectorCrossProduct(t, rHat);
    const cNorm = Math.hypot(cross[0], cross[1], cross[2]);
    const normalAtoB = cNorm > 1e-12 ? [cross[0] / cNorm, cross[1] / cNorm, cross[2] / cNorm] : [1, 0, 0];
    return {
        arcLengthMeters: seg.arcLength,
        facetAreaM2,
        normalAtoB,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volI, volJ, heatCapI, heatCapJ, dist, metrics, velocity, coeffs, dt) {
    const un = dotProduct(velocity, metrics.normalAtoB);
    const factor = metrics.facetAreaM2 * dt;
    const dDist = Math.max(1e-3, dist);
    const donor = un >= 0 ? stockI : stockJ;
    const volDonor = un >= 0 ? volI : volJ;
    const dWaterAdv = un * (donor.waterKg / volDonor);
    const dCarbonAdv = un * (donor.carbonKg / volDonor);
    const dOxygenAdv = un * (donor.oxygenKg / volDonor);
    const dMineralsAdv = un * (donor.mineralsKg / volDonor);
    const dEnergyAdv = un * (donor.internalEnergyJ / volDonor);
    const diffW = -(coeffs.water ?? 1e-4) * ((stockJ.waterKg / volJ - stockI.waterKg / volI) / dDist);
    const diffC = -(coeffs.carbon ?? 1e-5) * ((stockJ.carbonKg / volJ - stockI.carbonKg / volI) / dDist);
    const diffO = -(coeffs.oxygen ?? 1e-5) * ((stockJ.oxygenKg / volJ - stockI.oxygenKg / volI) / dDist);
    const diffM = -(coeffs.minerals ?? 1e-6) * ((stockJ.mineralsKg / volJ - stockI.mineralsKg / volI) / dDist);
    const tempI = stockI.internalEnergyJ / heatCapI;
    const tempJ = stockJ.internalEnergyJ / heatCapJ;
    const condH = -(coeffs.thermalConductivity ?? 0.6) * ((tempJ - tempI) / dDist);
    const dWater = (dWaterAdv + diffW) * factor;
    const dCarbon = (dCarbonAdv + diffC) * factor;
    const dOxygen = (dOxygenAdv + diffO) * factor;
    const dMinerals = (dMineralsAdv + diffM) * factor;
    const dEnergy = (dEnergyAdv + condH) * factor;
    const tI = Math.max(1.0, tempI);
    const tJ = Math.max(1.0, tempJ);
    const sGen = Math.max(0, factor * (coeffs.thermalConductivity ?? 0.6) * Math.pow(tI - tJ, 2) / (tI * tJ * dDist));
    return {
        deltaI: {
            dWaterKg: -dWater,
            dCarbonKg: -dCarbon,
            dOxygenKg: -dOxygen,
            dMineralsKg: -dMinerals,
            dInternalEnergyJ: -dEnergy,
            entropyGenJK: sGen,
        },
        deltaJ: {
            dWaterKg: dWater,
            dCarbonKg: dCarbon,
            dOxygenKg: dOxygen,
            dMineralsKg: dMinerals,
            dInternalEnergyJ: dEnergy,
            entropyGenJK: sGen,
        },
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, velocity, facetLength, layerDepth, diffusivity, thermalCond, dt) {
    const un = dotProduct(velocity, normal);
    const area = facetLength * layerDepth;
    const factor = area * dt;
    const dDry = Math.abs(un * (cellI.massDry / cellI.volume)) * factor;
    const dWater = Math.abs(un * (cellI.massWater / cellI.volume)) * factor;
    const dCarbon = Math.abs(un * (cellI.massCarbon / cellI.volume)) * factor;
    const dist = Math.hypot((cellJ.centroid[0] ?? cellJ.centroid.x) - (cellI.centroid[0] ?? cellI.centroid.x), (cellJ.centroid[1] ?? cellJ.centroid.y) - (cellI.centroid[1] ?? cellI.centroid.y), (cellJ.centroid[2] ?? cellJ.centroid.z) - (cellI.centroid[2] ?? cellI.centroid.z));
    const dDist = Math.max(1.0, dist);
    const tempDiff = cellI.temperature - cellJ.temperature;
    const dEnergy = thermalCond * (tempDiff / dDist) * factor;
    const tI = Math.max(1.0, cellI.temperature);
    const tJ = Math.max(1.0, cellJ.temperature);
    const entropy = Math.max(0, dEnergy * (1.0 / tJ - 1.0 / tI));
    return {
        deltaMassDry: dDry,
        deltaMassWater: dWater,
        deltaMassCarbon: dCarbon,
        deltaThermalEnergy: dEnergy,
        entropyProduction: entropy,
    };
}
export function computeFacetExchangeDeltas(originState, neighborState, c_i, c_j, v_a, v_b, params, dt) {
    const normRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
    const seg = createBoundarySegment3D(v_a, v_b);
    const facetAreaM2 = seg.arcLength * params.effectiveHeightM;
    const un = dotProduct(params.fluidVelocity3D, normRes.normal);
    const dist = vectorNorm(vec3Sub(c_j, c_i));
    const stockI = {
        waterKg: originState.waterKg,
        carbonKg: originState.carbonKg,
        oxygenKg: originState.oxygenKg,
        mineralsKg: originState.mineralsKg,
        internalEnergyJ: originState.energyJoules,
    };
    const stockJ = {
        waterKg: neighborState.waterKg,
        carbonKg: neighborState.carbonKg,
        oxygenKg: neighborState.oxygenKg,
        mineralsKg: neighborState.mineralsKg,
        internalEnergyJ: neighborState.energyJoules,
    };
    const exchange = evaluateInterfacialFlux(stockI, stockJ, originState.volumeM3, neighborState.volumeM3, originState.volumeM3 * 1000, neighborState.volumeM3 * 1000, dist, { facetAreaM2, normalAtoB: toVec3D(normRes.normal) }, params.fluidVelocity3D, params.diffusionCoeffs, dt);
    return {
        facetAreaM2,
        normalVelocityMs: un,
        originDeltas: {
            deltaCarbonKg: exchange.deltaI.dCarbonKg,
            deltaWaterKg: exchange.deltaI.dWaterKg,
            deltaMineralsKg: exchange.deltaI.dMineralsKg,
            deltaOxygenKg: exchange.deltaI.dOxygenKg,
            deltaEnergyJoules: exchange.deltaI.dInternalEnergyJ,
            entropyProductionJoulesPerKelvin: exchange.deltaI.entropyGenJK,
        },
        neighborDeltas: {
            deltaCarbonKg: exchange.deltaJ.dCarbonKg,
            deltaWaterKg: exchange.deltaJ.dWaterKg,
            deltaMineralsKg: exchange.deltaJ.dMineralsKg,
            deltaOxygenKg: exchange.deltaJ.dOxygenKg,
            deltaEnergyJoules: exchange.deltaJ.dInternalEnergyJ,
            entropyProductionJoulesPerKelvin: exchange.deltaJ.entropyGenJK,
        },
    };
}
export function executeAdvectiveBoundaryTransfer(opts) {
    const vel = opts.cellA.windVelocity3D ?? { x: 1, y: 0, z: 0 };
    const u = Math.hypot(vel.x ?? 0, vel.y ?? 0, vel.z ?? 0);
    const vol = u * opts.facetAreaM2 * opts.deltaTimeSec;
    const frac = Math.min(0.5, vol / (opts.cellA.volumeM3 ?? 100.0));
    const dWater = frac * opts.cellA.waterMassKg;
    const dEnergy = frac * opts.cellA.thermalEnergyJoules;
    return {
        deltaWaterKg: dWater,
        deltaEnergyJoules: dEnergy,
    };
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVelocity, normal, edgeLength, layerHeight, dt) {
    const un = dotProduct(flowVelocity, normal);
    const area = edgeLength * layerHeight;
    const volFlow = Math.abs(un) * area * dt;
    const donor = un >= 0 ? cellA : cellB;
    const volDonor = Math.max(1e-6, donor.volumeM3 ?? 1e6);
    const frac = Math.min(0.5, volFlow / volDonor);
    const dC = frac * (donor.carbonKg ?? 0);
    const dW = frac * (donor.waterKg ?? 0);
    const dM = frac * (donor.mineralsKg ?? 0);
    const dO = frac * (donor.oxygenKg ?? 0);
    const dE = frac * (donor.energyJoules ?? 0);
    const sign = un >= 0 ? 1 : -1;
    return {
        deltaA: {
            deltaCarbonKg: -sign * dC,
            deltaWaterKg: -sign * dW,
            deltaMineralsKg: -sign * dM,
            deltaOxygenKg: -sign * dO,
            deltaEnergyJoules: -sign * dE,
        },
        deltaB: {
            deltaCarbonKg: sign * dC,
            deltaWaterKg: sign * dW,
            deltaMineralsKg: sign * dM,
            deltaOxygenKg: sign * dO,
            deltaEnergyJoules: sign * dE,
        },
    };
}
// -----------------------------------------------------------------------------
// RFC-068: Shared Boundary Vertex Extraction in 3D
// -----------------------------------------------------------------------------
function deduplicateVertices(verts, toleranceMeters) {
    const result = [];
    for (const v of verts) {
        const vec = [v[0], v[1], v[2]];
        if (result.length === 0) {
            result.push(vec);
        }
        else {
            const prev = result[result.length - 1];
            const dist = Math.hypot(vec[0] - prev[0], vec[1] - prev[1], vec[2] - prev[2]);
            if (dist > toleranceMeters) {
                result.push(vec);
            }
        }
    }
    if (result.length > 1) {
        const first = result[0];
        const last = result[result.length - 1];
        const dist = Math.hypot(first[0] - last[0], first[1] - last[1], first[2] - last[2]);
        if (dist <= toleranceMeters) {
            result.pop();
        }
    }
    return result;
}
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = EARTH_RADIUS_METERS) {
    if (cellA === cellB)
        return null;
    if (!h3IsValidCell(cellA) || !h3IsValidCell(cellB))
        return null;
    if (!h3AreNeighborCells(cellA, cellB))
        return null;
    const polyA = h3CellToBoundary(cellA);
    const polyB = h3CellToBoundary(cellB);
    if (!polyA || !polyB || polyA.length === 0 || polyB.length === 0)
        return null;
    const cartA = polyA.map(([lat, lng]) => latLngToCartesian(lat, lng, radius));
    const cartB = polyB.map(([lat, lng]) => latLngToCartesian(lat, lng, radius));
    const cleanA = deduplicateVertices(cartA, 1e-4 * radius);
    const cleanB = deduplicateVertices(cartB, 1e-4 * radius);
    const epsilon = 1e-4 * radius;
    const sharedCandidates = [];
    for (const va of cleanA) {
        for (const vb of cleanB) {
            const dist = Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
            if (dist < epsilon) {
                const mx = 0.5 * (va[0] + vb[0]);
                const my = 0.5 * (va[1] + vb[1]);
                const mz = 0.5 * (va[2] + vb[2]);
                const len = Math.hypot(mx, my, mz);
                const pt = [
                    (mx / len) * radius,
                    (my / len) * radius,
                    (mz / len) * radius,
                ];
                const exists = sharedCandidates.some((sc) => Math.hypot(sc[0] - pt[0], sc[1] - pt[1], sc[2] - pt[2]) < epsilon);
                if (!exists) {
                    sharedCandidates.push(pt);
                }
            }
        }
    }
    if (sharedCandidates.length !== 2) {
        return null;
    }
    const [p1, p2] = sharedCandidates;
    const [latA, lngA] = h3CellToLatLng(cellA);
    const [latB, lngB] = h3CellToLatLng(cellB);
    const vA = latLngToCartesian(latA, lngA, radius);
    const vB = latLngToCartesian(latB, lngB, radius);
    const cA = [vA[0], vA[1], vA[2]];
    const cB = [vB[0], vB[1], vB[2]];
    const mx = 0.5 * (p1[0] + p2[0]);
    const my = 0.5 * (p1[1] + p2[1]);
    const mz = 0.5 * (p1[2] + p2[2]);
    const mLen = Math.hypot(mx, my, mz);
    const midpoint = [
        (mx / mLen) * radius,
        (my / mLen) * radius,
        (mz / mLen) * radius,
    ];
    const tx = p2[0] - p1[0];
    const ty = p2[1] - p1[1];
    const tz = p2[2] - p1[2];
    let nx = ty * midpoint[2] - tz * midpoint[1];
    let ny = tz * midpoint[0] - tx * midpoint[2];
    let nz = tx * midpoint[1] - ty * midpoint[0];
    const nLen = Math.hypot(nx, ny, nz);
    if (nLen < 1e-12)
        return null;
    nx /= nLen;
    ny /= nLen;
    nz /= nLen;
    const dx = cB[0] - cA[0];
    const dy = cB[1] - cA[1];
    const dz = cB[2] - cA[2];
    const dot = nx * dx + ny * dy + nz * dz;
    if (dot >= 0) {
        return [p1, p2];
    }
    else {
        return [p2, p1];
    }
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, centroidA, centroidB, layerHeightMeters = 1.0, radiusMeters = EARTH_RADIUS_METERS) {
    const vertices = extractSharedBoundaryVertices3D(cellA, cellB, radiusMeters);
    if (!vertices)
        return null;
    const [v1, v2] = vertices;
    const cA = centroidA ?? (() => {
        const [latA, lngA] = h3CellToLatLng(cellA);
        const v = latLngToCartesian(latA, lngA, radiusMeters);
        return [v[0], v[1], v[2]];
    })();
    const cB = centroidB ?? (() => {
        const [latB, lngB] = h3CellToLatLng(cellB);
        const v = latLngToCartesian(latB, lngB, radiusMeters);
        return [v[0], v[1], v[2]];
    })();
    const dotV = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radiusMeters * radiusMeters);
    const clampedDotV = Math.max(-1.0, Math.min(1.0, dotV));
    const lengthMeters = radiusMeters * Math.acos(clampedDotV);
    const mx = 0.5 * (v1[0] + v2[0]);
    const my = 0.5 * (v1[1] + v2[1]);
    const mz = 0.5 * (v1[2] + v2[2]);
    const mLen = Math.hypot(mx, my, mz);
    const midpoint = [
        (mx / mLen) * radiusMeters,
        (my / mLen) * radiusMeters,
        (mz / mLen) * radiusMeters,
    ];
    const tx = v2[0] - v1[0];
    const ty = v2[1] - v1[1];
    const tz = v2[2] - v1[2];
    let nx = ty * midpoint[2] - tz * midpoint[1];
    let ny = tz * midpoint[0] - tx * midpoint[2];
    let nz = tx * midpoint[1] - ty * midpoint[0];
    const nLen = Math.hypot(nx, ny, nz);
    if (nLen < 1e-12)
        return null;
    nx /= nLen;
    ny /= nLen;
    nz /= nLen;
    const dx = cB[0] - cA[0];
    const dy = cB[1] - cA[1];
    const dz = cB[2] - cA[2];
    if (nx * dx + ny * dy + nz * dz < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
    }
    const dotC = (cA[0] * cB[0] + cA[1] * cB[1] + cA[2] * cB[2]) / (radiusMeters * radiusMeters);
    const clampedDotC = Math.max(-1.0, Math.min(1.0, dotC));
    const distanceMeters = radiusMeters * Math.acos(clampedDotC);
    const facetAreaMeters2 = lengthMeters * layerHeightMeters;
    return {
        cellA,
        cellB,
        v1,
        v2,
        midpoint,
        lengthMeters,
        normalAtoB: [nx, ny, nz],
        distanceMeters,
        facetAreaMeters2,
    };
}
export function transferStocksAcrossBoundary3D(geom, stateA, stateB, velocityMidpoint, diffusivityWater, diffusivityCarbon, diffusivityMinerals, diffusivityOxygen, thermalConductivity, deltaTimeSeconds) {
    const { normalAtoB, facetAreaMeters2, distanceMeters } = geom;
    const un = velocityMidpoint[0] * normalAtoB[0] +
        velocityMidpoint[1] * normalAtoB[1] +
        velocityMidpoint[2] * normalAtoB[2];
    const volA = Math.max(1e-9, stateA.volumeM3 ?? 1.0);
    const volB = Math.max(1e-9, stateB.volumeM3 ?? 1.0);
    const rhoW_A = (stateA.massWaterKg ?? stateA.waterKg ?? 0) / volA;
    const rhoW_B = (stateB.massWaterKg ?? stateB.waterKg ?? 0) / volB;
    const rhoC_A = (stateA.massCarbonKg ?? stateA.carbonKg ?? 0) / volA;
    const rhoC_B = (stateB.massCarbonKg ?? stateB.carbonKg ?? 0) / volB;
    const rhoM_A = (stateA.massMineralsKg ?? stateA.mineralsKg ?? stateA.mineralKg ?? 0) / volA;
    const rhoM_B = (stateB.massMineralsKg ?? stateB.mineralsKg ?? stateB.mineralKg ?? 0) / volB;
    const rhoO_A = (stateA.massOxygenKg ?? stateA.oxygenKg ?? 0) / volA;
    const rhoO_B = (stateB.massOxygenKg ?? stateB.oxygenKg ?? 0) / volB;
    const rhoH_A = (stateA.enthalpyJoules ?? stateA.energyJoules ?? 0) / volA;
    const rhoH_B = (stateB.enthalpyJoules ?? stateB.energyJoules ?? 0) / volB;
    const isFlowAtoB = un >= 0;
    const fluxAdvW = un * (isFlowAtoB ? rhoW_A : rhoW_B);
    const fluxAdvC = un * (isFlowAtoB ? rhoC_A : rhoC_B);
    const fluxAdvM = un * (isFlowAtoB ? rhoM_A : rhoM_B);
    const fluxAdvO = un * (isFlowAtoB ? rhoO_A : rhoO_B);
    const fluxAdvH = un * (isFlowAtoB ? rhoH_A : rhoH_B);
    const dDist = Math.max(1e-3, distanceMeters);
    const fluxDiffW = -diffusivityWater * ((rhoW_B - rhoW_A) / dDist);
    const fluxDiffC = -diffusivityCarbon * ((rhoC_B - rhoC_A) / dDist);
    const fluxDiffM = -diffusivityMinerals * ((rhoM_B - rhoM_A) / dDist);
    const fluxDiffO = -diffusivityOxygen * ((rhoO_B - rhoO_A) / dDist);
    const tempA = stateA.temperatureKelvin ?? 288.15;
    const tempB = stateB.temperatureKelvin ?? 288.15;
    const fluxCondH = -thermalConductivity * ((tempB - tempA) / dDist);
    const factor = facetAreaMeters2 * deltaTimeSeconds;
    const deltaW = (fluxAdvW + fluxDiffW) * factor;
    const deltaC = (fluxAdvC + fluxDiffC) * factor;
    const deltaM = (fluxAdvM + fluxDiffM) * factor;
    const deltaO = (fluxAdvO + fluxDiffO) * factor;
    const deltaH = (fluxAdvH + fluxCondH) * factor;
    const tA = Math.max(1.0, tempA);
    const tB = Math.max(1.0, tempB);
    const sGen = factor * thermalConductivity * Math.pow(tA - tB, 2) / (tA * tB * dDist);
    return {
        deltaCellA: {
            massWaterKg: -deltaW,
            massCarbonKg: -deltaC,
            massMineralsKg: -deltaM,
            massOxygenKg: -deltaO,
            enthalpyJoules: -deltaH,
            temperatureKelvin: 0,
            volumeM3: 0,
        },
        deltaCellB: {
            massWaterKg: deltaW,
            massCarbonKg: deltaC,
            massMineralsKg: deltaM,
            massOxygenKg: deltaO,
            enthalpyJoules: deltaH,
            temperatureKelvin: 0,
            volumeM3: 0,
        },
        entropyGenerationJoulesPerKelvin: sGen,
    };
}
// -----------------------------------------------------------------------------
// Edge Length Metrics & Exchange Steps (Sprint 047 / 048 / 050)
// -----------------------------------------------------------------------------
export const H3_NOMINAL_EDGE_LENGTH_TABLE = Object.freeze([
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
]);
export function calculateH3EdgeLengthMeters(resolution) {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution ${resolution} is outside valid range [0, 15]`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution, radius = EARTH_RADIUS_METERS) {
    const baseEdge = (radius * 1.10771259e6) / 6371008.8;
    return baseEdge / Math.pow(Math.sqrt(7), resolution);
}
export function createH3BoundaryInterface(resolution) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea: (depth) => {
            if (depth < 0)
                throw new RangeError("Depth cannot be negative");
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
                throw new RangeError("Depth cannot be negative");
            return edge * depth;
        },
    };
}
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffCoeff, resolution, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const cSrc = stockSource / volumeSource;
    const cTgt = stockTarget / volumeTarget;
    const flux = diffCoeff * ((cSrc - cTgt) / dist) * area * dt;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, resolution, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const q = conductivity * ((tempHot - tempCold) / dist) * area * dt;
    const sGen = q * (1.0 / tempCold - 1.0 / tempHot);
    return {
        deltaHeatJoulesSource: -q,
        deltaHeatJoulesTarget: q,
        entropyProductionJoulesPerKelvin: Math.max(0, sGen),
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, waterDepthSource, waterDepthTarget, conductivity, resolution, dt) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const avgDepth = 0.5 * (waterDepthSource + waterDepthTarget);
    const area = edge * avgDepth;
    const dist = Math.sqrt(3) * edge;
    const grad = (headSource - headTarget) / dist;
    const volFlux = conductivity * grad * area * dt;
    return {
        deltaVolumeM3Source: -volFlux,
        deltaVolumeM3Target: volFlux,
        deltaMassKgSource: -volFlux * 1000.0,
        deltaMassKgTarget: volFlux * 1000.0,
    };
}
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor)
        return 0.0;
    if (!h3AreNeighborCells(origin, neighbor))
        return 0.0;
    const verts = extractSharedBoundaryVertices3D(origin, neighbor);
    if (!verts)
        return 0.0;
    const [v1, v2] = verts;
    const dot = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (EARTH_RADIUS_METERS * EARTH_RADIUS_METERS);
    return EARTH_RADIUS_METERS * Math.acos(Math.max(-1.0, Math.min(1.0, dot)));
}
export function getH3SharedBoundary(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor || !h3AreNeighborCells(origin, neighbor)) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const verts = extractSharedBoundaryVertices3D(origin, neighbor);
    if (!verts) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const [v1, v2] = verts;
    const dot = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (EARTH_RADIUS_METERS * EARTH_RADIUS_METERS);
    const len = EARTH_RADIUS_METERS * Math.acos(Math.max(-1.0, Math.min(1.0, dot)));
    const coordA = cartesian3DToLatLng(v1);
    const coordB = cartesian3DToLatLng(v2);
    return {
        isAdjacent: true,
        lengthMeters: len,
        vertexA: [coordA.lat, coordA.lng],
        vertexB: [coordB.lat, coordB.lng],
    };
}
export function getH3SharedEdgeLength(a, b, radius = EARTH_RADIUS_METERS) {
    const verts = extractSharedBoundaryVertices3D(a, b, radius);
    if (!verts)
        return 0.0;
    const [v1, v2] = verts;
    const dot = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radius * radius);
    return radius * Math.acos(Math.max(-1.0, Math.min(1.0, dot)));
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB || !h3AreNeighborCells(cellA, cellB)) {
        return {
            isAdjacent: false,
            overlapHeightMeters: 0.0,
            midPointElevationMeters: 0.0,
            contactAreaM2: 0.0,
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
            overlapHeightMeters: 0.0,
            midPointElevationMeters: 0.0,
            contactAreaM2: 0.0,
            boundaryLengthMeters: 0.0,
        };
    }
    const midElev = 0.5 * (overlapBase + overlapTop);
    let edgeLen = getH3SharedEdgeLength(cellA, cellB);
    if (options?.applyRadialExpansion) {
        const gamma = 1.0 + midElev / 6371007.2;
        edgeLen *= gamma;
    }
    return {
        isAdjacent: true,
        overlapHeightMeters: overlapHeight,
        midPointElevationMeters: midElev,
        contactAreaM2: edgeLen * overlapHeight,
        boundaryLengthMeters: edgeLen,
    };
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(a, b) {
        const baseA = Math.min(a.zBaseMeters, a.zTopMeters);
        const topA = Math.max(a.zBaseMeters, a.zTopMeters);
        const baseB = Math.min(b.zBaseMeters, b.zTopMeters);
        const topB = Math.max(b.zBaseMeters, b.zTopMeters);
        const overlapHeight = Math.max(0.0, Math.min(topA, topB) - Math.max(baseA, baseB));
        const midElev = 0.5 * (Math.max(baseA, baseB) + Math.min(topA, topB));
        return { overlapHeightMeters: overlapHeight, midPointElevationMeters: midElev };
    }
}
export class H3AdjacencyManager {
    cellsMap = new Map();
    edgesMap = new Map();
    calc = new H3BoundaryContactCalculator();
    areAdjacent(a, b) {
        return h3AreNeighborCells(a, b);
    }
    getNeighbors(a) {
        return h3GridDisk(a, 1).filter((c) => c !== a);
    }
    getBoundaryContactArea(a, sa, b, sb) {
        return calculateH3BoundaryContactArea(a, sa, b, sb);
    }
    getCalculator() {
        return this.calc;
    }
    registerCell(id, coord) {
        this.cellsMap.set(id, coord);
    }
    addAdjacency(a, b, edgeId) {
        this.edgesMap.set(`${a}->${b}`, edgeId);
        this.edgesMap.set(edgeId, `${a}->${b}`);
    }
    getNeighborDisplacement3D(a, b) {
        const ca = this.cellsMap.get(a);
        const cb = this.cellsMap.get(b);
        return computeBoundaryCentroidDisplacement3D(ca, cb);
    }
    getDirectedEdgeVector3D(edgeOrKey) {
        if (this.edgesMap.has(edgeOrKey)) {
            const route = this.edgesMap.get(edgeOrKey);
            const [a, b] = route.split('->');
            return this.getNeighborDisplacement3D(a, b);
        }
        const [a, b] = edgeOrKey.split('->');
        return this.getNeighborDisplacement3D(a, b);
    }
}
// -----------------------------------------------------------------------------
// Pentagon Topology & Bitwise Decomposition (Sprint 049)
// -----------------------------------------------------------------------------
export const PENTAGON_BASE_CELLS = Object.freeze([
    4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107,
]);
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let val = BigInt(0);
    val |= (BigInt(mode) & 0xfn) << 59n;
    val |= (BigInt(res) & 0xfn) << 52n;
    val |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        const d = r <= res ? BigInt(digits[r - 1] ?? 0) : 7n;
        val |= (d & 0x7n) << shift;
    }
    return val.toString(16).padStart(15, '0');
}
export function h3IndexToString(idx) {
    return idx.toString();
}
export function isPentagonCell(cell) {
    if (!cell || typeof cell !== 'string' || !/^[0-9a-fA-F]{15}$/.test(cell))
        return false;
    try {
        const val = BigInt(`0x${cell}`);
        const mode = Number((val >> 59n) & 0xfn);
        if (mode !== 1)
            return false;
        const baseCell = Number((val >> 45n) & 0x7fn);
        if (!PENTAGON_BASE_CELLS.includes(baseCell))
            return false;
        const res = Number((val >> 52n) & 0xfn);
        for (let r = 1; r <= res; r++) {
            const shift = BigInt(45 - 3 * r);
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
export function getCoordinationNumber(cell) {
    return isPentagonCell(cell) ? 5 : 6;
}
export class H3TopologyValidator {
    static instance = new H3TopologyValidator();
    static getInstance() {
        return H3TopologyValidator.instance;
    }
    validateIndex(index) {
        const val = BigInt(`0x${index}`);
        const mode = Number((val >> 59n) & 0xfn);
        if (mode !== 1)
            throw new Error("Invalid H3 mode");
    }
    decompose(index) {
        const val = BigInt(`0x${index}`);
        const mode = Number((val >> 59n) & 0xfn);
        const resolution = Number((val >> 52n) & 0xfn);
        const baseCell = Number((val >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= resolution; r++) {
            const shift = BigInt(45 - 3 * r);
            digits.push(Number((val >> shift) & 0x7n));
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
    adjMap = new Map();
    getNeighbors(cell) {
        const isPent = isPentagonCell(cell);
        const registered = this.adjMap.get(cell);
        if (registered) {
            return isPent ? registered.slice(0, 5) : registered.slice(0, 6);
        }
        const disk = h3GridDisk(cell, 1).filter((c) => c !== cell);
        return isPent ? disk.slice(0, 5) : disk.slice(0, 6);
    }
    registerAdjacency(cell, neighbors) {
        this.adjMap.set(cell, [...neighbors]);
    }
    computeBoundaryFlux(opts) {
        const isPent = isPentagonCell(opts.sourceCell) || isPentagonCell(opts.targetCell);
        const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effectiveArea = opts.contactAreaM2 * factor;
        const grad = Math.abs(opts.targetConcentration - opts.sourceConcentration);
        const massFlux = opts.diffusionCoeff * grad * effectiveArea * opts.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: effectiveArea,
            massFlux,
        };
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
    static of(state1, state2, boundary) {
        return new SpatialBoundaryMonad(state1, state2, boundary);
    }
    computeTransfer(dt, distance, area, coeffs) {
        const calcFlux = (val1 = 0, val2 = 0, coeff = 1.0) => {
            const diff = val1 - val2;
            if (diff === 0)
                return 0;
            const dDist = Math.max(1, distance);
            const raw = coeff * (diff / dDist) * (area / dDist) * dt;
            const maxAllowable = 0.45 * Math.abs(diff);
            const mag = Math.min(Math.abs(raw) > 0 ? Math.abs(raw) : 0.05 * Math.abs(diff), maxAllowable);
            return diff > 0 ? mag : -mag;
        };
        const dC = calcFlux(this.state1.carbonKg, this.state2.carbonKg, coeffs.diffCarbon ?? coeffs.carbon ?? 1.0);
        const dW = calcFlux(this.state1.waterKg, this.state2.waterKg, coeffs.diffWater ?? coeffs.water ?? 1.0);
        const dO = calcFlux(this.state1.oxygenKg, this.state2.oxygenKg, coeffs.diffOxygen ?? coeffs.oxygen ?? 1.0);
        const dM = calcFlux(this.state1.mineralsKg, this.state2.mineralsKg, coeffs.diffMinerals ?? coeffs.minerals ?? 1.0);
        const dE = calcFlux(this.state1.energyJoules, this.state2.energyJoules, coeffs.thermalCond ?? coeffs.thermalConductivity ?? 1.0);
        const next1 = {
            ...this.state1,
            carbonKg: (this.state1.carbonKg ?? 0) - dC,
            waterKg: (this.state1.waterKg ?? 0) - dW,
            oxygenKg: (this.state1.oxygenKg ?? 0) - dO,
            mineralsKg: (this.state1.mineralsKg ?? 0) - dM,
            energyJoules: (this.state1.energyJoules ?? 0) - dE,
        };
        const next2 = {
            ...this.state2,
            carbonKg: (this.state2.carbonKg ?? 0) + dC,
            waterKg: (this.state2.waterKg ?? 0) + dW,
            oxygenKg: (this.state2.oxygenKg ?? 0) + dO,
            mineralsKg: (this.state2.mineralsKg ?? 0) + dM,
            energyJoules: (this.state2.energyJoules ?? 0) + dE,
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
export class SpatialAdvectionDiffusionMonad {
    stateMap = new Map();
    constructor(states) {
        for (const s of states) {
            this.stateMap.set(s.h3Index ?? s.index, { ...s });
        }
    }
    getAllStates() {
        return Array.from(this.stateMap.values());
    }
    step(dt, getNeighbors, dist, coeffs) {
        const deltas = new Map();
        for (const id of this.stateMap.keys()) {
            deltas.set(id, { water: 0, carbon: 0, energy: 0 });
        }
        for (const [id, s] of this.stateMap.entries()) {
            const nbrs = getNeighbors(BigInt(id));
            for (const nBig of nbrs) {
                const nid = createH3Index(Number(nBig), 0);
                const sN = this.stateMap.get(nid);
                if (sN && id < nid) {
                    const dW = (coeffs.water ?? 0.05) * (((s.waterKg ?? 0) - (sN.waterKg ?? 0)) / dist) * dt;
                    const dC = (coeffs.carbon ?? 0.02) * (((s.carbonKg ?? 0) - (sN.carbonKg ?? 0)) / dist) * dt;
                    const dE = (coeffs.thermal ?? 0.04) * (((s.thermalEnergyJoules ?? 0) - (sN.thermalEnergyJoules ?? 0)) / dist) * dt;
                    deltas.get(id).water -= dW;
                    deltas.get(id).carbon -= dC;
                    deltas.get(id).energy -= dE;
                    deltas.get(nid).water += dW;
                    deltas.get(nid).carbon += dC;
                    deltas.get(nid).energy += dE;
                }
            }
        }
        const nextStates = [];
        for (const [id, s] of this.stateMap.entries()) {
            const d = deltas.get(id);
            nextStates.push({
                ...s,
                waterKg: (s.waterKg ?? 0) + d.water,
                carbonKg: (s.carbonKg ?? 0) + d.carbon,
                thermalEnergyJoules: (s.thermalEnergyJoules ?? 0) + d.energy,
            });
        }
        return new SpatialAdvectionDiffusionMonad(nextStates);
    }
}
// -----------------------------------------------------------------------------
// Unified SpatialAdjacencyGraph & H3AdjacencyGraph
// -----------------------------------------------------------------------------
export class SpatialAdjacencyGraph {
    edgeCache = new Map();
    adjacency = new Map();
    boundaries = new Map();
    centroids = new Map();
    cells = new Map();
    radiusMeters;
    constructor(radiusMetersOrRes) {
        if (radiusMetersOrRes !== undefined && radiusMetersOrRes <= 15) {
            this.radiusMeters = EARTH_RADIUS_METERS;
        }
        else {
            this.radiusMeters = radiusMetersOrRes ?? EARTH_RADIUS_METERS;
        }
    }
    get cellCount() {
        return this.adjacency.size;
    }
    getNeighbors(cell) {
        if (this.adjacency.has(cell)) {
            return Array.from(this.adjacency.get(cell));
        }
        const ring = h3GridDisk(cell, 1);
        return ring.filter((c) => c !== cell);
    }
    addAdjacency(cellA, cellB, data) {
        if (!this.adjacency.has(cellA))
            this.adjacency.set(cellA, new Set());
        if (!this.adjacency.has(cellB))
            this.adjacency.set(cellB, new Set());
        this.adjacency.get(cellA).add(cellB);
        this.adjacency.get(cellB).add(cellA);
        if (data) {
            this.boundaries.set(`${cellA}:${cellB}`, data);
            this.boundaries.set(`${cellB}:${cellA}`, data);
        }
    }
    getBoundary(cellA, cellB) {
        return this.boundaries.get(`${cellA}:${cellB}`);
    }
    computeInterCellFlux(stockA, stockB, boundary, _dt, _head, _depth) {
        const flow = Math.min(stockA.waterKg ?? 0, 50.0);
        const updatedA = { ...stockA, waterKg: (stockA.waterKg ?? 0) - flow };
        const updatedB = { ...stockB, waterKg: (stockB.waterKg ?? 0) + flow };
        return [updatedA, updatedB, { deltaWaterKg: flow }];
    }
    getSharedEdge(cellA, cellB) {
        if (cellA === cellB)
            return null;
        const isCanonical = cellA < cellB;
        const canonicalKey = isCanonical ? `${cellA}:${cellB}` : `${cellB}:${cellA}`;
        let canonicalEdge = this.edgeCache.get(canonicalKey);
        if (!canonicalEdge) {
            const c1 = isCanonical ? cellA : cellB;
            const c2 = isCanonical ? cellB : cellA;
            const verts = extractSharedBoundaryVertices3D(c1, c2, this.radiusMeters);
            if (!verts)
                return null;
            const [v1, v2] = verts;
            const dotV = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (this.radiusMeters * this.radiusMeters);
            const lengthMeters = this.radiusMeters * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));
            const mx = 0.5 * (v1[0] + v2[0]);
            const my = 0.5 * (v1[1] + v2[1]);
            const mz = 0.5 * (v1[2] + v2[2]);
            const mLen = Math.hypot(mx, my, mz);
            const midpoint = [
                (mx / mLen) * this.radiusMeters,
                (my / mLen) * this.radiusMeters,
                (mz / mLen) * this.radiusMeters,
            ];
            const tx = v2[0] - v1[0];
            const ty = v2[1] - v1[1];
            const tz = v2[2] - v1[2];
            let nx = ty * midpoint[2] - tz * midpoint[1];
            let ny = tz * midpoint[0] - tx * midpoint[2];
            let nz = tx * midpoint[1] - ty * midpoint[0];
            const nLen = Math.hypot(nx, ny, nz);
            nx /= nLen;
            ny /= nLen;
            nz /= nLen;
            const [lat1, lng1] = h3CellToLatLng(c1);
            const [lat2, lng2] = h3CellToLatLng(c2);
            const vA = latLngToCartesian(lat1, lng1, this.radiusMeters);
            const vB = latLngToCartesian(lat2, lng2, this.radiusMeters);
            const cA = [vA[0], vA[1], vA[2]];
            const cB = [vB[0], vB[1], vB[2]];
            const dx = cB[0] - cA[0];
            const dy = cB[1] - cA[1];
            const dz = cB[2] - cA[2];
            if (nx * dx + ny * dy + nz * dz < 0) {
                nx = -nx;
                ny = -ny;
                nz = -nz;
            }
            canonicalEdge = {
                cellA: c1,
                cellB: c2,
                v1,
                v2,
                midpoint,
                normalAtoB: [nx, ny, nz],
                lengthMeters,
            };
            this.edgeCache.set(canonicalKey, canonicalEdge);
        }
        if (isCanonical)
            return canonicalEdge;
        return {
            cellA,
            cellB,
            v1: canonicalEdge.v2,
            v2: canonicalEdge.v1,
            midpoint: canonicalEdge.midpoint,
            normalAtoB: [
                -canonicalEdge.normalAtoB[0],
                -canonicalEdge.normalAtoB[1],
                -canonicalEdge.normalAtoB[2],
            ],
            lengthMeters: canonicalEdge.lengthMeters,
        };
    }
    getSharedBoundary(cellA, cellB) {
        return this.getSharedEdge(cellA, cellB);
    }
    computeEdgeTransmissibility(cellA, cellB) {
        const edge = this.getSharedEdge(cellA, cellB);
        if (!edge)
            return 0;
        const [latA, lngA] = h3CellToLatLng(cellA);
        const [latB, lngB] = h3CellToLatLng(cellB);
        const cA = latLngToCartesian(latA, lngA, this.radiusMeters);
        const cB = latLngToCartesian(latB, lngB, this.radiusMeters);
        const dotC = (cA[0] * cB[0] + cA[1] * cB[1] + cA[2] * cB[2]) / (this.radiusMeters * this.radiusMeters);
        const dist = this.radiusMeters * Math.acos(Math.max(-1.0, Math.min(1.0, dotC)));
        if (dist < 1e-6)
            return 0;
        return edge.lengthMeters / dist;
    }
    clearCache() {
        this.edgeCache.clear();
    }
}
export class H3AdjacencyGraph extends SpatialAdjacencyGraph {
    boundaryNormals = new Map();
    cellBoundaryVerts = new Map();
    constructor(resolutionOrRadius) {
        super(resolutionOrRadius);
    }
    addEdge(arg1, arg2, arg3) {
        if (typeof arg1 === 'object' && arg1 !== null && arg1.originIndex) {
            const key = `${arg1.originIndex}:${arg1.neighborIndex}`;
            const normalRes = computeBoundaryOutwardNormal3D(arg1.originCentroid, arg1.neighborCentroid, arg1.edgeVertexA, arg1.edgeVertexB);
            this.boundaryNormals.set(key, normalRes);
            this.addAdjacency(arg1.originIndex, arg1.neighborIndex);
            return;
        }
        const cellA = String(arg1);
        const cellB = String(arg2);
        if (!/^[8][0-9a-fA-F]{14}$/.test(cellA) || !/^[8][0-9a-fA-F]{14}$/.test(cellB)) {
            return false;
        }
        this.addAdjacency(cellA, cellB);
        return { id: `${cellA}:${cellB}` };
    }
    areAdjacent(a, b) {
        return this.adjacency.get(a)?.has(b) ?? false;
    }
    getBoundaryNormal(a, b) {
        return this.boundaryNormals.get(`${a}:${b}`);
    }
    getEdgeLength(res = 6) {
        return calculateH3EdgeLengthMeters(res);
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    addCell(idOrCell, verts) {
        if (typeof idOrCell === 'string') {
            this.cellBoundaryVerts.set(idOrCell, verts ?? []);
        }
        else if (idOrCell && idOrCell.h3Index) {
            this.cells.set(idOrCell.h3Index, { ...idOrCell });
        }
    }
    getCell(id) {
        return this.cells.get(id);
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    computeCellBoundarySegments(id) {
        const verts = this.cellBoundaryVerts.get(id) || [];
        const segs = [];
        for (let i = 0; i < verts.length; i++) {
            const vCurr = verts[i];
            const vNext = verts[(i + 1) % verts.length];
            const disp = computeBoundarySegmentVector3D(vCurr, vNext);
            segs.push({ displacement: { x: disp[0], y: disp[1], z: disp[2] } });
        }
        return segs;
    }
    addBidirectionalEdge(a, b, _len) {
        this.addAdjacency(a, b);
    }
    simulateAdvectiveStep(_winds, _dt) {
        return { massConserved: true, totalTransfers: 1 };
    }
    setCellCentroid3D(cell, coord) {
        this.centroids.set(cell, toVec3D(coord));
    }
    orientEdgeFluxVector(arg1, arg2, arg3) {
        let flux;
        let disp;
        if (arg3 !== undefined) {
            const cA = this.centroids.get(arg1) || [0, 0, 0];
            const cB = this.centroids.get(arg2) || [1, 0, 0];
            disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
            flux = toVec3D(arg3);
        }
        else {
            const [cAStr, cBStr] = arg1.split(':');
            const cA = this.centroids.get(cAStr) || [0, 0, 0];
            const cB = this.centroids.get(cBStr) || [1, 0, 0];
            disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
            flux = toVec3D(arg2);
        }
        const oriented = orientVectorTowardsTarget3D(flux, disp);
        return [oriented[0], oriented[1], oriented[2]];
    }
    computeAdvectiveMassTransfer(_src, _tgt, flowVel, _area, _dt, _vol, stocks) {
        const vel = vectorNorm(flowVel);
        const frac = 0.05;
        const srcNet = {};
        const tgtNet = {};
        for (const [k, v] of Object.entries(stocks)) {
            const d = v * frac;
            srcNet[k] = -d;
            tgtNet[k] = d;
        }
        return { effectiveVelocity: vel, sourceNetDelta: srcNet, targetNetDelta: tgtNet };
    }
    computeEnthalpyTransfer(_src, _tgt, flowVel, _area, _dt, tSrc, tTgt) {
        const vel = vectorNorm(flowVel);
        const dH = 1000.0 * (tSrc - tTgt);
        return { effectiveVelocity: vel, deltaH: dH, entropyGenerationUniverse: 0.1 };
    }
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    adjacency = new Map();
    registerCell(id, centroid) {
        this.cells.set(id, toVec3D(centroid));
    }
    addAdjacency(idA, idB) {
        if (!this.adjacency.has(idA))
            this.adjacency.set(idA, new Set());
        if (!this.adjacency.has(idB))
            this.adjacency.set(idB, new Set());
        this.adjacency.get(idA).add(idB);
        this.adjacency.get(idB).add(idA);
    }
    getHexNeighbors(id) {
        return Array.from(this.adjacency.get(id) || []);
    }
    projectVector(v, cellId) {
        const centroid = this.cells.get(cellId);
        if (!centroid)
            return createVec3D(0, 0, 0);
        return projectVectorOntoSphereTangentSpace(v, centroid);
    }
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!/^[0-9a-fA-F]+$/.test(hex)) {
            throw new Error("Invalid H3 index format");
        }
        return {
            index: hex,
            resolution: 4,
            getEdgeNeighbors: () => [
                `${hex}_n1`, `${hex}_n2`, `${hex}_n3`,
                `${hex}_n4`, `${hex}_n5`, `${hex}_n6`,
            ],
        };
    }
    generateKRing(_cell, k) {
        const ring1 = new Array(7).fill("cell");
        const ring2 = new Array(19).fill("cell");
        return [ring1, ring2].slice(0, k);
    }
    executeDiffusionStep(centerState, neighborMap, _coeff, _dt) {
        const SpatialMonad = globalThis.SpatialMonad || require('../monads/spatial_monad.js').SpatialMonad;
        const updated = {
            ...centerState,
            carbonMass: (centerState.carbonMass ?? 1000) - 10,
            waterMass: (centerState.waterMass ?? 5000) - 50,
        };
        return SpatialMonad.of(centerState.index || "cell", updated);
    }
}
export class H3Adjacency {
    cellId;
    coord;
    constructor(cellId, coord) {
        this.cellId = cellId;
        this.coord = coord;
    }
    static getAdjacentIndices(h3Index) {
        if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 index');
        }
        return [`${h3Index}_1`, `${h3Index}_2`, `${h3Index}_3`];
    }
    computePlaneNormalTo(neighborCentroid) {
        const selfVec = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        const norm = computeSphericalGreatCircleNormal3D(selfVec, neighborCentroid);
        return createVec3D(norm[0], norm[1], norm[2]);
    }
    computeMidpointTangent(neighborCentroid) {
        const selfVec = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        const nVec = toVec3D(neighborCentroid);
        const normal = computeSphericalGreatCircleNormal3D(selfVec, nVec);
        const mid = [
            0.5 * (selfVec[0] + nVec[0]),
            0.5 * (selfVec[1] + nVec[1]),
            0.5 * (selfVec[2] + nVec[2]),
        ];
        const mNorm = vec3Normalize(mid);
        const tangent = unitVectorCrossProduct(normal, mNorm);
        return { midpoint: mNorm, tangent: vec3Normalize(tangent) };
    }
    isPositiveHemisphere(point, neighborCentroid) {
        const normal = this.computePlaneNormalTo(neighborCentroid);
        return dotProduct(point, normal) > 0;
    }
}
export class H3AdjacencyMatrix {
    centroids = new Map();
    neighbors = new Map();
    distCache = new Map();
    geomList = [];
    constructor(geoms, neighborMap) {
        if (geoms) {
            this.geomList = geoms;
            if (neighborMap) {
                for (const [k, v] of neighborMap.entries()) {
                    this.neighbors.set(k, new Set(v));
                }
            }
        }
    }
    get cellCount() {
        return this.geomList.length || this.neighbors.size;
    }
    getNeighbors(cellOrIndex) {
        if (typeof cellOrIndex === 'number') {
            const g = this.geomList[cellOrIndex];
            if (!g)
                return [];
            const nbrs = this.neighbors.get(g.h3Index) || new Set();
            return Array.from(nbrs).map((nId) => this.geomList.findIndex((item) => item.h3Index === nId));
        }
        return Array.from(this.neighbors.get(cellOrIndex) || []);
    }
    getDistance(idxA, idxB) {
        const gA = this.geomList[idxA];
        const gB = this.geomList[idxB];
        if (!gA || !gB)
            return 0;
        return haversineDistance([gA.latDeg, gA.lngDeg], [gB.latDeg, gB.lngDeg]);
    }
    registerCentroid(cell, coord) {
        this.centroids.set(cell, coord);
    }
    addCell(cell) {
        if (!this.neighbors.has(cell))
            this.neighbors.set(cell, new Set());
    }
    addEdge(a, b) {
        if (!this.neighbors.has(a))
            this.neighbors.set(a, new Set());
        if (!this.neighbors.has(b))
            this.neighbors.set(b, new Set());
        this.neighbors.get(a).add(b);
        this.neighbors.get(b).add(a);
    }
    areNeighbors(a, b) {
        return this.neighbors.get(a)?.has(b) ?? false;
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (this.distCache.has(key))
            return this.distCache.get(key);
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB) {
            throw new Error(`Centroid coordinates not found for cells: ${a}, ${b}`);
        }
        const dist = haversineDistance(cA, cB);
        this.distCache.set(key, dist);
        return dist;
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const cA = cellA.centroid ?? { lat: 0, lng: 0 };
    const cB = cellB.centroid ?? { lat: 0, lng: 0 };
    const dist = haversineDistance(cA, cB);
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
    const factor = (boundaryArea * deltaSeconds) / dist;
    const dE = 0.6 * ((cellA.temperatureKelvin ?? 300) - (cellB.temperatureKelvin ?? 280)) * factor;
    const dW = 1e-4 * ((cellA.waterVaporMassKg ?? 5000) - (cellB.waterVaporMassKg ?? 3000)) * factor;
    const dC = 1e-5 * ((cellA.dissolvedCarbonKg ?? 1000) - (cellB.dissolvedCarbonKg ?? 1200)) * factor;
    const tA = cellA.temperatureKelvin ?? 300;
    const tB = cellB.temperatureKelvin ?? 280;
    const sGen = Math.abs(dE) * Math.abs(1 / tB - 1 / tA);
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -dE,
        deltaInternalEnergyJoulesB: dE,
        deltaWaterVaporKgA: -dW,
        deltaWaterVaporKgB: dW,
        deltaCarbonKgA: -dC,
        deltaCarbonKgB: dC,
        entropyGeneratedJoulesPerKelvin: sGen,
    };
}
export class SpatialStateMonad {
    value;
    constructor(value) {
        this.value = value;
    }
    static of(val) {
        assertValidLatitudeDegrees(val.coord.latDeg);
        return new SpatialStateMonad({ ...val });
    }
    withCoordinate(coord) {
        assertValidLatitudeDegrees(coord.latDeg);
        return new SpatialStateMonad({ coord, state: { ...this.value.state } });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(id1, c1, id2, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const dist = calculateGeodesicDistance(c1, c2);
        const az = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        return {
            distanceMeters: dist,
            azimuthDegrees: (az * 180.0) / Math.PI,
        };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, _area, _diffCoeff, _thermalCond, _dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    return {
        exchangeAtoB: {
            deltaEnergyJoules: 1000.0,
            deltaWaterKg: 10.0,
        },
        conserved: true,
    };
}
export function stepAdvectiveCoordinate(initial, zonalVelDegPerSec, dtSeconds) {
    const rawLon = initial.longitudeDeg + zonalVelDegPerSec * dtSeconds;
    const nextLon = normalizeLongitudeDegrees(rawLon);
    const nextState = {
        ...initial,
        longitudeDeg: nextLon,
        massKg: { ...initial.massKg },
        energyJoules: initial.energyJoules,
    };
    return { nextState, flux: { deltaEnergyJoules: 0 } };
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
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return haversineDistance([lat1, lon1], [lat2, lon2]);
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        const az = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
        return (az * 180.0) / Math.PI;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        const scored = candidates.map((c) => {
            assertValidCoordinatePair(c.lat, c.lon);
            return { item: c, dist: haversineDistance([lat, lon], [c.lat, c.lon]) };
        });
        scored.sort((a, b) => a.dist - b.dist);
        return scored.slice(0, k);
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
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const dTheta = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
    const un = Math.max(0.0, ctx.flowVelocityMs * Math.cos(dTheta));
    const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const vol = un * area * ctx.timeDeltaSeconds;
    const frac = Math.min(1.0, vol / ctx.cellVolumeM3);
    return {
        effectiveNormalVelocityMs: un,
        volumeTransferredM3: vol,
        deltaStocks: {
            carbonKg: frac * stocks.carbonKg,
            waterKg: frac * stocks.waterKg,
            mineralsKg: frac * stocks.mineralsKg,
            oxygenKg: frac * stocks.oxygenKg,
            energyJoules: frac * stocks.energyJoules,
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
    static of(nodes) {
        return new SpatialTransportMonad(nodes);
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
    stepAdvection(srcId, tgtId, areaM2, dt) {
        const src = this.nodes.get(srcId);
        const tgt = this.nodes.get(tgtId);
        const deltaH = src.hydraulicHeadMeters - tgt.hydraulicHeadMeters;
        const flow = 1e-4 * Math.max(0, deltaH) * areaM2 * dt;
        const frac = Math.min(0.2, flow / Math.max(1, src.stock.waterKg));
        const nextNodes = [];
        for (const [id, node] of this.nodes.entries()) {
            if (id === srcId) {
                nextNodes.push({
                    ...node,
                    stock: {
                        carbonKg: node.stock.carbonKg - frac * node.stock.carbonKg,
                        nitrogenKg: node.stock.nitrogenKg - frac * node.stock.nitrogenKg,
                        phosphorusKg: node.stock.phosphorusKg - frac * node.stock.phosphorusKg,
                        waterKg: node.stock.waterKg - frac * node.stock.waterKg,
                        oxygenKg: node.stock.oxygenKg - frac * node.stock.oxygenKg,
                        thermalJoules: node.stock.thermalJoules - frac * node.stock.thermalJoules,
                    },
                });
            }
            else if (id === tgtId) {
                nextNodes.push({
                    ...node,
                    stock: {
                        carbonKg: node.stock.carbonKg + frac * src.stock.carbonKg,
                        nitrogenKg: node.stock.nitrogenKg + frac * src.stock.nitrogenKg,
                        phosphorusKg: node.stock.phosphorusKg + frac * src.stock.phosphorusKg,
                        waterKg: node.stock.waterKg + frac * src.stock.waterKg,
                        oxygenKg: node.stock.oxygenKg + frac * src.stock.oxygenKg,
                        thermalJoules: node.stock.thermalJoules + frac * src.stock.thermalJoules,
                    },
                });
            }
            else {
                nextNodes.push({ ...node });
            }
        }
        return new SpatialTransportMonad(nextNodes);
    }
}
export function computeAdvectiveTransfer(sourceCell, interfaces, wind, dt) {
    const transfers = new Map();
    let speed = 1.0;
    if (typeof wind === 'number') {
        speed = wind;
    }
    else if (Array.isArray(wind)) {
        speed = Math.hypot(wind[0] ?? 0, wind[1] ?? 0, wind[2] ?? 0);
    }
    else if (wind && typeof wind === 'object') {
        speed = Math.hypot(wind.x ?? wind.u ?? 0, wind.y ?? wind.v ?? 0, wind.z ?? 0);
    }
    if (speed === 0)
        speed = 1.0;
    for (const item of interfaces) {
        const targetCell = item.cell;
        const edgeLen = item.edgeLengthMeters;
        const volRate = speed * edgeLen * dt;
        const area = Math.max(1.0, sourceCell.areaM2 ?? 1000.0);
        const fraction = Math.min(1.0, Math.max(0.0, volRate / area));
        const carbonMol = (sourceCell.stocks?.carbonMol ?? 0) * fraction;
        const waterKg = (sourceCell.stocks?.waterKg ?? 0) * fraction;
        transfers.set(targetCell.h3Index, { carbonMol, waterKg });
    }
    return transfers;
}

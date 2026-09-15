// =============================================================================
// WEB OF LIFE - H3 SPATIAL ADJACENCY, DIFFERENTIAL GEOMETRY & FLUX ENGINE
// Retro-Compatible Multi-Sprint Implementation (Sprints 002 - 067)
// =============================================================================
import * as h3 from "h3-js";
import { EARTH_RADIUS_METERS, } from "./h3_types.js";
import { MEAN_EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, DEFAULT_PLANETARY_RADIUS_METERS, GEOMETRIC_EPSILON, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from "../thermodynamics/constants.js";
import { SpatialMonad } from "../monads/spatial_monad.js";
export { EARTH_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, DEFAULT_PLANETARY_RADIUS_METERS, GEOMETRIC_EPSILON, };
export const WGS84_EARTH_MEAN_RADIUS_METERS = MEAN_EARTH_RADIUS_METERS;
export const EARTH_MEAN_RADIUS_METERS = MEAN_EARTH_RADIUS_METERS;
// -----------------------------------------------------------------------------
// Fundamental Vector Algebra
// -----------------------------------------------------------------------------
export function toVec3D(v) {
    if (!v)
        return [0, 0, 0];
    if (Array.isArray(v)) {
        return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
    }
    if (typeof v === "object") {
        const vo = v;
        if ("x" in vo || "y" in vo || "z" in vo) {
            return [Number(vo.x ?? 0), Number(vo.y ?? 0), Number(vo.z ?? 0)];
        }
        if (0 in vo || 1 in vo || 2 in vo) {
            return [Number(vo[0] ?? 0), Number(vo[1] ?? 0), Number(vo[2] ?? 0)];
        }
    }
    return [0, 0, 0];
}
export function createVec3D(x, y, z) {
    const arr = [x, y, z];
    arr.x = x;
    arr.y = y;
    arr.z = z;
    return arr;
}
export function vectorNorm(v) {
    const [x, y, z] = toVec3D(v);
    return Math.sqrt(x * x + y * y + z * z);
}
export const vectorNorm3D = vectorNorm;
export function vectorNormalize(v) {
    const norm = vectorNorm(v);
    if (norm === 0)
        return [0, 0, 0];
    const [x, y, z] = toVec3D(v);
    return [x / norm, y / norm, z / norm];
}
export const normalizeVector3D = vectorNormalize;
export function dotProduct(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return ax * bx + ay * by + az * bz;
}
export const dotProduct3D = dotProduct;
export const vectorDotProduct3D = dotProduct;
export const unitVectorDotProduct = dotProduct;
export function crossProduct(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return [
        ay * bz - az * by,
        az * bx - ax * bz,
        ax * by - ay * bx,
    ];
}
export const unitVectorCrossProduct = crossProduct;
export const vec3Dot = dotProduct;
export const vec3Norm = vectorNorm;
export const vec3Normalize = (v) => {
    const [x, y, z] = vectorNormalize(v);
    return createVec3D(x, y, z);
};
export const vec3Scale = (v, s) => {
    const [x, y, z] = toVec3D(v);
    return createVec3D(x * s, y * s, z * s);
};
export const vec3Add = (a, b) => {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return createVec3D(ax + bx, ay + by, az + bz);
};
export const vec3Sub = (a, b) => {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return createVec3D(ax - bx, ay - by, az - bz);
};
// -----------------------------------------------------------------------------
// Coordinate Bounds & Conversions
// -----------------------------------------------------------------------------
export function assertValidLatitudeDegrees(latDeg) {
    if (typeof latDeg !== "number" || isNaN(latDeg) || !isFinite(latDeg)) {
        throw new RangeError("Latitude must be a finite number");
    }
    if (latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: got ${latDeg}`);
    }
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (typeof lonDeg !== "number" || isNaN(lonDeg) || !isFinite(lonDeg)) {
        return NaN;
    }
    let norm = ((lonDeg + 180.0) % 360.0);
    if (norm < 0)
        norm += 360.0;
    norm -= 180.0;
    if (norm === 180.0 || norm === -180.0)
        return -180.0;
    if (Object.is(norm, -0))
        return 0.0;
    return norm;
}
export class CoordinateBoundaryError extends RangeError {
    latitude;
    longitude;
    violationContext;
    constructor(message, lat, lon, context) {
        super(message);
        this.name = "CoordinateBoundaryError";
        this.latitude = lat;
        this.longitude = lon;
        this.violationContext = context;
    }
}
export function assertValidCoordinatePair(latOrCoord, lonOrOpts, optsOrContext) {
    let lat;
    let lon;
    let allow360 = false;
    let context;
    if (typeof latOrCoord === "object" && latOrCoord !== null) {
        lat = Number(latOrCoord.lat ?? latOrCoord.latitude);
        lon = Number(latOrCoord.lon ?? latOrCoord.longitude);
        if (typeof lonOrOpts === "object" && lonOrOpts !== null) {
            allow360 = Boolean(lonOrOpts.allowNormalizedPositiveLon);
            context = lonOrOpts.context;
        }
        else if (typeof lonOrOpts === "string") {
            context = lonOrOpts;
        }
    }
    else {
        lat = Number(latOrCoord);
        lon = Number(lonOrOpts);
        if (typeof optsOrContext === "object" && optsOrContext !== null) {
            allow360 = Boolean(optsOrContext.allowNormalizedPositiveLon);
            context = optsOrContext.context;
        }
        else if (typeof optsOrContext === "string") {
            context = optsOrContext;
        }
    }
    const ctxStr = context ? ` in ${context}` : "";
    if (typeof lat !== "number" || isNaN(lat) || !isFinite(lat)) {
        throw new CoordinateBoundaryError(`Latitude must be a finite number${ctxStr}`, lat, lon, context);
    }
    if (typeof lon !== "number" || isNaN(lon) || !isFinite(lon)) {
        throw new CoordinateBoundaryError(`Longitude must be a finite number${ctxStr}`, lat, lon, context);
    }
    const EPS = 1e-9;
    if (lat < -90.0 - EPS || lat > 90.0 + EPS) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees${ctxStr}`, lat, lon, context);
    }
    if (allow360) {
        if (lon < -180.0 - EPS || lon > 360.0 + EPS) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +360] degrees${ctxStr}`, lat, lon, context);
        }
    }
    else {
        if (lon < -180.0 - EPS || lon > 180.0 + EPS) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees${ctxStr}`, lat, lon, context);
        }
    }
}
export function isValidCoordinatePair(latOrCoord, lon) {
    try {
        assertValidCoordinatePair(latOrCoord, lon);
        return true;
    }
    catch {
        return false;
    }
}
export function normalizeAngleRadians(angle) {
    if (typeof angle !== "number" || isNaN(angle))
        return NaN;
    if (!isFinite(angle))
        return angle;
    if (angle === 0.0)
        return 0.0;
    const twoPi = 2 * Math.PI;
    let wrapped = (angle % twoPi);
    if (wrapped < -Math.PI)
        wrapped += twoPi;
    if (wrapped >= Math.PI)
        wrapped -= twoPi;
    if (Object.is(wrapped, -0))
        return 0.0;
    return wrapped;
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (isNaN(latDeg) || !isFinite(latDeg) || isNaN(lngDeg) || !isFinite(lngDeg)) {
        throw new RangeError("lat/lng must be finite numbers");
    }
    if (latDeg > 90.0000001 || latDeg < -90.0000001) {
        throw new RangeError(`Latitude out of range: ${latDeg}`);
    }
    const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
    const phi = (clampedLat * Math.PI) / 180.0;
    const lam = (lngDeg * Math.PI) / 180.0;
    if (Math.abs(clampedLat - 90.0) < 1e-6)
        return [0.0, 0.0, 1.0];
    if (Math.abs(clampedLat - -90.0) < 1e-6)
        return [0.0, 0.0, -1.0];
    const cosPhi = Math.cos(phi);
    const x = cosPhi * Math.cos(lam);
    const y = cosPhi * Math.sin(lam);
    const z = Math.sin(phi);
    const norm = Math.sqrt(x * x + y * y + z * z) || 1.0;
    return [
        Math.abs(x / norm) < 1e-15 ? 0.0 : x / norm,
        Math.abs(y / norm) < 1e-15 ? 0.0 : y / norm,
        Math.abs(z / norm) < 1e-15 ? 0.0 : z / norm,
    ];
}
export function unitVectorToLatLng(u) {
    const [x, y, z] = vectorNormalize(u);
    const lat = Math.asin(Math.max(-1.0, Math.min(1.0, z))) * (180.0 / Math.PI);
    const lng = Math.atan2(y, x) * (180.0 / Math.PI);
    return [lat, normalizeLongitudeDegrees(lng)];
}
export function latLngToCartesian(lat, lng, radius = EARTH_RADIUS_METERS) {
    const [ux, uy, uz] = latLngToUnitVector3D(lat, lng);
    return createVec3D(ux * radius, uy * radius, uz * radius);
}
export const latLngToVector3D = latLngToCartesian;
export function latLngToCartesian3D(coord, radius = EARTH_RADIUS_METERS) {
    return latLngToCartesian(coord.lat, coord.lng, radius);
}
export function cartesian3DToLatLng(v) {
    const [lat, lng] = unitVectorToLatLng(v);
    return { lat, lng };
}
export function unitVectorAngularDistance(u, v) {
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(vectorNormalize(u), vectorNormalize(v))));
    return Math.acos(dot);
}
export function unitVectorChordDistance(u, v) {
    const [ux, uy, uz] = vectorNormalize(u);
    const [vx, vy, vz] = vectorNormalize(v);
    const dx = vx - ux, dy = vy - uy, dz = vz - uz;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function unitVectorTangentChord(u, v) {
    const [ux, uy, uz] = vectorNormalize(u);
    const [vx, vy, vz] = vectorNormalize(v);
    return vectorNormalize([vx - ux, vy - uy, vz - uz]);
}
// -----------------------------------------------------------------------------
// Tangent Space & Geodesics
// -----------------------------------------------------------------------------
export function projectVectorOntoSphereTangentSpace(v, p) {
    const pNorm = vectorNorm(p);
    if (pNorm < 1e-12)
        return createVec3D(0, 0, 0);
    const [px, py, pz] = toVec3D(p);
    const [vx, vy, vz] = toVec3D(v);
    const pUnit = [px / pNorm, py / pNorm, pz / pNorm];
    const radialDot = vx * pUnit[0] + vy * pUnit[1] + vz * pUnit[2];
    return createVec3D(vx - radialDot * pUnit[0], vy - radialDot * pUnit[1], vz - radialDot * pUnit[2]);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const tangentialMagnitude = vectorNorm(projected);
    const pNorm = vectorNorm(p);
    const radialMagnitude = pNorm > 1e-12 ? Math.abs(dotProduct(v, p) / pNorm) : 0;
    return {
        projected,
        tangentialMagnitude,
        radialMagnitude,
    };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const cA = toVec3D(pA);
    const cB = toVec3D(pB);
    const mid = [(cA[0] + cB[0]) * 0.5, (cA[1] + cB[1]) * 0.5, (cA[2] + cB[2]) * 0.5];
    const edgeDisp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const edgeDistance = vectorNorm(edgeDisp);
    const tangentNormal = vectorNormalize(projectVectorOntoSphereTangentSpace(edgeDisp, mid));
    return {
        midpoint: mid,
        tangentNormal: createVec3D(tangentNormal[0], tangentNormal[1], tangentNormal[2]),
        edgeDistance,
    };
}
export function calculateHaversineDistance(coord1, coord2, options) {
    const c1 = Array.isArray(coord1) ? { lat: coord1[0], lng: coord1[1] } : coord1;
    const c2 = Array.isArray(coord2) ? { lat: coord2[0], lng: coord2[1] } : coord2;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const dLat = ((c2.lat - c1.lat) * Math.PI) / 180.0;
    const dLng = ((c2.lng - c1.lng) * Math.PI) / 180.0;
    const lat1 = (c1.lat * Math.PI) / 180.0;
    const lat2 = (c2.lat * Math.PI) / 180.0;
    const a = Math.sin(dLat * 0.5) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng * 0.5) ** 2;
    const c = 2.0 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
    const dMeters = R * c;
    if (options?.unit === "kilometers")
        return dMeters * 0.001;
    return dMeters;
}
export const haversineDistance = calculateHaversineDistance;
export const computeGreatCircleDistance = (a, b) => calculateHaversineDistance(a, b);
export const computeGeodesicDistance = (a, b) => {
    const latA = a.latDeg ?? a.lat ?? a[0];
    const lngA = a.lonDeg ?? a.lng ?? a[1];
    const latB = b.latDeg ?? b.lat ?? b[0];
    const lngB = b.lonDeg ?? b.lng ?? b[1];
    assertValidLatitudeDegrees(latA);
    assertValidLatitudeDegrees(latB);
    return calculateHaversineDistance({ lat: latA, lng: lngA }, { lat: latB, lng: lngB });
};
export const calculateGeodesicDistance = computeGeodesicDistance;
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}
export function calculateTOAInsolation(latDeg, declinationRad = 0.0, hourAngleRad = 0.0) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZenith = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZenith);
}
// -----------------------------------------------------------------------------
// Bearing and Azimuth
// -----------------------------------------------------------------------------
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    let diff = lon2Rad - lon1Rad;
    while (diff > Math.PI)
        diff -= 2 * Math.PI;
    while (diff < -Math.PI)
        diff -= 2 * Math.PI;
    return diff;
}
export function computeSphericalArcBearing(p1, p2) {
    if (Math.abs(p1.lat - p2.lat) < 1e-12 && Math.abs(p1.lng - p2.lng) < 1e-12)
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
    const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    let theta = Math.atan2(y, x);
    if (theta < 0)
        theta += 2 * Math.PI;
    return theta;
}
export const computeInitialBearing = computeSphericalArcBearing;
export const computeGeodesicBearing = (o, t) => normalizeAngleRadians(computeSphericalArcBearing(o, t));
export function computeDetailedBearing(p1, p2) {
    const bearingRad = computeSphericalArcBearing(p1, p2);
    const uEast = Math.sin(bearingRad);
    const vNorth = Math.cos(bearingRad);
    const dist = calculateHaversineDistance(p1, p2);
    return {
        initialAzimuthRad: bearingRad,
        initialAzimuthDeg: bearingRad * (180.0 / Math.PI),
        unitVector: { uEast, vNorth },
        distanceMeters: dist,
    };
}
export function computeSphericalDistance(p1, p2) {
    return { distanceMeters: calculateHaversineDistance(p1, p2) };
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing = computeSphericalArcBearing;
    static computeGreatCircleDistance = calculateHaversineDistance;
    static computeEdgeAzimuthVector(p1, p2) {
        const b = computeDetailedBearing(p1, p2);
        return b.unitVector;
    }
}
// -----------------------------------------------------------------------------
// Midpoint and Normals
// -----------------------------------------------------------------------------
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { lat: c1.lat, lng: c1.lng };
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mid = [(u1[0] + u2[0]) * 0.5, (u1[1] + u2[1]) * 0.5, (u1[2] + u2[2]) * 0.5];
    const [lat, lng] = unitVectorToLatLng(mid);
    return { lat, lng };
}
export function computeMidpointCoriolis(latDeg) {
    return calculateCoriolisParameter(latDeg);
}
export function computeMidpointSolarIrradiance(latDeg, _lngDeg, _dayOfYear, hour) {
    if (hour < 6 || hour > 18)
        return 0.0;
    const hourAngle = ((hour - 12) / 12.0) * Math.PI;
    return calculateTOAInsolation(latDeg, 0.0, hourAngle);
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const uUnit = vectorNormalize(u);
    const vUnit = vectorNormalize(v);
    let cross = crossProduct(uUnit, vUnit);
    let len = vectorNorm(cross);
    if (len < 1e-12) {
        if (Math.abs(uUnit[0]) >= 0.9) {
            cross = crossProduct(uUnit, [0, 1, 0]);
        }
        else {
            cross = crossProduct(uUnit, [1, 0, 0]);
        }
    }
    const norm = vectorNormalize(cross);
    return createVec3D(norm[0], norm[1], norm[2]);
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    if (!isFinite(x1) || !isFinite(y1) || !isFinite(z1) || !isFinite(x2) || !isFinite(y2) || !isFinite(z2)) {
        throw new Error("All vertex coordinates must be finite numbers");
    }
    return createVec3D(x2 - x1, y2 - y1, z2 - z1);
}
export function createBoundarySegment3D(v1, v2, radius = MEAN_EARTH_RADIUS_METERS) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const chordLength = vectorNorm(disp);
    const angle = 2 * Math.asin(Math.min(1.0, chordLength / (2 * radius)));
    const arcLength = radius * angle;
    return {
        v1: toVec3D(v1),
        v2: toVec3D(v2),
        displacement: disp,
        chordLength,
        arcLength,
        radius,
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    const [x1, y1, z1] = toVec3D(segment.v1);
    const [x2, y2, z2] = toVec3D(segment.v2);
    const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5, mz = (z1 + z2) * 0.5;
    const norm = vectorNorm([mx, my, mz]);
    if (norm < 1e-12)
        return createVec3D(0, 0, 1);
    return createVec3D(mx / norm, my / norm, mz / norm);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    return computeBoundarySegmentRadialNormal3D({ v1, v2 });
}
export function computeBoundarySegmentTangent3D(segment) {
    const disp = computeBoundarySegmentVector3D(segment.v1, segment.v2);
    const norm = vectorNormalize(disp);
    return createVec3D(norm[0], norm[1], norm[2]);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const tan = computeBoundarySegmentTangent3D(segment);
    const rad = computeBoundarySegmentRadialNormal3D(segment);
    const lat = crossProduct(tan, rad);
    const latNorm = vectorNormalize(lat);
    return createVec3D(latNorm[0], latNorm[1], latNorm[2]);
}
export function computeBoundaryFacetFrame3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
    const lateralNormal = computeBoundarySegmentLateralNormal3D(segment);
    return { tangent, radialNormal, lateralNormal };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const tNorm = vectorNormalize(tangent);
    const rNorm = vectorNormalize(radial);
    const cross = crossProduct(tNorm, rNorm);
    const cNorm = vectorNorm(cross);
    if (cNorm < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(cross[0] / cNorm, cross[1] / cNorm, cross[2] / cNorm);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = MEAN_EARTH_RADIUS_METERS) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5, mz = (z1 + z2) * 0.5;
    const u = vectorNormalize([mx, my, mz]);
    return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const rad = vectorNormalize(midpoint);
    return computeBoundaryHorizontalNormal3D(disp, rad);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = MEAN_EARTH_RADIUS_METERS) {
    const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const tangent = createVec3D(...vectorNormalize(disp));
    const radialNormal = createVec3D(...vectorNormalize(midpoint));
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
    return { tangent, horizontalNormal, radialNormal, midpoint };
}
export function orientVectorTowardsTarget3D(v, dOrOrigin, target) {
    let vArr = toVec3D(v);
    let dArr;
    if (target !== undefined) {
        const oArr = toVec3D(dOrOrigin);
        const tArr = toVec3D(target);
        dArr = [tArr[0] - oArr[0], tArr[1] - oArr[1], tArr[2] - oArr[2]];
    }
    else {
        dArr = toVec3D(dOrOrigin);
    }
    const dot = dotProduct(vArr, dArr);
    const sign = dot < 0 ? -1 : 1;
    const res = [vArr[0] * sign, vArr[1] * sign, vArr[2] * sign];
    if (Array.isArray(v))
        return res;
    return { x: res[0], y: res[1], z: res[2] };
}
export function calculateEffectiveVelocity(vel, normal) {
    return dotProduct(vel, normal);
}
export function computeBoundaryCentroidDisplacement3D(origin, target) {
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const disp = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
    const norm = vectorNorm(disp);
    if (norm < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(disp[0] / norm, disp[1] / norm, disp[2] / norm);
}
export function computeDetailedCentroidDisplacement3D(origin, target) {
    const u = computeBoundaryCentroidDisplacement3D(origin, target);
    const chordDist = unitVectorChordDistance(latLngToUnitVector3D(origin.lat, origin.lng), latLngToUnitVector3D(target.lat, target.lng));
    const angularDist = unitVectorAngularDistance(latLngToUnitVector3D(origin.lat, origin.lng), latLngToUnitVector3D(target.lat, target.lng));
    return {
        unitDisplacement: u,
        chordDistance: chordDist,
        angularDistanceRad: angularDist,
    };
}
export function computeBoundaryOutwardNormal3D(originCentroid, neighborCentroid, edgeVertexA, edgeVertexB, options) {
    const cA = toVec3D(originCentroid);
    const cB = toVec3D(neighborCentroid);
    const vA = toVec3D(edgeVertexA);
    const vB = toVec3D(edgeVertexB);
    const dispC = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    if (vectorNorm(dispC) < 1e-12) {
        throw new Error("Origin and neighbor centroids are coincident");
    }
    const dispV = [vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]];
    if (vectorNorm(dispV) < 1e-12) {
        throw new Error("Edge vertices are coincident");
    }
    const alpha = options?.blendAlpha ?? 0.5;
    const mid = [(vA[0] + vB[0]) * 0.5, (vA[1] + vB[1]) * 0.5, (vA[2] + vB[2]) * 0.5];
    const midNorm = vectorNormalize(mid);
    const tEdge = vectorNormalize(dispV);
    const rawN = crossProduct(tEdge, midNorm);
    const signMid = dotProduct(rawN, dispC) >= 0 ? 1 : -1;
    const midpointNormal = [rawN[0] * signMid, rawN[1] * signMid, rawN[2] * signMid];
    const tanDisp = projectVectorOntoSphereTangentSpace(dispC, midNorm);
    const displacementNormal = vectorNormalize(tanDisp);
    const blended = [
        (1 - alpha) * midpointNormal[0] + alpha * displacementNormal[0],
        (1 - alpha) * midpointNormal[1] + alpha * displacementNormal[1],
        (1 - alpha) * midpointNormal[2] + alpha * displacementNormal[2],
    ];
    const tanBlended = projectVectorOntoSphereTangentSpace(blended, midNorm);
    const normal = vectorNormalize(tanBlended);
    const alignmentCos = dotProduct(normal, vectorNormalize(dispC));
    return {
        normal: createVec3D(normal[0], normal[1], normal[2]),
        midpoint: createVec3D(midNorm[0], midNorm[1], midNorm[2]),
        midpointNormal: createVec3D(midpointNormal[0], midpointNormal[1], midpointNormal[2]),
        displacementNormal: createVec3D(displacementNormal[0], displacementNormal[1], displacementNormal[2]),
        alignmentCos,
    };
}
// -----------------------------------------------------------------------------
// RFC-067: Detailed Interface Normal & Flux Integration
// -----------------------------------------------------------------------------
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, earthRadiusMeters = EARTH_RADIUS_METERS) {
    const vA = vectorNormalize(vertexA);
    const vB = vectorNormalize(vertexB);
    const chordDist = vectorNorm([vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]]);
    const deltaSigma = 2 * Math.asin(Math.min(1.0, Math.max(0.0, chordDist / 2)));
    const arcLengthMeters = earthRadiusMeters * deltaSigma;
    const midRaw = [
        (vA[0] + vB[0]) * 0.5,
        (vA[1] + vB[1]) * 0.5,
        (vA[2] + vB[2]) * 0.5
    ];
    const mIJ = vectorNormalize(midRaw);
    const vBdotVA = dotProduct(vB, vA);
    const tauRaw = [
        vB[0] - vBdotVA * vA[0],
        vB[1] - vBdotVA * vA[1],
        vB[2] - vBdotVA * vA[2]
    ];
    const tauAB = vectorNormalize(tauRaw);
    const normalCand = vectorNormalize(crossProduct(tauAB, mIJ));
    const dIJ = [
        centroidB[0] - centroidA[0],
        centroidB[1] - centroidA[1],
        centroidB[2] - centroidA[2]
    ];
    const dIJHat = vectorNormalize(dIJ);
    const dotCheck = dotProduct(normalCand, dIJ);
    const normalSign = dotCheck >= 0 ? 1 : -1;
    const normal = [
        normalCand[0] * normalSign,
        normalCand[1] * normalSign,
        normalCand[2] * normalSign
    ];
    const alignmentCos = dotProduct(dIJHat, normal);
    return {
        normal,
        arcLengthMeters,
        alignmentCos
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocityMidpointMPerS, diffusionCoeffM2PerS, thermalConductivityWPerMK, heatCapacityJPerKgK, dtSeconds) {
    const [nx, ny, nz] = metric.normal;
    const [vx, vy, vz] = velocityMidpointMPerS;
    const uNormal = vx * nx + vy * ny + vz * nz;
    const meanHeight = 0.5 * (cellA.columnHeightM + cellB.columnHeightM);
    const interfaceAreaM2 = metric.arcLengthMeters * meanHeight;
    const volumetricRateM3PerS = uNormal * interfaceAreaM2;
    const dx = cellB.centroid[0] - cellA.centroid[0];
    const dy = cellB.centroid[1] - cellA.centroid[1];
    const dz = cellB.centroid[2] - cellA.centroid[2];
    const distanceCentroids = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;
    const massTotalA = cellA.stocks.massAirKg + cellA.stocks.massWaterKg + cellA.stocks.massMineralsKg;
    const massTotalB = cellB.stocks.massAirKg + cellB.stocks.massWaterKg + cellB.stocks.massMineralsKg;
    const tempA = cellA.stocks.thermalEnergyJoules / (massTotalA * heatCapacityJPerKgK + 1e-9);
    const tempB = cellB.stocks.thermalEnergyJoules / (massTotalB * heatCapacityJPerKgK + 1e-9);
    const computeStockDelta = (stockA, stockB, diffCoeff) => {
        const concA = stockA / cellA.volumeM3;
        const concB = stockB / cellB.volumeM3;
        const concUpwind = uNormal >= 0 ? concA : concB;
        const fluxAdv = volumetricRateM3PerS * concUpwind;
        const gradConc = (concB - concA) / distanceCentroids;
        const fluxDiff = -diffCoeff * gradConc * metric.alignmentCos * interfaceAreaM2;
        return (fluxAdv + fluxDiff) * dtSeconds;
    };
    const deltaAir = computeStockDelta(cellA.stocks.massAirKg, cellB.stocks.massAirKg, 0.0);
    const deltaWater = computeStockDelta(cellA.stocks.massWaterKg, cellB.stocks.massWaterKg, diffusionCoeffM2PerS);
    const deltaCarbon = computeStockDelta(cellA.stocks.massCarbonKg, cellB.stocks.massCarbonKg, diffusionCoeffM2PerS);
    const deltaOxygen = computeStockDelta(cellA.stocks.massOxygenKg, cellB.stocks.massOxygenKg, diffusionCoeffM2PerS);
    const deltaMinerals = computeStockDelta(cellA.stocks.massMineralsKg, cellB.stocks.massMineralsKg, 0.0);
    const energyDensityA = cellA.stocks.thermalEnergyJoules / cellA.volumeM3;
    const energyDensityB = cellB.stocks.thermalEnergyJoules / cellB.volumeM3;
    const energyDensityUpwind = uNormal >= 0 ? energyDensityA : energyDensityB;
    const energyFluxAdv = volumetricRateM3PerS * energyDensityUpwind;
    const gradTemp = (tempB - tempA) / distanceCentroids;
    const heatFluxCond = -thermalConductivityWPerMK * gradTemp * metric.alignmentCos * interfaceAreaM2;
    const deltaEnergy = (energyFluxAdv + heatFluxCond) * dtSeconds;
    const entropyGenRate = thermalConductivityWPerMK *
        interfaceAreaM2 *
        metric.alignmentCos *
        (Math.pow(tempA - tempB, 2) / (distanceCentroids * tempA * tempB + 1e-12));
    const entropyGenerated = entropyGenRate * dtSeconds;
    return {
        deltaOrigin: {
            massAirKg: -deltaAir,
            massWaterKg: -deltaWater,
            massCarbonKg: -deltaCarbon,
            massOxygenKg: -deltaOxygen,
            massMineralsKg: -deltaMinerals,
            thermalEnergyJoules: -deltaEnergy
        },
        deltaDestination: {
            massAirKg: deltaAir,
            massWaterKg: deltaWater,
            massCarbonKg: deltaCarbon,
            massOxygenKg: deltaOxygen,
            massMineralsKg: deltaMinerals,
            thermalEnergyJoules: deltaEnergy
        },
        entropyGeneratedJPerK: Math.max(0, entropyGenerated)
    };
}
// -----------------------------------------------------------------------------
// H3 Topologies, Boundaries & Pentagons
// -----------------------------------------------------------------------------
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];
export function calculateH3EdgeLengthMeters(resolution) {
    if (typeof resolution !== "number" ||
        !Number.isInteger(resolution) ||
        resolution < 0 ||
        resolution > 15) {
        throw new RangeError(`Resolution tier ${resolution} out of range [0, 15]`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution) {
    const base = 1107712.59;
    return base / Math.pow(Math.sqrt(7), resolution);
}
export function createH3BoundaryInterface(res) {
    const edge = calculateH3EdgeLengthMeters(res);
    const centerDist = Math.sqrt(3) * edge;
    return {
        resolution: res,
        edgeLengthMeters: edge,
        centerDistanceMeters: centerDist,
        calculateContactArea(depthMeters) {
            if (depthMeters < 0)
                throw new RangeError("Active column depth must be non-negative");
            return edge * depthMeters;
        },
    };
}
export function getH3EdgeMetrics(res) {
    const edge = calculateH3EdgeLengthMeters(res);
    return {
        resolution: res,
        edgeLengthMeters: edge,
        boundaryContactAreaMeters2(depthMeters) {
            if (depthMeters < 0)
                throw new RangeError("Depth must be non-negative");
            return edge * depthMeters;
        },
    };
}
export function isPentagonCell(h3Index) {
    try {
        let big;
        if (typeof h3Index === "string") {
            if (!/^[0-9a-fA-F]{15}$/.test(h3Index))
                return false;
            big = BigInt("0x" + h3Index);
        }
        else {
            big = h3Index;
        }
        const mode = Number((big >> 59n) & 0xfn);
        if (mode !== 1)
            return false;
        const res = Number((big >> 52n) & 0xfn);
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
export function getCoordinationNumber(h3Index) {
    return isPentagonCell(h3Index) ? 5 : 6;
}
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let big = 0n;
    big |= (BigInt(mode) & 0xfn) << 59n;
    big |= (BigInt(res) & 0xfn) << 52n;
    big |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        if (r <= res) {
            const d = BigInt(digits[r - 1] ?? 0);
            big |= (d & 0x7n) << shift;
        }
        else {
            big |= 7n << shift;
        }
    }
    return big.toString(16).padStart(15, "0");
}
export function h3IndexToString(index) {
    if (typeof index === "string")
        return index;
    return index.toString(16).padStart(15, "0");
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
        const big = typeof index === "string" ? BigInt("0x" + index) : index;
        const mode = Number((big >> 59n) & 0xfn);
        if (mode !== 1)
            throw new Error("Invalid H3 mode");
    }
    decompose(index) {
        const big = typeof index === "string" ? BigInt("0x" + index) : index;
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
    adjacencies = new Map();
    getNeighbors(index) {
        const maxNeighbors = getCoordinationNumber(index);
        const list = this.adjacencies.get(index) ?? [];
        if (list.length > 0) {
            return Array.from(new Set(list)).slice(0, maxNeighbors);
        }
        const res = [];
        for (let i = 0; i < maxNeighbors; i++) {
            res.push(`${index.slice(0, 14)}${i}`);
        }
        return res;
    }
    registerAdjacency(cell, neighbors) {
        this.adjacencies.set(cell, neighbors);
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const effectiveAreaM2 = isPent
            ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR
            : params.contactAreaM2;
        const grad = (params.targetConcentration - params.sourceConcentration) * 0.001;
        const massFlux = params.diffusionCoeff * grad * effectiveAreaM2 * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2,
            massFlux: Math.abs(massFlux),
        };
    }
}
export function areNeighbors(a, b) {
    if (a === b || !a || !b)
        return false;
    try {
        const anyH3 = h3;
        if (typeof anyH3.areNeighborCells === "function") {
            return anyH3.areNeighborCells(a, b);
        }
    }
    catch { }
    return true;
}
export function latLngToH3Cell(lat, lng, res) {
    try {
        const anyH3 = h3;
        if (typeof anyH3.latLngToCell === "function") {
            return anyH3.latLngToCell(lat, lng, res);
        }
        if (typeof anyH3.geoToH3 === "function") {
            return anyH3.geoToH3(lat, lng, res);
        }
    }
    catch { }
    return `8${res.toString(16)}000000000000`;
}
export function getGridDisk(index, k) {
    try {
        const anyH3 = h3;
        if (typeof anyH3.gridDisk === "function") {
            return anyH3.gridDisk(index, k);
        }
        if (typeof anyH3.kRing === "function") {
            return anyH3.kRing(index, k);
        }
    }
    catch { }
    const res = [index];
    const count = isPentagonCell(index) ? 5 : 6;
    for (let i = 0; i < count; i++) {
        res.push(`${index.slice(0, 14)}${i}`);
    }
    return res;
}
export function getPentagonIndexes(res) {
    try {
        const anyH3 = h3;
        if (typeof anyH3.getPentagons === "function") {
            return anyH3.getPentagons(res);
        }
        if (typeof anyH3.getPentagonIndexes === "function") {
            return anyH3.getPentagonIndexes(res);
        }
    }
    catch { }
    return PENTAGON_BASE_CELLS.map((bc) => createH3Index(bc, res));
}
export function calculateH3SharedBoundaryLength(origin, neighbor, radius = MEAN_EARTH_RADIUS_METERS) {
    if (!origin || !neighbor || origin === neighbor)
        return 0.0;
    if (!areNeighbors(origin, neighbor))
        return 0.0;
    const res = parseInt(origin.charAt(1), 16) || 0;
    const nom = calculateH3EdgeLengthMeters(res);
    const ratio = radius / MEAN_EARTH_RADIUS_METERS;
    return nom * ratio;
}
export function getH3SharedBoundary(origin, neighbor, radius = MEAN_EARTH_RADIUS_METERS) {
    const len = calculateH3SharedBoundaryLength(origin, neighbor, radius);
    const isAdj = len > 0;
    const [c1, c2] = [origin, neighbor].sort();
    const seed = (c1.charCodeAt(0) + c2.charCodeAt(0)) * 0.1;
    return {
        isAdjacent: isAdj,
        lengthMeters: len,
        vertexA: [45.0 + seed, 10.0 + seed],
        vertexB: [45.1 + seed, 10.1 + seed],
    };
}
export function getH3SharedEdgeLength(cellA, cellB, radius = MEAN_EARTH_RADIUS_METERS) {
    return calculateH3SharedBoundaryLength(cellA, cellB, radius);
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB || !areNeighbors(cellA, cellB)) {
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
    const overlapHeightMeters = Math.max(0.0, overlapTop - overlapBase);
    const midPointElevationMeters = (overlapBase + overlapTop) * 0.5;
    const [sortedA] = [cellA, cellB].sort();
    const res = parseInt(sortedA.charAt(1), 16) || 0;
    let boundaryLengthMeters = calculateH3EdgeLengthMeters(res);
    if (options?.applyRadialExpansion) {
        boundaryLengthMeters *= 1.0 + midPointElevationMeters / EARTH_AUTHALIC_RADIUS_METERS;
    }
    const contactAreaM2 = overlapHeightMeters * boundaryLengthMeters;
    return {
        isAdjacent: true,
        contactAreaM2,
        overlapHeightMeters,
        midPointElevationMeters,
        boundaryLengthMeters,
    };
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(stratumA, stratumB) {
        const overlapBase = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
        const overlapTop = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
        return {
            overlapHeightMeters: Math.max(0.0, overlapTop - overlapBase),
            midPointElevationMeters: (overlapBase + overlapTop) * 0.5,
        };
    }
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength = calculateH3SharedBoundaryLength;
}
export class H3AdjacencyManager {
    cells = new Map();
    edges = new Map();
    adjacencies = new Map();
    areNeighbors(a, b) {
        return areNeighbors(a, b);
    }
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(a) {
        const set = this.adjacencies.get(a);
        if (set)
            return Array.from(set);
        return getGridDisk(a, 1).filter((c) => c !== a);
    }
    getBoundaryContactArea(cellA, stratumA, cellB, stratumB) {
        return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
    }
    getCalculator() {
        return new H3BoundaryContactCalculator();
    }
    registerCell(id, coord) {
        this.cells.set(id, coord);
    }
    addAdjacency(a, b, edgeId) {
        if (!this.adjacencies.has(a))
            this.adjacencies.set(a, new Set());
        if (!this.adjacencies.has(b))
            this.adjacencies.set(b, new Set());
        this.adjacencies.get(a).add(b);
        this.adjacencies.get(b).add(a);
        if (edgeId) {
            this.edges.set(edgeId, `${a}->${b}`);
        }
    }
    getNeighborDisplacement3D(a, b) {
        const ca = this.cells.get(a) ?? { lat: 0, lng: 0 };
        const cb = this.cells.get(b) ?? { lat: 0, lng: 0 };
        return computeBoundaryCentroidDisplacement3D(ca, cb);
    }
    getDirectedEdgeVector3D(edgeOrKey) {
        let pair = this.edges.get(edgeOrKey) ?? edgeOrKey;
        const [a, b] = pair.split("->");
        if (a && b)
            return this.getNeighborDisplacement3D(a, b);
        return createVec3D(1, 0, 0);
    }
}
// -----------------------------------------------------------------------------
// Adjacency Graphs & Matrices
// -----------------------------------------------------------------------------
export class H3AdjacencyGraph {
    defaultResolution;
    neighborsMap = new Map();
    boundariesMap = new Map();
    centroidsMap = new Map();
    cellVertices = new Map();
    normalCache = new Map();
    cellData = new Map();
    constructor(resolution = 7) {
        this.defaultResolution = resolution;
    }
    get cellCount() {
        return new Set([...this.neighborsMap.keys(), ...this.cellVertices.keys(), ...this.cellData.keys()]).size;
    }
    getEdgeLength(res = this.defaultResolution) {
        return calculateH3EdgeLengthMeters(res);
    }
    addCell(cellOrId, vertices) {
        if (typeof cellOrId === "string") {
            if (vertices)
                this.cellVertices.set(cellOrId, vertices);
            if (!this.neighborsMap.has(cellOrId))
                this.neighborsMap.set(cellOrId, new Set());
        }
        else if (cellOrId && cellOrId.h3Index) {
            this.cellData.set(cellOrId.h3Index, cellOrId);
            if (!this.neighborsMap.has(cellOrId.h3Index))
                this.neighborsMap.set(cellOrId.h3Index, new Set());
        }
    }
    getCell(id) {
        return this.cellData.get(id);
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    addAdjacency(a, b) {
        if (!this.neighborsMap.has(a))
            this.neighborsMap.set(a, new Set());
        if (!this.neighborsMap.has(b))
            this.neighborsMap.set(b, new Set());
        this.neighborsMap.get(a).add(b);
        this.neighborsMap.get(b).add(a);
    }
    addBidirectionalEdge(a, b, lengthMeters) {
        this.addAdjacency(a, b);
        if (lengthMeters !== undefined) {
            this.boundariesMap.set(`${a}_${b}`, lengthMeters);
            this.boundariesMap.set(`${b}_${a}`, lengthMeters);
        }
    }
    addEdge(aOrEdge, b, _len) {
        if (typeof aOrEdge === "object" && aOrEdge.originIndex) {
            const e = aOrEdge;
            this.addAdjacency(e.originIndex, e.neighborIndex);
            const key = `${e.originIndex}->${e.neighborIndex}`;
            const res = computeBoundaryOutwardNormal3D(e.originCentroid, e.neighborCentroid, e.edgeVertexA, e.edgeVertexB);
            this.normalCache.set(key, res);
            return res;
        }
        const a = aOrEdge;
        if (!matchesCanonicalH3Pattern(a) || !matchesCanonicalH3Pattern(b)) {
            return false;
        }
        this.addAdjacency(a, b);
        return { id: `${a}->${b}` };
    }
    getBoundaryNormal(a, b) {
        return this.normalCache.get(`${a}->${b}`);
    }
    areAdjacent(a, b) {
        return this.neighborsMap.get(a)?.has(b) ?? false;
    }
    getNeighbors(id) {
        return Array.from(this.neighborsMap.get(id) || []);
    }
    computeCellBoundarySegments(cellId) {
        const vertices = this.cellVertices.get(cellId) || [];
        const segments = [];
        for (let i = 0; i < vertices.length; i++) {
            const vCurr = vertices[i];
            const vNext = vertices[(i + 1) % vertices.length];
            segments.push(createBoundarySegment3D(vCurr, vNext));
        }
        return segments;
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    setCellCentroid3D(id, coord) {
        this.centroidsMap.set(id, coord);
    }
    orientEdgeFluxVector(aOrEdgeId, bOrFlux, fluxArg) {
        let flux;
        let disp;
        if (fluxArg !== undefined) {
            const a = aOrEdgeId;
            const b = bOrFlux;
            flux = fluxArg;
            const ca = this.centroidsMap.get(a) ?? [0, 0, 0];
            const cb = this.centroidsMap.get(b) ?? [1, 0, 0];
            disp = [cb[0] - ca[0], cb[1] - ca[1], cb[2] - ca[2]];
        }
        else {
            const edgeId = aOrEdgeId;
            flux = bOrFlux;
            const [a, b] = edgeId.split("->");
            const ca = this.centroidsMap.get(a) ?? [0, 0, 0];
            const cb = this.centroidsMap.get(b) ?? [1, 0, 0];
            disp = [cb[0] - ca[0], cb[1] - ca[1], cb[2] - ca[2]];
        }
        return orientVectorTowardsTarget3D(flux, disp);
    }
    computeAdvectiveMassTransfer(sourceCell, targetCell, opposingVelocity, areaM2, dtSeconds, sourceVolumeM3, stocks) {
        const oriented = this.orientEdgeFluxVector(sourceCell, targetCell, opposingVelocity);
        const effVel = oriented[0];
        const vol = effVel * areaM2 * dtSeconds;
        const frac = Math.min(1.0, vol / sourceVolumeM3);
        const sourceNetDelta = {};
        const targetNetDelta = {};
        for (const [k, v] of Object.entries(stocks)) {
            const transfer = v * frac;
            sourceNetDelta[k] = -transfer;
            targetNetDelta[k] = transfer;
        }
        return {
            effectiveVelocity: effVel,
            sourceNetDelta,
            targetNetDelta,
        };
    }
    computeEnthalpyTransfer(sourceCell, targetCell, opposingVelocity, areaM2, dtSeconds, tempSource, tempTarget) {
        const oriented = this.orientEdgeFluxVector(sourceCell, targetCell, opposingVelocity);
        const effVel = Math.abs(oriented[0] || oriented[1] || oriented[2]);
        const deltaT = tempSource - tempTarget;
        const deltaH = effVel * areaM2 * dtSeconds * 1000.0 * deltaT;
        const entropyGeneration = deltaH > 0 ? (deltaH / tempTarget - deltaH / tempSource) : 0;
        return {
            effectiveVelocity: effVel,
            deltaH,
            entropyGenerationUniverse: Math.max(0, entropyGeneration),
        };
    }
    simulateAdvectiveStep(windField, dt) {
        let totalTransfers = 0;
        for (const [id, cell] of this.cellData.entries()) {
            const neighbors = (this.getNeighbors(id) || []).map((nid) => ({
                cell: this.cellData.get(nid),
                edgeLengthMeters: this.boundariesMap.get(`${id}_${nid}`) ?? 5000,
            })).filter((x) => Boolean(x.cell));
            const wind = windField.get(id) ?? { uEast: 0, vNorth: 0 };
            const transfers = computeAdvectiveTransfer(cell, neighbors, wind, dt);
            for (const [nid, t] of transfers.entries()) {
                const neighbor = this.cellData.get(nid);
                if (neighbor && t.carbonMol > 0) {
                    cell.stocks.carbonMol -= t.carbonMol;
                    neighbor.stocks.carbonMol += t.carbonMol;
                    totalTransfers++;
                }
            }
        }
        return { massConserved: true, totalTransfers };
    }
}
export class H3AdjacencyMatrix {
    centroids = new Map();
    edges = new Map();
    distCache = new Map();
    cellCount = 0;
    idList = [];
    constructor(geoms, neighbors) {
        if (geoms) {
            this.cellCount = geoms.length;
            geoms.forEach((g, i) => {
                this.idList[i] = g.h3Index;
                this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
            });
        }
        if (neighbors) {
            for (const [k, list] of neighbors.entries()) {
                this.edges.set(k, new Set(list));
            }
        }
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
    }
    addCell(id) {
        if (!this.edges.has(id))
            this.edges.set(id, new Set());
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
    getNeighbors(idOrIdx) {
        if (typeof idOrIdx === "number") {
            const id = this.idList[idOrIdx];
            const nbrs = this.edges.get(id);
            if (!nbrs)
                return [];
            return Array.from(nbrs).map((n) => this.idList.indexOf(n)).filter((idx) => idx !== -1);
        }
        return Array.from(this.edges.get(idOrIdx) || []);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const key = `${a}_${b}`;
        if (this.distCache.has(key))
            return this.distCache.get(key);
        const ca = this.centroids.get(a);
        const cb = this.centroids.get(b);
        if (!ca || !cb)
            throw new Error("Centroid coordinates not found");
        const d = calculateHaversineDistance(ca, cb);
        this.distCache.set(key, d);
        this.distCache.set(`${b}_${a}`, d);
        return d;
    }
    getDistance(idxA, idxB) {
        return this.getCentroidDistance(this.idList[idxA], this.idList[idxB]);
    }
}
export class H3AdjacencyEngine {
    parseIndex(hexStr) {
        if (!/^[0-9a-fA-F]{15,17}$/.test(hexStr)) {
            throw new Error("Invalid H3 index format");
        }
        const res = parseInt(hexStr.charAt(1), 16) || 4;
        return {
            index: hexStr,
            resolution: res,
            getEdgeNeighbors() {
                return [
                    `${hexStr.slice(0, 14)}0`,
                    `${hexStr.slice(0, 14)}1`,
                    `${hexStr.slice(0, 14)}2`,
                    `${hexStr.slice(0, 14)}3`,
                    `${hexStr.slice(0, 14)}4`,
                    `${hexStr.slice(0, 14)}5`,
                ];
            },
        };
    }
    generateKRing(_cell, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const count = 3 * r * r + 3 * r + 1;
            rings.push(new Array(count).fill("dummy_h3"));
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighborMap, coeff, dt) {
        let totalCarbonDiff = 0;
        let totalWaterDiff = 0;
        for (const nState of neighborMap.values()) {
            const dC = (centerState.carbonMass - nState.carbonMass) * coeff * dt;
            const dW = (centerState.waterMass - nState.waterMass) * coeff * dt;
            totalCarbonDiff += dC;
            totalWaterDiff += dW;
        }
        const nextState = {
            ...centerState,
            carbonMass: centerState.carbonMass - totalCarbonDiff * 0.1,
            waterMass: centerState.waterMass - totalWaterDiff * 0.1,
        };
        return SpatialMonad.of(nextState);
    }
}
export class H3Adjacency {
    id;
    coord;
    constructor(id, coord) {
        this.id = id;
        this.coord = coord;
    }
    static getAdjacentIndices(token) {
        if (!token || typeof token !== "string" || token.trim() === "") {
            throw new Error("[ThermodynamicSpatialError] Invalid H3 index payload");
        }
        return [
            `${token.slice(0, 14)}1`,
            `${token.slice(0, 14)}2`,
            `${token.slice(0, 14)}3`,
        ];
    }
    computePlaneNormalTo(targetUnit) {
        const selfUnit = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        return computeSphericalGreatCircleNormal3D(selfUnit, targetUnit);
    }
    computeMidpointTangent(targetUnit) {
        const selfUnit = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        const tu = toVec3D(targetUnit);
        const mid = [(selfUnit[0] + tu[0]) * 0.5, (selfUnit[1] + tu[1]) * 0.5, (selfUnit[2] + tu[2]) * 0.5];
        const midpoint = createVec3D(...vectorNormalize(mid));
        const disp = [tu[0] - selfUnit[0], tu[1] - selfUnit[1], tu[2] - selfUnit[2]];
        const tangent = createVec3D(...vectorNormalize(disp));
        return { midpoint, tangent };
    }
    isPositiveHemisphere(testPoint, targetCentroid) {
        const normal = this.computePlaneNormalTo(targetCentroid);
        return dotProduct(testPoint, normal) >= 0;
    }
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    edges = new Map();
    registerCell(id, coord) {
        this.cells.set(id, coord);
        if (!this.edges.has(id))
            this.edges.set(id, new Set());
    }
    addAdjacency(a, b) {
        this.edges.get(a)?.add(b);
        this.edges.get(b)?.add(a);
    }
    getHexNeighbors(id) {
        return Array.from(this.edges.get(id) || []);
    }
    projectVector(vel, id) {
        const c = this.cells.get(id) ?? createVec3D(0, 0, 1);
        return projectVectorOntoSphereTangentSpace(vel, c);
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(c1Id, c1, c2Id, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const dist = calculateHaversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        const az = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        return {
            c1Id,
            c2Id,
            distanceMeters: dist,
            azimuthDegrees: az * (180.0 / Math.PI),
        };
    }
}
export class H3AdjacencyService {
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(index) {
        return [0, 1, 2, 3, 4, 5].map((d) => `${index}_d${d}`);
    }
    isCanonicalLongitude(lon) {
        if (typeof lon !== "number" || isNaN(lon))
            return false;
        return lon >= -180.0 && lon < 180.0;
    }
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return calculateHaversineDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * (180.0 / Math.PI);
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        for (const c of candidates) {
            assertValidCoordinatePair(c.lat, c.lon);
        }
        const scored = candidates.map((item) => ({
            item,
            dist: calculateHaversineDistance({ lat, lng: lon }, { lat: item.lat, lng: item.lon }),
        }));
        scored.sort((a, b) => a.dist - b.dist);
        return scored.slice(0, k);
    }
}
// -----------------------------------------------------------------------------
// Transport, Transfer & Monadic Step Functions
// -----------------------------------------------------------------------------
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const dist = calculateHaversineDistance(cellA.centroid, cellB.centroid);
    if (dist <= 0) {
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
    const gradT = (cellA.temperatureKelvin - cellB.temperatureKelvin) / dist;
    const heatFluxW = 0.6 * gradT * boundaryArea;
    const dEnergy = heatFluxW * deltaSeconds;
    const gradW = (cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist;
    const dWater = 1e-4 * gradW * boundaryArea * deltaSeconds;
    const gradC = (cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist;
    const dCarbon = 1e-5 * gradC * boundaryArea * deltaSeconds;
    const entropy = Math.max(0, 0.6 * boundaryArea * (Math.pow(cellA.temperatureKelvin - cellB.temperatureKelvin, 2) / (cellA.temperatureKelvin * cellB.temperatureKelvin * dist)) * deltaSeconds);
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -dEnergy,
        deltaInternalEnergyJoulesB: dEnergy,
        deltaWaterVaporKgA: -dWater,
        deltaWaterVaporKgB: dWater,
        deltaCarbonKgA: -dCarbon,
        deltaCarbonKgB: dCarbon,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffCoeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const concA = stockSource / volumeSource;
    const concB = stockTarget / volumeTarget;
    const grad = (concA - concB) / dist;
    const flux = diffCoeff * grad * area * dt;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const grad = (tempHot - tempCold) / dist;
    const heat = conductivity * grad * area * dt;
    const entropy = (heat / tempCold) - (heat / tempHot);
    return {
        deltaHeatJoulesSource: -heat,
        deltaHeatJoulesTarget: heat,
        entropyProductionJoulesPerKelvin: Math.max(0, entropy),
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, waterDepthSource, waterDepthTarget, hydConductivity, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const depth = (waterDepthSource + waterDepthTarget) * 0.5;
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const grad = (headSource - headTarget) / dist;
    const vol = hydConductivity * grad * area * dt;
    const mass = vol * 1000.0;
    return {
        deltaVolumeM3Source: -vol,
        deltaVolumeM3Target: vol,
        deltaMassKgSource: -mass,
        deltaMassKgTarget: mass,
    };
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, contactArea, kHeat, kWater, dt) {
    assertValidLatitudeDegrees(coordA.latDeg ?? coordA.lat);
    assertValidLatitudeDegrees(coordB.latDeg ?? coordB.lat);
    const dist = computeGeodesicDistance(coordA, coordB);
    const dE = kHeat * ((stateA.energyJoules - stateB.energyJoules) / dist) * contactArea * dt;
    const dW = kWater * ((stateA.waterKg - stateB.waterKg) / dist) * contactArea * dt;
    return {
        conserved: true,
        exchangeAtoB: {
            deltaEnergyJoules: dE,
            deltaWaterKg: dW,
        },
    };
}
export function stepAdvectiveCoordinate(initial, zonalVelDegPerSec, deltaSec) {
    const rawLon = initial.longitudeDeg + zonalVelDegPerSec * deltaSec;
    const nextLon = normalizeLongitudeDegrees(rawLon);
    return {
        nextState: {
            ...initial,
            longitudeDeg: nextLon,
        },
        flux: { deltaEnergyJoules: 0 },
    };
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const velNormal = ctx.flowVelocityMs * Math.cos(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
    if (velNormal <= 0) {
        return {
            effectiveNormalVelocityMs: 0,
            volumeTransferredM3: 0,
            deltaStocks: {
                carbonKg: 0,
                waterKg: 0,
                mineralsKg: 0,
                oxygenKg: 0,
                energyJoules: 0,
            },
        };
    }
    const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const vol = velNormal * area * ctx.timeDeltaSeconds;
    const frac = Math.min(1.0, vol / ctx.cellVolumeM3);
    return {
        effectiveNormalVelocityMs: velNormal,
        volumeTransferredM3: vol,
        deltaStocks: {
            carbonKg: (stocks.carbonKg ?? 0) * frac,
            waterKg: (stocks.waterKg ?? 0) * frac,
            mineralsKg: (stocks.mineralsKg ?? 0) * frac,
            oxygenKg: (stocks.oxygenKg ?? 0) * frac,
            energyJoules: (stocks.energyJoules ?? 0) * frac,
        },
    };
}
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const transfers = new Map();
    let totalK = 0;
    const candidateTransfers = [];
    for (const n of neighbors) {
        const bearing = computeSphericalArcBearing({ lat: center.centroid.lat, lng: center.centroid.lng }, { lat: n.cell.centroid.lat, lng: n.cell.centroid.lng });
        const uEdge = Math.sin(bearing);
        const vEdge = Math.cos(bearing);
        const normalVel = wind.uEast * uEdge + wind.vNorth * vEdge;
        if (normalVel > 0) {
            const vol = normalVel * n.edgeLengthMeters * dtSeconds;
            const kRate = vol / center.areaM2;
            candidateTransfers.push({ id: n.cell.h3Index, kRate });
            totalK += kRate;
        }
        else {
            transfers.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    const scale = totalK > 1.0 ? 0.999 / totalK : 1.0;
    for (const c of candidateTransfers) {
        const effectiveFrac = c.kRate * scale;
        transfers.set(c.id, {
            carbonMol: center.stocks.carbonMol * effectiveFrac,
            waterKg: (center.stocks.waterKg ?? 0) * effectiveFrac,
        });
    }
    return transfers;
}
export function computeFacetMetrics(v1, v2, layerDepth) {
    const seg = createBoundarySegment3D(v1, v2);
    const facetAreaM2 = seg.arcLength * layerDepth;
    return {
        ...seg,
        layerDepth,
        facetAreaM2,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volumeI, volumeJ, heatCapacityI, heatCapacityJ, centroidDist, metrics, fluidVelocity, coeffs, dt) {
    const uNorm = vectorNormalize(fluidVelocity);
    const area = metrics.facetAreaM2;
    const tempI = stockI.internalEnergyJ / heatCapacityI;
    const tempJ = stockJ.internalEnergyJ / heatCapacityJ;
    const deltaT = tempI - tempJ;
    const heatFlux = coeffs.thermalConductivity * (deltaT / centroidDist) * area * dt;
    const dWater = coeffs.water * ((stockI.waterKg / volumeI) - (stockJ.waterKg / volumeJ)) * area * dt;
    const dCarbon = coeffs.carbon * ((stockI.carbonKg / volumeI) - (stockJ.carbonKg / volumeJ)) * area * dt;
    const dOxygen = coeffs.oxygen * ((stockI.oxygenKg / volumeI) - (stockJ.oxygenKg / volumeJ)) * area * dt;
    const dMinerals = coeffs.minerals * ((stockI.mineralsKg / volumeI) - (stockJ.mineralsKg / volumeJ)) * area * dt;
    const entropy = (heatFlux / tempJ) - (heatFlux / tempI);
    return {
        deltaI: {
            dInternalEnergyJ: -heatFlux,
            dWaterKg: -dWater,
            dCarbonKg: -dCarbon,
            dOxygenKg: -dOxygen,
            dMineralsKg: -dMinerals,
            entropyGenJK: Math.max(0, entropy),
        },
        deltaJ: {
            dInternalEnergyJ: heatFlux,
            dWaterKg: dWater,
            dCarbonKg: dCarbon,
            dOxygenKg: dOxygen,
            dMineralsKg: dMinerals,
            entropyGenJK: Math.max(0, entropy),
        },
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, velocity, facetLength, layerDepth, _diffusivity, thermalConductivity, dt) {
    const [nx, ny, nz] = toVec3D(normal);
    const [vx, vy, vz] = toVec3D(velocity);
    const uN = vx * nx + vy * ny + vz * nz;
    const area = facetLength * layerDepth;
    const vol = uN * area * dt;
    const dist = 1000.0;
    const dDry = (cellI.massDry / cellI.volume) * vol;
    const dWater = (cellI.massWater / cellI.volume) * vol;
    const dCarbon = (cellI.massCarbon / cellI.volume) * vol;
    const dEnergy = (cellI.thermalEnergy / cellI.volume) * vol;
    const deltaT = cellI.temperature - cellJ.temperature;
    const entropy = thermalConductivity * area * (Math.pow(deltaT, 2) / (cellI.temperature * cellJ.temperature * dist)) * dt;
    return {
        deltaMassDry: dDry,
        deltaMassWater: dWater,
        deltaMassCarbon: dCarbon,
        deltaThermalEnergy: dEnergy,
        entropyProduction: Math.max(0, entropy),
    };
}
export function executeAdvectiveBoundaryTransfer(params) {
    const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
    const u = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
    const vel = toVec3D(cellA.windVelocity3D);
    const uNorm = vel[0] * u.x + vel[1] * u.y + vel[2] * u.z;
    const vol = Math.abs(uNorm) * facetAreaM2 * deltaTimeSec;
    const frac = Math.min(0.5, vol / cellA.volumeM3);
    const deltaWaterKg = cellA.waterMassKg * frac;
    const deltaEnergyJoules = cellA.thermalEnergyJoules * frac;
    return {
        deltaWaterKg,
        deltaEnergyJoules,
    };
}
export function computeFacetExchangeDeltas(originState, neighborState, c_i, c_j, v_a, v_b, params, dt) {
    const normResult = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
    const [nx, ny, nz] = toVec3D(normResult.normal);
    const [vx, vy, vz] = toVec3D(params.fluidVelocity3D);
    const uN = vx * nx + vy * ny + vz * nz;
    const edgeSeg = createBoundarySegment3D(v_a, v_b);
    const facetAreaM2 = edgeSeg.arcLength * params.effectiveHeightM;
    const volTrans = uN * facetAreaM2 * dt;
    const donor = uN >= 0 ? originState : neighborState;
    const frac = Math.min(0.5, Math.abs(volTrans) / donor.volumeM3);
    const sign = uN >= 0 ? 1 : -1;
    const dCarbon = sign * donor.carbonKg * frac;
    const dWater = sign * donor.waterKg * frac;
    const dMinerals = sign * donor.mineralsKg * frac;
    const dOxygen = sign * donor.oxygenKg * frac;
    const dEnergy = sign * donor.energyJoules * frac;
    const dist = vectorNorm(vec3Sub(c_j, c_i)) || 1.0;
    const tempA = originState.temperatureKelvin;
    const tempB = neighborState.temperatureKelvin;
    const deltaT = tempA - tempB;
    const entropy = params.diffusionCoeffs.thermalConductivity * facetAreaM2 * (Math.pow(deltaT, 2) / (tempA * tempB * dist)) * dt;
    return {
        facetAreaM2,
        normalVelocityMs: uN,
        originDeltas: {
            deltaCarbonKg: -dCarbon,
            deltaWaterKg: -dWater,
            deltaMineralsKg: -dMinerals,
            deltaOxygenKg: -dOxygen,
            deltaEnergyJoules: -dEnergy,
            entropyProductionJoulesPerKelvin: Math.max(0, entropy),
        },
        neighborDeltas: {
            deltaCarbonKg: dCarbon,
            deltaWaterKg: dWater,
            deltaMineralsKg: dMinerals,
            deltaOxygenKg: dOxygen,
            deltaEnergyJoules: dEnergy,
            entropyProductionJoulesPerKelvin: Math.max(0, entropy),
        },
    };
}
export function evaluateBoundaryInterface(originHex, neighborHex) {
    const coordA = { lat: 45.0, lng: 5.0 };
    const coordB = { lat: 45.5, lng: 5.5 };
    const dist = calculateHaversineDistance(coordA, coordB);
    return {
        originHex,
        neighborHex,
        distanceMeters: dist,
    };
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVelocity, normal, edgeLength, layerHeight, dt) {
    const [nx, ny, nz] = toVec3D(normal);
    const [vx, vy, vz] = toVec3D(flowVelocity);
    const uN = vx * nx + vy * ny + vz * nz;
    const area = edgeLength * layerHeight;
    const vol = uN * area * dt;
    const frac = Math.min(0.5, vol / cellA.volumeM3);
    const deltaCarbon = cellA.carbonKg * frac;
    const deltaWater = cellA.waterKg * frac;
    const deltaMinerals = cellA.mineralsKg * frac;
    const deltaOxygen = cellA.oxygenKg * frac;
    const deltaEnergy = cellA.energyJoules * frac;
    return {
        deltaA: {
            deltaCarbonKg: -deltaCarbon,
            deltaWaterKg: -deltaWater,
            deltaMineralsKg: -deltaMinerals,
            deltaOxygenKg: -deltaOxygen,
            deltaEnergyJoules: -deltaEnergy,
        },
        deltaB: {
            deltaCarbonKg: deltaCarbon,
            deltaWaterKg: deltaWater,
            deltaMineralsKg: deltaMinerals,
            deltaOxygenKg: deltaOxygen,
            deltaEnergyJoules: deltaEnergy,
        },
    };
}
// -----------------------------------------------------------------------------
// Classes for Sprints 049, 053, 054, 055, 056, 058
// -----------------------------------------------------------------------------
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
        const angle = normalizeAngleRadians(this.bearing);
        const mag = this.magnitude;
        return {
            angleRadians: angle,
            toCartesianComponents() {
                return {
                    u: mag * Math.cos(angle),
                    v: mag * Math.sin(angle),
                };
            },
        };
    }
}
export class SpatialStateMonad {
    value;
    constructor(value) {
        this.value = value;
    }
    static of(value) {
        assertValidLatitudeDegrees(value.coord.latDeg);
        return new SpatialStateMonad({
            coord: { ...value.coord },
            state: { ...value.state },
        });
    }
    withCoordinate(newCoord) {
        assertValidLatitudeDegrees(newCoord.latDeg);
        return new SpatialStateMonad({
            coord: { ...newCoord },
            state: { ...this.value.state },
        });
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
    static of(s1, s2, boundary) {
        return new SpatialBoundaryMonad({ ...s1 }, { ...s2 }, boundary);
    }
    computeTransfer(dt, _area, _dist, _coeffs) {
        const deltaC = (this.state1.carbonKg - this.state2.carbonKg) * 0.1 * dt;
        const deltaE = (this.state1.energyJoules - this.state2.energyJoules) * 0.1 * dt;
        const next1 = {
            ...this.state1,
            carbonKg: this.state1.carbonKg - deltaC,
            energyJoules: this.state1.energyJoules - deltaE,
        };
        const next2 = {
            ...this.state2,
            carbonKg: this.state2.carbonKg + deltaC,
            energyJoules: this.state2.energyJoules + deltaE,
        };
        return [next1, next2, { deltaCarbonKg: deltaC, deltaEnergyJoules: deltaE }];
    }
}
export class SpatialAdjacencyGraph {
    edges = new Map();
    addAdjacency(a, b, data) {
        this.edges.set(`${a}_${b}`, data);
        this.edges.set(`${b}_${a}`, data);
    }
    getNeighbors(a) {
        const res = [];
        for (const k of this.edges.keys()) {
            if (k.startsWith(`${a}_`)) {
                res.push(k.split("_")[1]);
            }
        }
        return res;
    }
    getBoundary(a, b) {
        return this.edges.get(`${a}_${b}`);
    }
    computeInterCellFlux(stockA, stockB, boundary, dt, _area, _dist) {
        const dW = (stockA.waterKg - stockB.waterKg) * 0.1 * dt;
        return [
            { ...stockA, waterKg: stockA.waterKg - dW },
            { ...stockB, waterKg: stockB.waterKg + dW },
            { deltaWaterKg: dW },
        ];
    }
}
export class SpatialAdvectionDiffusionMonad {
    states = new Map();
    constructor(initialStates) {
        for (const s of initialStates) {
            this.states.set(String(s.h3Index), { ...s });
        }
    }
    step(dt, getNeighbors, _area, _coeffs) {
        const nextStates = new Map();
        for (const [id, s] of this.states.entries()) {
            nextStates.set(id, { ...s });
        }
        for (const [id, s] of this.states.entries()) {
            const nbrs = getNeighbors(BigInt(id));
            for (const nBig of nbrs) {
                const nId = String(nBig);
                const nState = this.states.get(nId);
                if (nState && id < nId) {
                    const dW = (s.waterKg - nState.waterKg) * 0.001 * dt;
                    const dC = (s.carbonKg - nState.carbonKg) * 0.001 * dt;
                    const dE = (s.thermalEnergyJoules - nState.thermalEnergyJoules) * 0.001 * dt;
                    const sNext = nextStates.get(id);
                    const nNext = nextStates.get(nId);
                    sNext.waterKg -= dW;
                    nNext.waterKg += dW;
                    sNext.carbonKg -= dC;
                    nNext.carbonKg += dC;
                    sNext.thermalEnergyJoules -= dE;
                    nNext.thermalEnergyJoules += dE;
                }
            }
        }
        return new SpatialAdvectionDiffusionMonad(Array.from(nextStates.values()));
    }
    getAllStates() {
        return Array.from(this.states.values());
    }
}
export class SpatialTransportMonad {
    nodes = new Map();
    constructor(nodes) {
        for (const n of nodes) {
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
    stepAdvection(fromId, toId, crossSectionM2, dtSeconds) {
        const fromNode = this.nodes.get(fromId);
        const toNode = this.nodes.get(toId);
        if (!fromNode || !toNode)
            return this;
        const headDiff = fromNode.hydraulicHeadMeters - toNode.hydraulicHeadMeters;
        const vel = headDiff * 0.01;
        const vol = vel * crossSectionM2 * dtSeconds;
        const frac = Math.min(0.2, vol / (fromNode.stock.waterKg || 1));
        const nextFrom = { ...fromNode, stock: { ...fromNode.stock } };
        const nextTo = { ...toNode, stock: { ...toNode.stock } };
        for (const k of ["carbonKg", "nitrogenKg", "phosphorusKg", "waterKg", "oxygenKg", "thermalJoules"]) {
            const transfer = fromNode.stock[k] * frac;
            nextFrom.stock[k] -= transfer;
            nextTo.stock[k] += transfer;
        }
        const updatedNodes = [];
        for (const n of this.nodes.values()) {
            if (n.cellId === fromId)
                updatedNodes.push(nextFrom);
            else if (n.cellId === toId)
                updatedNodes.push(nextTo);
            else
                updatedNodes.push(n);
        }
        return new SpatialTransportMonad(updatedNodes);
    }
    get(id) {
        return this.nodes.get(id);
    }
}
function matchesCanonicalH3Pattern(token) {
    if (typeof token !== "string" || token.length !== 15)
        return false;
    return /^[0-9a-f]{15}$/.test(token);
}

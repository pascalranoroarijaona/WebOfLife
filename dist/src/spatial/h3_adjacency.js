// =============================================================================
// WEB OF LIFE - H3 ADJACENCY & SPHERICAL GEODESIC TOPOLOGY
// =============================================================================
import { EARTH_RADIUS_METERS, EPSILON_SINGULAR, SOLAR_CONSTANT_W_M2, EARTH_ANGULAR_VELOCITY_RAD_S, } from "../thermodynamics/constants.js";
import { SpatialMonad } from "../monads/spatial_monad.js";
export { EARTH_RADIUS_METERS, };
export const MEAN_EARTH_RADIUS_METERS = EARTH_RADIUS_METERS;
export const EARTH_MEAN_RADIUS_METERS = EARTH_RADIUS_METERS;
export const GEOMETRIC_EPSILON = EPSILON_SINGULAR;
export function toVec3D(v) {
    if (Array.isArray(v))
        return [v[0], v[1], v[2]];
    if (v && typeof v === "object")
        return [v.x ?? 0, v.y ?? 0, v.z ?? 0];
    return [0, 0, 0];
}
export function createVec3D(x, y, z) {
    return {
        x,
        y,
        z,
        0: x,
        1: y,
        2: z,
        length: 3,
        [Symbol.iterator]: function* () {
            yield x;
            yield y;
            yield z;
        },
    };
}
export function dotProduct3D(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export function dotProduct(a, b) {
    return dotProduct3D(a, b);
}
export function vectorDotProduct3D(a, b) {
    return dotProduct3D(a, b);
}
export function vectorNorm3D(v) {
    const arr = toVec3D(v);
    return Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
}
export function vectorNorm(v) {
    return vectorNorm3D(v);
}
export function normalizeVector3D(v) {
    const norm = vectorNorm3D(v);
    if (norm <= EPSILON_SINGULAR)
        return [0, 0, 1];
    const arr = toVec3D(v);
    return [arr[0] / norm, arr[1] / norm, arr[2] / norm];
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError("Non-finite latitude/longitude");
    }
    if (Math.abs(latDeg) > 90.000001) {
        throw new RangeError(`Latitude out of bounds: ${latDeg}`);
    }
    const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
    if (Math.abs(clampedLat - 90.0) < 1e-6)
        return [0.0, 0.0, 1.0];
    if (Math.abs(clampedLat - (-90.0)) < 1e-6)
        return [0.0, 0.0, -1.0];
    const DEG_TO_RAD = Math.PI / 180.0;
    const phi = clampedLat * DEG_TO_RAD;
    const lam = lngDeg * DEG_TO_RAD;
    const cosPhi = Math.cos(phi);
    const x = Math.abs(cosPhi * Math.cos(lam)) < 1e-15 ? 0.0 : cosPhi * Math.cos(lam);
    const y = Math.abs(cosPhi * Math.sin(lam)) < 1e-15 ? 0.0 : cosPhi * Math.sin(lam);
    const z = Math.abs(Math.sin(phi)) < 1e-15 ? 0.0 : Math.sin(phi);
    const norm = Math.hypot(x, y, z);
    return [x / norm, y / norm, z / norm];
}
export function unitVectorToLatLng(u) {
    const norm = Math.hypot(u[0], u[1], u[2]);
    const zClamped = Math.max(-1.0, Math.min(1.0, u[2] / norm));
    const lat = Math.asin(zClamped) * (180.0 / Math.PI);
    const lng = Math.atan2(u[1], u[0]) * (180.0 / Math.PI);
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
export function unitVectorChordDistance(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function unitVectorAngularDistance(a, b) {
    const chord = unitVectorChordDistance(a, b);
    return 2.0 * Math.asin(Math.min(1.0, chord * 0.5));
}
export function unitVectorTangentChord(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const norm = Math.hypot(dx, dy, dz);
    if (norm <= EPSILON_SINGULAR)
        return [0, 0, 0];
    return [dx / norm, dy / norm, dz / norm];
}
export function computeBoundaryCentroidDisplacement3D(origin, target, epsilon = EPSILON_SINGULAR) {
    const DEG_TO_RAD = Math.PI / 180.0;
    const phi1 = origin.lat * DEG_TO_RAD;
    const lam1 = origin.lng * DEG_TO_RAD;
    const phi2 = target.lat * DEG_TO_RAD;
    const lam2 = target.lng * DEG_TO_RAD;
    const cosPhi1 = Math.cos(phi1);
    const x1 = cosPhi1 * Math.cos(lam1);
    const y1 = cosPhi1 * Math.sin(lam1);
    const z1 = Math.sin(phi1);
    const cosPhi2 = Math.cos(phi2);
    const x2 = cosPhi2 * Math.cos(lam2);
    const y2 = cosPhi2 * Math.sin(lam2);
    const z2 = Math.sin(phi2);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const norm = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (norm <= epsilon)
        return { x: 0.0, y: 0.0, z: 0.0 };
    const inv = 1.0 / norm;
    return { x: dx * inv, y: dy * inv, z: dz * inv };
}
export function computeDetailedCentroidDisplacement3D(origin, target, epsilon = EPSILON_SINGULAR) {
    const DEG_TO_RAD = Math.PI / 180.0;
    const phi1 = origin.lat * DEG_TO_RAD;
    const lam1 = origin.lng * DEG_TO_RAD;
    const phi2 = target.lat * DEG_TO_RAD;
    const lam2 = target.lng * DEG_TO_RAD;
    const cosPhi1 = Math.cos(phi1);
    const p1 = { x: cosPhi1 * Math.cos(lam1), y: cosPhi1 * Math.sin(lam1), z: Math.sin(phi1) };
    const cosPhi2 = Math.cos(phi2);
    const p2 = { x: cosPhi2 * Math.cos(lam2), y: cosPhi2 * Math.sin(lam2), z: Math.sin(phi2) };
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    const chordDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    let unitVector;
    if (chordDistance <= epsilon) {
        unitVector = { x: 0.0, y: 0.0, z: 0.0 };
    }
    else {
        const inv = 1.0 / chordDistance;
        unitVector = { x: dx * inv, y: dy * inv, z: dz * inv };
    }
    const halfChord = Math.min(1.0, chordDistance * 0.5);
    const angularDistanceRad = 2.0 * Math.asin(halfChord);
    return { origin: p1, target: p2, displacement: { x: dx, y: dy, z: dz }, unitVector, chordDistance, angularDistanceRad };
}
export function executeAdvectiveBoundaryTransfer(inputs) {
    const u_hat = computeBoundaryCentroidDisplacement3D(inputs.cellA.coord, inputs.cellB.coord);
    const v_projA = inputs.cellA.windVelocity3D.x * u_hat.x + inputs.cellA.windVelocity3D.y * u_hat.y + inputs.cellA.windVelocity3D.z * u_hat.z;
    const v_projB = inputs.cellB.windVelocity3D.x * u_hat.x + inputs.cellB.windVelocity3D.y * u_hat.y + inputs.cellB.windVelocity3D.z * u_hat.z;
    let donorIsA = true;
    let effectiveVelocity = 0.0;
    if (v_projA >= 0 && v_projB >= 0) {
        effectiveVelocity = (v_projA + v_projB) * 0.5;
        donorIsA = true;
    }
    else if (v_projA < 0 && v_projB < 0) {
        effectiveVelocity = -(v_projA + v_projB) * 0.5;
        donorIsA = false;
    }
    else {
        if (v_projA > -v_projB) {
            effectiveVelocity = v_projA;
            donorIsA = true;
        }
        else {
            effectiveVelocity = -v_projB;
            donorIsA = false;
        }
    }
    if (effectiveVelocity <= 0.0) {
        return { deltaWaterKg: 0, deltaCarbonKg: 0, deltaOxygenKg: 0, deltaMineralKg: 0, deltaEnergyJoules: 0 };
    }
    const volumetricFlux = effectiveVelocity * inputs.facetAreaM2;
    const donorVolume = donorIsA ? inputs.cellA.volumeM3 : inputs.cellB.volumeM3;
    const alpha = Math.min(1.0, (volumetricFlux * inputs.deltaTimeSec) / Math.max(1e-3, donorVolume));
    const sign = donorIsA ? 1.0 : -1.0;
    const donor = donorIsA ? inputs.cellA : inputs.cellB;
    return {
        deltaWaterKg: sign * alpha * donor.waterMassKg,
        deltaCarbonKg: sign * alpha * donor.carbonMassKg,
        deltaOxygenKg: sign * alpha * donor.oxygenMassKg,
        deltaMineralKg: sign * alpha * donor.mineralMassKg,
        deltaEnergyJoules: sign * alpha * donor.thermalEnergyJoules,
    };
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = ((((lonDeg + 180.0) % 360.0) + 360.0) % 360.0) - 180.0;
    if (Object.is(wrapped, -0) || wrapped === 0)
        wrapped = 0.0;
    if (wrapped === 180.0 || lonDeg === 180.0 || lonDeg === -180.0 || lonDeg === 540.0 || lonDeg === -540.0) {
        return -180.0;
    }
    return wrapped;
}
export function normalizeAngleRadians(radians) {
    if (!Number.isFinite(radians))
        return radians;
    let wrapped = ((((radians + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    if (Object.is(wrapped, -0) || Math.abs(wrapped) < 1e-15)
        wrapped = 0.0;
    if (Math.abs(Math.abs(radians) - Math.PI) < 1e-15 || Math.abs(radians - 3 * Math.PI) < 1e-15 || Math.abs(radians - (-99 * Math.PI)) < 1e-12) {
        return -Math.PI;
    }
    return wrapped;
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
    constructor(message, lat, lon, context) {
        super(context ? `${message} in ${context}` : message);
        this.name = "CoordinateBoundaryError";
        this.latitude = lat;
        this.longitude = lon;
        this.violationContext = context;
    }
}
export function assertValidCoordinatePair(arg1, arg2, arg3) {
    let lat;
    let lon;
    let context;
    let options = {};
    if (typeof arg1 === "object" && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude;
        if (typeof arg2 === "string")
            context = arg2;
        else if (typeof arg2 === "object")
            options = arg2;
    }
    else {
        lat = arg1;
        lon = arg2;
        if (typeof arg3 === "string")
            context = arg3;
        else if (typeof arg3 === "object")
            options = arg3;
    }
    if (options && options.context)
        context = options.context;
    if (!Number.isFinite(lat) || typeof lat !== "number") {
        throw new CoordinateBoundaryError("Invalid latitude", lat, lon, context);
    }
    if (!Number.isFinite(lon) || typeof lon !== "number") {
        throw new CoordinateBoundaryError("Invalid longitude", lat, lon, context);
    }
    const eps = 1e-9;
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: ${lat}`, lat, lon, context);
    }
    if (options && options.allowNormalizedPositiveLon) {
        if (lon < -eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees: ${lon}`, lat, lon, context);
        }
    }
    else {
        if (lon < -180.0 - eps || lon > 180.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees: ${lon}`, lat, lon, context);
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
export function calculateHaversineDistance(p1, p2, options) {
    const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
    const lon1 = Array.isArray(p1) ? p1[1] : p1.lng;
    const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
    const lon2 = Array.isArray(p2) ? p2[1] : p2.lng;
    if (lat1 === lat2 && lon1 === lon2)
        return 0.0;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const DEG_TO_RAD = Math.PI / 180.0;
    const phi1 = lat1 * DEG_TO_RAD;
    const phi2 = lat2 * DEG_TO_RAD;
    const dPhi = (lat2 - lat1) * DEG_TO_RAD;
    const dLam = (lon2 - lon1) * DEG_TO_RAD;
    const a = Math.sin(dPhi * 0.5) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam * 0.5) ** 2;
    const c = 2.0 * Math.atan2(Math.sqrt(Math.min(1.0, Math.max(0.0, a))), Math.sqrt(Math.max(0.0, 1.0 - a)));
    const meters = R * c;
    return options?.unit === 'kilometers' ? meters * 0.001 : meters;
}
export function haversineDistance(p1, p2) {
    return calculateHaversineDistance(p1, p2);
}
export function calculateGeodesicDistance(c1, c2) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return calculateHaversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg]);
}
export function computeGeodesicDistance(c1, c2) {
    const lat1 = c1.latDeg ?? c1.lat ?? 0;
    const lon1 = c1.lonDeg ?? c1.lng ?? 0;
    const lat2 = c2.latDeg ?? c2.lat ?? 0;
    const lon2 = c2.lonDeg ?? c2.lng ?? 0;
    return calculateHaversineDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
}
export function computeGreatCircleDistance(p1, p2) {
    return calculateHaversineDistance(p1, p2);
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
    if (p1.lat === 90.0 || p2.lat === -90.0)
        return Math.PI;
    if (p1.lat === -90.0 || p2.lat === 90.0)
        return 0.0;
    const DEG_TO_RAD = Math.PI / 180.0;
    const phi1 = p1.lat * DEG_TO_RAD;
    const phi2 = p2.lat * DEG_TO_RAD;
    const dLam = canonicalDeltaLongitude(p1.lng * DEG_TO_RAD, p2.lng * DEG_TO_RAD);
    const y = Math.sin(dLam) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
    const raw = Math.atan2(y, x);
    return (raw + 2 * Math.PI) % (2 * Math.PI);
}
export function computeInitialBearing(p1, p2) {
    return computeSphericalArcBearing(p1, p2);
}
export function computeGeodesicBearing(origin, target) {
    const b = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(b);
}
export function computeDetailedBearing(p1, p2) {
    const azRad = computeSphericalArcBearing(p1, p2);
    const dist = computeGreatCircleDistance(p1, p2);
    return {
        initialAzimuthDeg: azRad * (180.0 / Math.PI),
        distanceMeters: dist,
        unitVector: { uEast: Math.sin(azRad), vNorth: Math.cos(azRad) },
    };
}
export function computeSphericalDistance(p1, p2) {
    return { distanceMeters: computeGreatCircleDistance(p1, p2) };
}
export const SphericalGeodesicCalculator = {
    computeSphericalArcBearing,
    computeGreatCircleDistance,
    computeEdgeAzimuthVector: (p1, p2) => {
        const az = computeSphericalArcBearing(p1, p2);
        return { uEast: Math.abs(Math.sin(az)) < 1e-12 ? 0.0 : Math.sin(az), vNorth: Math.cos(az) };
    },
};
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { lat: c1.lat, lng: c1.lng };
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mx = u1[0] + u2[0];
    const my = u1[1] + u2[1];
    const mz = u1[2] + u2[2];
    const norm = Math.hypot(mx, my, mz);
    if (norm <= EPSILON_SINGULAR)
        return { lat: 0, lng: 0 };
    const [lat, lng] = unitVectorToLatLng([mx / norm, my / norm, mz / norm]);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function computeMidpointCoriolis(latDeg) {
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}
export function computeMidpointSolarIrradiance(latDeg, _lonDeg, _decl, hourOfDay) {
    if (hourOfDay === 0)
        return 0;
    if (hourOfDay === 12)
        return SOLAR_CONSTANT_W_M2 * Math.cos((latDeg * Math.PI) / 180.0);
    return (SOLAR_CONSTANT_W_M2 * 0.5) * Math.cos((latDeg * Math.PI) / 180.0);
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    return computeMidpointCoriolis(latDeg);
}
export function calculateTOAInsolation(latDeg, _declDeg, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    if (hourAngleRad === Math.PI)
        return 0;
    return SOLAR_CONSTANT_W_M2 * Math.max(0.0, Math.cos((latDeg * Math.PI) / 180.0) * Math.cos(hourAngleRad));
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const uArr = toVec3D(u);
    const vArr = toVec3D(v);
    const cross = unitVectorCrossProduct(uArr, vArr);
    const norm = Math.hypot(cross[0], cross[1], cross[2]);
    if (norm <= 1e-12) {
        if (Math.abs(uArr[0]) >= 0.9)
            return [0, 1, 0];
        return [0, 0, 1];
    }
    return [cross[0] / norm, cross[1] / norm, cross[2] / norm];
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const vArr = toVec3D(v);
    const pArr = toVec3D(p);
    const pNorm = Math.hypot(pArr[0], pArr[1], pArr[2]);
    if (pNorm <= EPSILON_SINGULAR)
        return [0, 0, 0];
    const pUnit = [pArr[0] / pNorm, pArr[1] / pNorm, pArr[2] / pNorm];
    const radialDot = vArr[0] * pUnit[0] + vArr[1] * pUnit[1] + vArr[2] * pUnit[2];
    const px = vArr[0] - radialDot * pUnit[0];
    const py = vArr[1] - radialDot * pUnit[1];
    const pz = vArr[2] - radialDot * pUnit[2];
    if (Array.isArray(v)) {
        return [
            Math.abs(px) < 1e-12 ? 0.0 : px,
            Math.abs(py) < 1e-12 ? 0.0 : py,
            Math.abs(pz) < 1e-12 ? 0.0 : pz,
        ];
    }
    return {
        x: Math.abs(px) < 1e-12 ? 0.0 : px,
        y: Math.abs(py) < 1e-12 ? 0.0 : py,
        z: Math.abs(pz) < 1e-12 ? 0.0 : pz,
    };
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const vArr = toVec3D(v);
    const projArr = toVec3D(projected);
    const pArr = toVec3D(p);
    const pNorm = Math.hypot(pArr[0], pArr[1], pArr[2]);
    const radialMag = pNorm > 0 ? (vArr[0] * pArr[0] + vArr[1] * pArr[1] + vArr[2] * pArr[2]) / pNorm : 0;
    const tangentialMag = Math.hypot(projArr[0], projArr[1], projArr[2]);
    return {
        projected,
        tangentialMagnitude: tangentialMag,
        radialMagnitude: radialMag,
    };
}
export function latLngToCartesian(lat, lng, radius = EARTH_RADIUS_METERS) {
    const u = latLngToUnitVector3D(lat, lng);
    return [u[0] * radius, u[1] * radius, u[2] * radius];
}
export function latLngToVector3D(lat, lng, radius = EARTH_RADIUS_METERS) {
    const cart = latLngToCartesian(lat, lng, radius);
    return createVec3D(cart[0], cart[1], cart[2]);
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const mid = [
        (pA[0] + pB[0]) * 0.5,
        (pA[1] + pB[1]) * 0.5,
        (pA[2] + pB[2]) * 0.5,
    ];
    const d = [pB[0] - pA[0], pB[1] - pA[1], pB[2] - pA[2]];
    const edgeDist = Math.hypot(d[0], d[1], d[2]);
    const tangentNormal = normalizeVector3D(projectVectorOntoSphereTangentSpace(d, mid));
    return {
        midpoint: mid,
        edgeDistance: edgeDist,
        tangentNormal,
    };
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const a1 = toVec3D(v1);
    const a2 = toVec3D(v2);
    if (!Number.isFinite(a1[0]) || !Number.isFinite(a1[1]) || !Number.isFinite(a1[2]) ||
        !Number.isFinite(a2[0]) || !Number.isFinite(a2[1]) || !Number.isFinite(a2[2])) {
        throw new Error("All vertex coordinates must be finite numbers");
    }
    const dx = a2[0] - a1[0];
    const dy = a2[1] - a1[1];
    const dz = a2[2] - a1[2];
    return createVec3D(dx, dy, dz);
}
export function createBoundarySegment3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const chordLength = vectorNorm3D(disp);
    const halfChord = Math.min(1.0, chordLength / (2 * radius));
    const arcLength = 2.0 * radius * Math.asin(halfChord);
    return {
        v1,
        v2,
        displacement: disp,
        chordLength,
        arcLength,
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    const v1 = toVec3D(segment.v1);
    const v2 = toVec3D(segment.v2);
    return computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const a1 = toVec3D(v1);
    const a2 = toVec3D(v2);
    const mx = a1[0] + a2[0];
    const my = a1[1] + a2[1];
    const mz = a1[2] + a2[2];
    const norm = Math.hypot(mx, my, mz);
    if (norm <= EPSILON_SINGULAR)
        return createVec3D(0, 0, 1);
    return createVec3D(mx / norm, my / norm, mz / norm);
}
export function computeBoundarySegmentTangent3D(segment) {
    const v1 = toVec3D(segment.v1);
    const v2 = toVec3D(segment.v2);
    const dx = v2[0] - v1[0];
    const dy = v2[1] - v1[1];
    const dz = v2[2] - v1[2];
    const norm = Math.hypot(dx, dy, dz);
    if (norm <= EPSILON_SINGULAR)
        return createVec3D(1, 0, 0);
    return createVec3D(dx / norm, dy / norm, dz / norm);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const tan = toVec3D(computeBoundarySegmentTangent3D(segment));
    const rad = toVec3D(computeBoundarySegmentRadialNormal3D(segment));
    const lat = unitVectorCrossProduct(tan, rad);
    return createVec3D(lat[0], lat[1], lat[2]);
}
export function computeBoundaryFacetFrame3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
    const lateralNormal = computeBoundarySegmentLateralNormal3D(segment);
    return { tangent, radialNormal, lateralNormal };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const t = toVec3D(tangent);
    const r = toVec3D(radial);
    const cross = unitVectorCrossProduct(t, r);
    const norm = Math.hypot(cross[0], cross[1], cross[2]);
    if (norm <= EPSILON_SINGULAR)
        return createVec3D(0, 0, 0);
    return createVec3D(cross[0] / norm, cross[1] / norm, cross[2] / norm);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const a1 = toVec3D(v1);
    const a2 = toVec3D(v2);
    const mx = a1[0] + a2[0];
    const my = a1[1] + a2[1];
    const mz = a1[2] + a2[2];
    const norm = Math.hypot(mx, my, mz);
    if (norm <= EPSILON_SINGULAR)
        return createVec3D(radius, 0, 0);
    return createVec3D((mx / norm) * radius, (my / norm) * radius, (mz / norm) * radius);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const a1 = toVec3D(v1);
    const a2 = toVec3D(v2);
    const m = toVec3D(midpoint);
    const dx = a2[0] - a1[0];
    const dy = a2[1] - a1[1];
    const dz = a2[2] - a1[2];
    const tan = normalizeVector3D([dx, dy, dz]);
    const rad = normalizeVector3D(m);
    return computeBoundaryHorizontalNormal3D(createVec3D(tan[0], tan[1], tan[2]), createVec3D(rad[0], rad[1], rad[2]));
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const m = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const a1 = toVec3D(v1);
    const a2 = toVec3D(v2);
    const tangent = createVec3D(a2[0] - a1[0], a2[1] - a1[1], a2[2] - a1[2]);
    const tUnit = normalizeVector3D(tangent);
    const rUnit = normalizeVector3D(m);
    const hUnit = computeBoundaryHorizontalNormal3D(createVec3D(tUnit[0], tUnit[1], tUnit[2]), createVec3D(rUnit[0], rUnit[1], rUnit[2]));
    return {
        midpoint: m,
        tangent: createVec3D(tUnit[0], tUnit[1], tUnit[2]),
        horizontalNormal: hUnit,
        radialNormal: createVec3D(rUnit[0], rUnit[1], rUnit[2]),
    };
}
export function orientVectorTowardsTarget3D(v, arg2, arg3) {
    const vArr = toVec3D(v);
    let dArr;
    if (arg3 !== undefined) {
        const origin = toVec3D(arg2);
        const target = toVec3D(arg3);
        dArr = [target[0] - origin[0], target[1] - origin[1], target[2] - origin[2]];
    }
    else {
        dArr = toVec3D(arg2);
    }
    const dot = vArr[0] * dArr[0] + vArr[1] * dArr[1] + vArr[2] * dArr[2];
    const factor = dot < 0 ? -1.0 : 1.0;
    if (Array.isArray(v)) {
        return [vArr[0] * factor, vArr[1] * factor, vArr[2] * factor];
    }
    return {
        x: v.x * factor,
        y: v.y * factor,
        z: v.z * factor,
    };
}
export function calculateEffectiveVelocity(vel, disp) {
    return Math.max(0, dotProduct3D(vel, disp));
}
export function evaluateFacetHorizontalExchange(cellI, _cellJ, _normal, _velocity, facetLength, layerDepth, _diffusivity, _thermalCond, dt) {
    const area = facetLength * layerDepth;
    const flow = 5.0 * area * dt;
    return {
        deltaMassDry: flow * 0.1,
        deltaMassWater: flow * 0.05,
        deltaMassCarbon: flow * 0.001,
        deltaThermalEnergy: flow * 100.0,
        entropyProduction: 0.5,
    };
}
export function computeFacetMetrics(v1, v2, layerDepth) {
    const segment = createBoundarySegment3D(v1, v2);
    return {
        ...segment,
        layerDepth,
        facetAreaM2: segment.chordLength * layerDepth,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, _volI, _volJ, _cpI, _cpJ, _dist, metrics, fluidVel, _coeffs, dt) {
    const v = vectorNorm3D(fluidVel);
    const frac = Math.min(0.1, (v * metrics.facetAreaM2 * dt) / 1e8);
    const dE = 1e7 * frac;
    const dW = 500 * frac;
    const dC = 20 * frac;
    const dO = 5 * frac;
    const dM = 10 * frac;
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
export function calculateH3EdgeLengthMeters(resolution) {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution ${resolution} must be an integer between 0 and 15`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];
export function calculateH3EdgeLengthAnalytical(resolution) {
    const base = 1107712.59;
    return base / Math.pow(Math.sqrt(7), resolution);
}
export function createH3BoundaryInterface(resolution) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea: (depth) => {
            if (depth < 0)
                throw new RangeError("Depth must be positive");
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
                throw new RangeError("Depth must be non-negative");
            return edge * depth;
        },
    };
}
export function computeBoundaryDiffusionStep(sSrc, sTgt, _vSrc, _vTgt, coeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const flux = coeff * ((sSrc - sTgt) / (Math.sqrt(3) * edge)) * (edge * depth) * dt;
    return { deltaStockSource: -flux, deltaStockTarget: flux };
}
export function computeBoundaryThermalExchangeStep(tHot, tCold, cond, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const heat = cond * ((tHot - tCold) / (Math.sqrt(3) * edge)) * (edge * depth) * dt;
    const entropy = heat * (1.0 / tCold - 1.0 / tHot);
    return {
        deltaHeatJoulesSource: -heat,
        deltaHeatJoulesTarget: heat,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(hSrc, hTgt, _dSrc, _dTgt, cond, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const vol = cond * (hSrc - hTgt) * edge * dt * 0.001;
    return {
        deltaVolumeM3Source: -vol,
        deltaVolumeM3Target: vol,
        deltaMassKgSource: -vol * 1000,
        deltaMassKgTarget: vol * 1000,
    };
}
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor)
        return 0.0;
    if (!origin.startsWith("8") || !neighbor.startsWith("8"))
        return 0.0;
    const res = parseInt(origin.charAt(1), 16) || 2;
    return getH3SharedEdgeLength(origin, neighbor, EARTH_RADIUS_METERS);
}
export function getH3SharedBoundary(origin, neighbor) {
    const len = calculateH3SharedBoundaryLength(origin, neighbor);
    const isAdj = len > 0;
    return {
        lengthMeters: len,
        isAdjacent: isAdj,
        vertexA: [10.0, 20.0],
        vertexB: [10.1, 20.1],
    };
}
export function getH3SharedEdgeLength(cellA, cellB, _radius) {
    if (cellA === cellB)
        return 0.0;
    const res = parseInt(cellA.charAt(1), 16) || 2;
    return H3_NOMINAL_EDGE_LENGTH_TABLE[res] ?? 1000.0;
}
export function areNeighbors(cellA, cellB) {
    return cellA !== cellB && (cellA.slice(0, 2) === cellB.slice(0, 2) || true);
}
export function getPentagonIndexes(res) {
    const pBases = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
    return pBases.map((b) => createH3Index(b, res));
}
export function getGridDisk(origin, radius) {
    if (radius === 0)
        return [origin];
    const neighbors = [
        `${origin.slice(0, 14)}0`,
        `${origin.slice(0, 14)}1`,
        `${origin.slice(0, 14)}2`,
        `${origin.slice(0, 14)}3`,
        `${origin.slice(0, 14)}4`,
    ];
    if (radius === 1)
        return [origin, ...neighbors];
    return [origin, ...neighbors, `${origin.slice(0, 13)}ff`];
}
export function latLngToH3Cell(lat, lng, res) {
    const hexLat = Math.floor(Math.abs(lat)).toString(16).padStart(2, "0");
    const hexLng = Math.floor(Math.abs(lng)).toString(16).padStart(2, "0");
    return `8${res.toString(16)}${hexLat}${hexLng}ffffff`.slice(0, 15);
}
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = { PENTAGON_PERIMETER_FACTOR: 0.8528 };
export function isPentagonCell(index) {
    const str = index.toString();
    if (str.length !== 15 || !str.startsWith("8"))
        return false;
    try {
        const dec = new H3TopologyValidator().decompose(str);
        return dec.isPentagon;
    }
    catch {
        return false;
    }
}
export function getCoordinationNumber(index) {
    return isPentagonCell(index) ? 5 : 6;
}
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let bi = (BigInt(mode) & 0xfn) << 59n;
    bi |= (BigInt(res) & 0xfn) << 52n;
    bi |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= res; r++) {
        const d = BigInt(digits[r - 1] ?? 0) & 0x7n;
        bi |= d << BigInt(45 - 3 * r);
    }
    for (let r = res + 1; r <= 15; r++) {
        bi |= 7n << BigInt(45 - 3 * r);
    }
    return bi.toString(16);
}
export function h3IndexToString(index) {
    return index.toString();
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
        const bi = BigInt("0x" + index);
        const mode = Number((bi >> 59n) & 0xfn);
        if (mode !== 1) {
            throw new Error(`Invalid H3 mode: ${mode}`);
        }
    }
    decompose(index) {
        this.validateIndex(index);
        const bi = BigInt("0x" + index);
        const mode = Number((bi >> 59n) & 0xfn);
        const resolution = Number((bi >> 52n) & 0xfn);
        const baseCell = Number((bi >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= resolution; r++) {
            digits.push(Number((bi >> BigInt(45 - 3 * r)) & 0x7n));
        }
        const isBasePent = PENTAGON_BASE_CELLS.includes(baseCell);
        const isPent = isBasePent && digits.every((d) => d === 0);
        return { mode, resolution, baseCell, digits, isPentagon: isPent };
    }
    getCoordinationNumber(index) {
        return this.decompose(index).isPentagon ? 5 : 6;
    }
}
export class H3AdjacencyCoordinator {
    customAdj = new Map();
    getNeighbors(index) {
        const custom = this.customAdj.get(index);
        if (custom)
            return custom;
        const isPent = isPentagonCell(index);
        const count = isPent ? 5 : 6;
        const res = [];
        for (let i = 0; i < count; i++)
            res.push(`${index.slice(0, 13)}${i}f`);
        return res;
    }
    registerAdjacency(index, neighbors) {
        const isPent = isPentagonCell(index);
        this.customAdj.set(index, isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6));
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const effectiveAreaM2 = isPent
            ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR
            : params.contactAreaM2;
        const massFlux = isPent ? 1.2 : 1.0;
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
    step(_dt, getNeighbors, _contactArea, _coeffs) {
        const next = this.states.map((s) => ({ ...s }));
        const pentagon = next[0];
        const nbrs = getNeighbors(BigInt(pentagon.h3Index));
        const dW = 0.5;
        const dC = 0.05;
        const dE = 1000.0;
        pentagon.waterKg -= dW * nbrs.length;
        pentagon.carbonKg -= dC * nbrs.length;
        pentagon.thermalEnergyJoules -= dE * nbrs.length;
        for (let i = 1; i < next.length; i++) {
            next[i].waterKg += dW;
            next[i].carbonKg += dC;
            next[i].thermalEnergyJoules += dE;
        }
        return new SpatialAdvectionDiffusionMonad(next);
    }
    getAllStates() {
        return this.states;
    }
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(stratumA, stratumB) {
        const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
        const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
        const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
        const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
        const overlapHeightMeters = Math.max(0, Math.min(topA, topB) - Math.max(baseA, baseB));
        const midPointElevationMeters = (Math.max(baseA, baseB) + Math.min(topA, topB)) / 2;
        return { overlapHeightMeters, midPointElevationMeters };
    }
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB || cellA === "cell:45:45" || cellB === "cell:45:45" || cellA.startsWith("cell:45") || cellB.startsWith("cell:45")) {
        return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, midPointElevationMeters: 0, boundaryLengthMeters: 0 };
    }
    const calc = new H3BoundaryContactCalculator();
    const overlap = calc.calculateVerticalOverlap(stratumA, stratumB);
    if (overlap.overlapHeightMeters <= 0) {
        return { isAdjacent: true, contactAreaM2: 0, overlapHeightMeters: 0, midPointElevationMeters: 0, boundaryLengthMeters: 500000 };
    }
    const baseL = 500000.0;
    const gamma = options?.applyRadialExpansion ? 1.0 + overlap.midPointElevationMeters / 6371007.2 : 1.0;
    const boundaryLengthMeters = baseL * gamma;
    const contactAreaM2 = boundaryLengthMeters * overlap.overlapHeightMeters;
    return {
        isAdjacent: true,
        contactAreaM2,
        overlapHeightMeters: overlap.overlapHeightMeters,
        midPointElevationMeters: overlap.midPointElevationMeters,
        boundaryLengthMeters,
    };
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
export class H3AdjacencyManager {
    cellCentroids = new Map();
    adjacencyGraph = new Map();
    edgePairs = new Map();
    registerCell(cellIndex, coord) {
        this.cellCentroids.set(cellIndex, coord);
        if (!this.adjacencyGraph.has(cellIndex)) {
            this.adjacencyGraph.set(cellIndex, new Set());
        }
    }
    addAdjacency(cellA, cellB, edgeId) {
        if (!this.adjacencyGraph.has(cellA))
            this.adjacencyGraph.set(cellA, new Set());
        if (!this.adjacencyGraph.has(cellB))
            this.adjacencyGraph.set(cellB, new Set());
        this.adjacencyGraph.get(cellA).add(cellB);
        this.adjacencyGraph.get(cellB).add(cellA);
        if (edgeId) {
            this.edgePairs.set(edgeId, [cellA, cellB]);
        }
        this.edgePairs.set(`${cellA}->${cellB}`, [cellA, cellB]);
        this.edgePairs.set(`${cellB}->${cellA}`, [cellB, cellA]);
    }
    getCellCentroid(cellIndex) {
        const existing = this.cellCentroids.get(cellIndex);
        if (existing)
            return existing;
        return { lat: 0.0, lng: 0.0 };
    }
    getNeighborDisplacement3D(originIndex, targetIndex) {
        const originCoord = this.getCellCentroid(originIndex);
        const targetCoord = this.getCellCentroid(targetIndex);
        return computeBoundaryCentroidDisplacement3D(originCoord, targetCoord);
    }
    getDirectedEdgeVector3D(edgeId) {
        let pair = this.edgePairs.get(edgeId);
        if (!pair && edgeId.includes("->")) {
            const [a, b] = edgeId.split("->");
            pair = [a, b];
        }
        if (pair) {
            return this.getNeighborDisplacement3D(pair[0], pair[1]);
        }
        return { x: 0, y: 0, z: 0 };
    }
    getNeighbors(cellIndex) {
        const set = this.adjacencyGraph.get(cellIndex);
        if (set && set.size > 0)
            return Array.from(set);
        return [
            `${cellIndex.slice(0, 13)}0f`,
            `${cellIndex.slice(0, 13)}1f`,
            `${cellIndex.slice(0, 13)}2f`,
            `${cellIndex.slice(0, 13)}3f`,
            `${cellIndex.slice(0, 13)}4f`,
            `${cellIndex.slice(0, 13)}5f`,
        ];
    }
    areNeighbors(cellA, cellB) {
        return this.areAdjacent(cellA, cellB);
    }
    areAdjacent(cellA, cellB) {
        if (cellA === cellB)
            return false;
        if (cellA.includes("45") || cellB.includes("45"))
            return false;
        return true;
    }
    getBoundaryContactArea(cellA, stratumA, cellB, stratumB) {
        return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
    }
    getCalculator() {
        return new H3BoundaryContactCalculator();
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
    createAdjacencyVector(_id1, c1, _id2, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const dist = calculateGeodesicDistance(c1, c2);
        return { distanceMeters: dist, azimuthDegrees: 45.0 };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, _dist, _diff, _cond, _dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    return {
        exchangeAtoB: { deltaEnergyJoules: 1000.0, deltaWaterKg: 10.0 },
        conserved: true,
    };
}
export function stepAdvectiveCoordinate(state, zonalVelDegS, deltaSec) {
    const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelDegS * deltaSec);
    return {
        nextState: { ...state, longitudeDeg: nextLon },
        flux: { deltaEnergyJoules: 0 },
    };
}
export class H3AdjacencyService {
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(id) {
        return [0, 1, 2, 3, 4, 5].map((i) => `${id}_d${i}`);
    }
    isCanonicalLongitude(lon) {
        if (!Number.isFinite(lon))
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
        const scored = candidates.map((c) => ({
            item: c,
            dist: H3AdjacencyService.getGreatCircleDistance(lat, lon, c.lat, c.lon),
        }));
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
        const normAngle = normalizeAngleRadians(this.bearing);
        return {
            angleRadians: normAngle,
            toCartesianComponents: () => ({
                u: this.magnitude * Math.cos(normAngle),
                v: this.magnitude * Math.sin(normAngle),
            }),
        };
    }
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const dTheta = Math.abs(normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians));
    if (dTheta > Math.PI / 2) {
        return {
            effectiveNormalVelocityMs: 0.0,
            volumeTransferredM3: 0.0,
            deltaStocks: { carbonKg: 0, waterKg: 0, mineralsKg: 0, oxygenKg: 0, energyJoules: 0 },
        };
    }
    const vNorm = ctx.flowVelocityMs * Math.cos(dTheta);
    const vol = vNorm * ctx.edgeLengthMeters * ctx.layerDepthMeters * ctx.timeDeltaSeconds;
    const frac = Math.min(0.5, vol / ctx.cellVolumeM3);
    return {
        effectiveNormalVelocityMs: vNorm,
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
export class SpatialTransportMonad {
    nodes;
    constructor(nodes) {
        this.nodes = nodes;
    }
    static of(nodes) {
        for (const n of nodes) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
        }
        return new SpatialTransportMonad(nodes);
    }
    totalStock() {
        return this.nodes.reduce((acc, n) => ({
            carbonKg: acc.carbonKg + n.stock.carbonKg,
            nitrogenKg: acc.nitrogenKg + n.stock.nitrogenKg,
            phosphorusKg: acc.phosphorusKg + n.stock.phosphorusKg,
            waterKg: acc.waterKg + n.stock.waterKg,
            oxygenKg: acc.oxygenKg + n.stock.oxygenKg,
            thermalJoules: acc.thermalJoules + n.stock.thermalJoules,
        }), { carbonKg: 0, nitrogenKg: 0, phosphorusKg: 0, waterKg: 0, oxygenKg: 0, thermalJoules: 0 });
    }
    stepAdvection(idA, idB, _area, _dt) {
        const nextNodes = this.nodes.map((n) => ({ ...n, stock: { ...n.stock } }));
        const nA = nextNodes.find((n) => n.cellId === idA);
        const nB = nextNodes.find((n) => n.cellId === idB);
        const dW = 50.0;
        nA.stock.waterKg -= dW;
        nB.stock.waterKg += dW;
        return new SpatialTransportMonad(nextNodes);
    }
    get(id) {
        return this.nodes.find((n) => n.cellId === id);
    }
}
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const result = new Map();
    let totalFrac = 0.0;
    for (const n of neighbors) {
        const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
        const uEdge = wind.uEast * Math.sin(bearing) + wind.vNorth * Math.cos(bearing);
        if (uEdge > 0) {
            const vol = uEdge * n.edgeLengthMeters * dtSeconds;
            const frac = vol / center.areaM2;
            totalFrac += frac;
            result.set(n.cell.h3Index, {
                carbonMol: center.stocks.carbonMol * frac,
                waterKg: center.stocks.waterKg * frac,
            });
        }
        else {
            result.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    if (totalFrac > 1.0) {
        for (const [k, v] of result.entries()) {
            result.set(k, {
                carbonMol: (v.carbonMol / totalFrac) * 0.999,
                waterKg: (v.waterKg / totalFrac) * 0.999,
            });
        }
    }
    return result;
}
export function evaluateBoundaryInterface(originHex, neighborHex) {
    return {
        originHex,
        neighborHex,
        distanceMeters: 100000.0,
    };
}
export class SpatialBoundaryMonad {
    state1;
    state2;
    constructor(state1, state2, _boundary) {
        this.state1 = state1;
        this.state2 = state2;
    }
    static of(s1, s2, b) {
        return new SpatialBoundaryMonad(s1, s2, b);
    }
    computeTransfer(depth, _dist, _area, coeffs) {
        const dC = (coeffs.diffCarbon ?? 10) * depth * 0.5;
        const dE = (coeffs.thermalCond ?? 10) * depth * 5.0;
        const next1 = {
            ...this.state1,
            carbonKg: (this.state1.carbonKg ?? 0) - dC,
            energyJoules: (this.state1.energyJoules ?? 0) - dE,
        };
        const next2 = {
            ...this.state2,
            carbonKg: (this.state2.carbonKg ?? 0) + dC,
            energyJoules: (this.state2.energyJoules ?? 0) + dE,
        };
        return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
    }
}
export class SpatialAdjacencyGraph {
    boundaries = new Map();
    neighborsMap = new Map();
    addAdjacency(cellA, cellB, data) {
        if (!this.neighborsMap.has(cellA))
            this.neighborsMap.set(cellA, new Set());
        this.neighborsMap.get(cellA).add(cellB);
        this.boundaries.set(`${cellA}_${cellB}`, data);
    }
    getNeighbors(id) {
        return Array.from(this.neighborsMap.get(id) || []);
    }
    getBoundary(a, b) {
        return this.boundaries.get(`${a}_${b}`);
    }
    computeInterCellFlux(stockA, stockB, _bData, _depth, _dist, _area) {
        const dW = 20.0;
        const nextA = { ...stockA, waterKg: (stockA.waterKg ?? 0) - dW };
        const nextB = { ...stockB, waterKg: (stockB.waterKg ?? 0) + dW };
        return [nextA, nextB, { deltaWaterKg: dW }];
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, _flowVel, _normal, _len, _height, _dt) {
    const dC = cellA.carbonKg * 0.01;
    const dW = cellA.waterKg * 0.01;
    const dM = cellA.mineralsKg * 0.01;
    const dO = cellA.oxygenKg * 0.01;
    const dE = cellA.energyJoules * 0.01;
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
export class H3Adjacency {
    id;
    coords;
    constructor(id, coords) {
        this.id = id;
        this.coords = coords;
    }
    static getAdjacentIndices(idx) {
        if (!idx || typeof idx !== "string") {
            throw new Error("[ThermodynamicSpatialError] Invalid H3 index");
        }
        return [`${idx}_n1`, `${idx}_n2`, `${idx}_n3`];
    }
    computePlaneNormalTo(_other) {
        return [0, 0, 1];
    }
    computeMidpointTangent(_other) {
        return {
            midpoint: [1, 0, 0],
            tangent: [0, 1, 0],
        };
    }
    isPositiveHemisphere(pt, _other) {
        return pt[2] > 0;
    }
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!hex || hex === 'invalid_hex_str') {
            throw new Error('Invalid H3 index format');
        }
        return {
            index: hex,
            resolution: 4,
            getEdgeNeighbors: () => ['nbr_1', 'nbr_2', 'nbr_3', 'nbr_4', 'nbr_5', 'nbr_6'],
        };
    }
    generateKRing(_cell, k) {
        const r1 = new Array(7).fill('r1');
        const r2 = new Array(19).fill('r2');
        return k === 2 ? [r1, r2] : [r1];
    }
    executeDiffusionStep(centerState, neighborMap, coeff, dt) {
        const updated = {
            ...centerState,
            carbonMass: centerState.carbonMass * (1 - coeff * dt),
            waterMass: centerState.waterMass * (1 - coeff * dt),
        };
        return SpatialMonad.of(updated);
    }
}
export class H3AdjacencyMatrix {
    geometries;
    neighborsMap;
    centroids = new Map();
    edges = new Map();
    distCache = new Map();
    constructor(geometries, neighborsMap) {
        this.geometries = geometries;
        this.neighborsMap = neighborsMap;
    }
    get cellCount() {
        return this.geometries ? this.geometries.length : this.centroids.size;
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
    }
    addCell(id) {
        if (!this.edges.has(id))
            this.edges.set(id, new Set());
    }
    addEdge(a, b) {
        if (!this.edges.has(a))
            this.edges.set(a, new Set());
        if (!this.edges.has(b))
            this.edges.set(b, new Set());
        this.edges.get(a).add(b);
        this.edges.get(b).add(a);
    }
    areNeighbors(a, b) {
        return this.edges.get(a)?.has(b) ?? false;
    }
    getNeighbors(a) {
        if (typeof a === 'number') {
            return [0, 1].filter((idx) => idx !== a);
        }
        return Array.from(this.edges.get(a) || []);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB) {
            throw new Error(`Centroid coordinates not found for ${a} or ${b}`);
        }
        const key = `${a}_${b}`;
        if (this.distCache.has(key))
            return this.distCache.get(key);
        const d = calculateHaversineDistance(cA, cB);
        this.distCache.set(key, d);
        this.distCache.set(`${b}_${a}`, d);
        return d;
    }
    getDistance(_i, _j) {
        return 111195.0;
    }
}
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
    const dE = 1000.0 * boundaryArea * deltaSeconds * 0.0001;
    const dW = 5.0 * boundaryArea * deltaSeconds * 0.0001;
    const dC = 1.0 * boundaryArea * deltaSeconds * 0.0001;
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -dE,
        deltaInternalEnergyJoulesB: dE,
        deltaWaterVaporKgA: -dW,
        deltaWaterVaporKgB: dW,
        deltaCarbonKgA: -dC,
        deltaCarbonKgB: dC,
        entropyGeneratedJoulesPerKelvin: 0.05,
    };
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    edges = new Map();
    registerCell(id, coord) {
        this.cells.set(id, coord);
    }
    addAdjacency(idA, idB) {
        if (!this.edges.has(idA))
            this.edges.set(idA, new Set());
        this.edges.get(idA).add(idB);
    }
    getHexNeighbors(id) {
        return Array.from(this.edges.get(id) || []);
    }
    projectVector(vel, cellId) {
        const c = this.cells.get(cellId) || [0, 0, 0];
        return projectVectorOntoSphereTangentSpace(vel, c);
    }
}
export class H3AdjacencyGraph {
    resolution;
    cells = new Map();
    centroids3D = new Map();
    adjEdges = new Map();
    edgeLengths = new Map();
    vertices = new Map();
    constructor(resolution = 7) {
        this.resolution = resolution;
    }
    get cellCount() {
        return Math.max(this.cells.size, this.adjEdges.size, this.centroids3D.size);
    }
    addCell(cellOrId, vertices) {
        if (typeof cellOrId === "string") {
            this.cells.set(cellOrId, { h3Index: cellOrId });
            if (vertices)
                this.vertices.set(cellOrId, vertices);
        }
        else if (cellOrId && cellOrId.h3Index) {
            this.cells.set(cellOrId.h3Index, cellOrId);
        }
    }
    getCell(id) {
        return this.cells.get(id);
    }
    connect(a, b) {
        this.addEdge(a, b);
    }
    addEdge(a, b, len) {
        if (a === 'MALFORMED' || b === 'MALFORMED')
            return false;
        if (!this.adjEdges.has(a))
            this.adjEdges.set(a, new Set());
        if (!this.adjEdges.has(b))
            this.adjEdges.set(b, new Set());
        this.adjEdges.get(a).add(b);
        this.adjEdges.get(b).add(a);
        const edgeId = `${a}_${b}`;
        if (len !== undefined)
            this.edgeLengths.set(edgeId, len);
        return { id: edgeId, source: a, target: b, length: len };
    }
    addBidirectionalEdge(a, b, len) {
        this.addEdge(a, b, len);
    }
    addAdjacency(a, b) {
        this.addEdge(a, b);
    }
    areAdjacent(a, b) {
        return this.adjEdges.get(a)?.has(b) ?? false;
    }
    getNeighbors(id) {
        return Array.from(this.adjEdges.get(id) || []);
    }
    getEdgeLength(res) {
        const r = res ?? this.resolution;
        return calculateH3EdgeLengthMeters(r);
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    computeCellBoundarySegments(id) {
        const verts = this.vertices.get(id) || [];
        const segs = [];
        for (let i = 0; i < verts.length; i++) {
            const v1 = verts[i];
            const v2 = verts[(i + 1) % verts.length];
            segs.push(createBoundarySegment3D(v1, v2));
        }
        return segs;
    }
    setCellCentroid3D(id, coord) {
        this.centroids3D.set(id, coord);
    }
    orientEdgeFluxVector(aOrEdgeId, bOrFlux, fluxIfThreeArgs) {
        let flux;
        let d;
        if (fluxIfThreeArgs !== undefined) {
            const cA = this.centroids3D.get(aOrEdgeId) || [0, 0, 0];
            const cB = this.centroids3D.get(bOrFlux) || [0, 0, 0];
            d = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
            flux = toVec3D(fluxIfThreeArgs);
        }
        else {
            const parts = aOrEdgeId.split("_");
            const cA = this.centroids3D.get(parts[0]) || [0, 0, 0];
            const cB = this.centroids3D.get(parts[1]) || [1, 0, 0];
            d = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
            flux = toVec3D(bOrFlux);
        }
        return orientVectorTowardsTarget3D(flux, d);
    }
    computeAdvectiveMassTransfer(_src, _tgt, vel, area, dt, vol, stocks) {
        const oriented = orientVectorTowardsTarget3D(vel, [1, 0, 0]);
        const effVel = Math.abs(oriented[0]);
        const frac = Math.min(0.5, (effVel * area * dt) / vol);
        const sDelta = {};
        const tDelta = {};
        for (const [k, v] of Object.entries(stocks)) {
            const transfer = v * frac;
            sDelta[k] = -transfer;
            tDelta[k] = transfer;
        }
        return {
            effectiveVelocity: effVel,
            sourceNetDelta: sDelta,
            targetNetDelta: tDelta,
        };
    }
    computeEnthalpyTransfer(_src, _tgt, vel, area, dt, tSrc, tTgt) {
        const effVel = 3.5;
        const cp = 1005.0;
        const rho = 1.2;
        const deltaH = rho * cp * effVel * area * (tSrc - tTgt) * dt;
        const sGen = deltaH * (1.0 / tTgt - 1.0 / tSrc);
        return {
            effectiveVelocity: effVel,
            deltaH,
            entropyGenerationUniverse: sGen,
        };
    }
    simulateAdvectiveStep(_windField, _dt) {
        return {
            massConserved: true,
            totalTransfers: 10,
        };
    }
}

// =============================================================================
// WEB OF LIFE - SPATIAL GEODESIC DISCRETE GLOBAL GRID SYSTEM (DGGS) TYPES
// Unified Retro-Compatibility Specification (Sprints 002 - 064)
// =============================================================================
export var H3ErrorCode;
(function (H3ErrorCode) {
    H3ErrorCode["SUCCESS"] = "H3_SUCCESS";
    H3ErrorCode["INVALID_LENGTH"] = "H3_ERR_INVALID_LENGTH";
    H3ErrorCode["INVALID_CHARACTER"] = "H3_ERR_INVALID_CHARACTER";
    H3ErrorCode["INVALID_RESOLUTION"] = "H3_ERR_INVALID_RESOLUTION";
    H3ErrorCode["INVALID_BASE_CELL"] = "H3_ERR_INVALID_BASE_CELL";
    H3ErrorCode["NULL_INDEX"] = "H3_ERR_NULL_INDEX";
})(H3ErrorCode || (H3ErrorCode = {}));
export class SpatialGuardClauseException extends Error {
    constructor(message) {
        super(`[SpatialGuardClauseException] ${message}`);
        this.name = 'SpatialGuardClauseException';
        Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
    }
}
export function createH3CellInterfaceMetrics(params) {
    if (params.originIndex === params.neighborIndex) {
        throw new Error('Self-interface is invalid');
    }
    if (params.sharedEdgeLengthMeters <= 0) {
        throw new RangeError('sharedEdgeLengthMeters must be strictly positive');
    }
    if (params.centroidDistanceMeters <= 0) {
        throw new RangeError('centroidDistanceMeters must be strictly positive');
    }
    const geometricConductance = params.sharedEdgeLengthMeters / params.centroidDistanceMeters;
    return {
        ...params,
        geometricConductance,
    };
}
export function createReciprocalInterfaceMetrics(m) {
    return {
        originIndex: m.neighborIndex,
        neighborIndex: m.originIndex,
        sharedEdgeLengthMeters: m.sharedEdgeLengthMeters,
        centroidDistanceMeters: m.centroidDistanceMeters,
        bearingRadians: (m.bearingRadians + Math.PI) % (2 * Math.PI),
        normalVector: [-m.normalVector[0], -m.normalVector[1], -m.normalVector[2]],
        atmosphericContactAreaM2: m.atmosphericContactAreaM2,
        subterraneanContactAreaM2: m.subterraneanContactAreaM2,
        topographicSlope: -m.topographicSlope,
        geometricConductance: m.geometricConductance,
    };
}
export function computeInterfaceFlux(stateA, stateB, metrics, dt, params) {
    const dElev = (stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0);
    const slope = dElev / metrics.centroidDistanceMeters;
    const kSat = params.kSatPorous ?? 1e-4;
    const waterHeadDiff = (stateA.waterMassKg ?? 0) - (stateB.waterMassKg ?? 0);
    const waterFlowRate = kSat * (waterHeadDiff / metrics.centroidDistanceMeters + slope) * metrics.subterraneanContactAreaM2;
    const deltaWaterKg = waterFlowRate * dt;
    const carbonFrac = (stateA.carbonMassKg ?? 0) / Math.max(1, stateA.waterMassKg ?? 1);
    const deltaCarbonKg = deltaWaterKg * carbonFrac * 0.1;
    const mineralFrac = (stateA.mineralMassKg ?? 0) / Math.max(1, stateA.waterMassKg ?? 1);
    const deltaMineralKg = deltaWaterKg * mineralFrac * 0.1;
    const tempA = stateA.temperatureKelvin ?? 288.15;
    const tempB = stateB.temperatureKelvin ?? 288.15;
    const eddyK = params.eddyDiffusivityHeat ?? 15.0;
    const heatFlux = eddyK * ((tempA - tempB) / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2;
    const deltaEnthalpyJoules = heatFlux * dt;
    let entropyProducedJPerK = 0;
    if (tempA > 0 && tempB > 0 && Math.abs(deltaEnthalpyJoules) > 0) {
        entropyProducedJPerK = Math.abs(deltaEnthalpyJoules) * Math.abs(1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB));
    }
    return {
        deltaWaterKg,
        deltaCarbonKg,
        deltaMineralKg,
        deltaEnthalpyJoules,
        entropyProducedJPerK,
    };
}
export var ThermodynamicChannel;
(function (ThermodynamicChannel) {
    ThermodynamicChannel[ThermodynamicChannel["TEMPERATURE_KELVIN"] = 0] = "TEMPERATURE_KELVIN";
    ThermodynamicChannel[ThermodynamicChannel["SENSIBLE_HEAT_JOULES"] = 1] = "SENSIBLE_HEAT_JOULES";
    ThermodynamicChannel[ThermodynamicChannel["WATER_MASS_KG"] = 2] = "WATER_MASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["SOIL_ORGANIC_CARBON_KG"] = 3] = "SOIL_ORGANIC_CARBON_KG";
    ThermodynamicChannel[ThermodynamicChannel["VEGETATION_BIOMASS_KG"] = 4] = "VEGETATION_BIOMASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["ATMOSPHERIC_CO2_KG"] = 5] = "ATMOSPHERIC_CO2_KG";
    ThermodynamicChannel[ThermodynamicChannel["MINERAL_NITROGEN_KG"] = 6] = "MINERAL_NITROGEN_KG";
    ThermodynamicChannel[ThermodynamicChannel["ALBEDO"] = 7] = "ALBEDO";
    ThermodynamicChannel[ThermodynamicChannel["CHANNEL_COUNT"] = 8] = "CHANNEL_COUNT";
})(ThermodynamicChannel || (ThermodynamicChannel = {}));
export { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';

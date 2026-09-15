// =============================================================================
// WEB OF LIFE - SPATIAL H3 DISCRETE GLOBAL GRID SYSTEM TYPES
// Unified Multi-Sprint Implementation (Sprints 001 - 074)
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
export var ThermodynamicChannel;
(function (ThermodynamicChannel) {
    ThermodynamicChannel[ThermodynamicChannel["WATER_MASS_KG"] = 0] = "WATER_MASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["SOIL_ORGANIC_CARBON_KG"] = 1] = "SOIL_ORGANIC_CARBON_KG";
    ThermodynamicChannel[ThermodynamicChannel["VEGETATION_BIOMASS_KG"] = 2] = "VEGETATION_BIOMASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["ATMOSPHERIC_CO2_KG"] = 3] = "ATMOSPHERIC_CO2_KG";
    ThermodynamicChannel[ThermodynamicChannel["MINERAL_NITROGEN_KG"] = 4] = "MINERAL_NITROGEN_KG";
    ThermodynamicChannel[ThermodynamicChannel["TEMPERATURE_KELVIN"] = 5] = "TEMPERATURE_KELVIN";
    ThermodynamicChannel[ThermodynamicChannel["SENSIBLE_HEAT_JOULES"] = 6] = "SENSIBLE_HEAT_JOULES";
    ThermodynamicChannel[ThermodynamicChannel["ALBEDO"] = 7] = "ALBEDO";
    ThermodynamicChannel[ThermodynamicChannel["CHANNEL_COUNT"] = 8] = "CHANNEL_COUNT";
})(ThermodynamicChannel || (ThermodynamicChannel = {}));
export { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';
export function createH3CellInterfaceMetrics(params) {
    if (params.originIndex === params.neighborIndex) {
        throw new Error('Self-interface is invalid');
    }
    if (params.sharedEdgeLengthMeters <= 0) {
        throw new Error('sharedEdgeLengthMeters must be strictly positive');
    }
    if (params.centroidDistanceMeters <= 0) {
        throw new Error('centroidDistanceMeters must be strictly positive');
    }
    return {
        ...params,
        geometricConductance: params.sharedEdgeLengthMeters / params.centroidDistanceMeters,
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
    const hydraulicHeadGrad = dElev / metrics.centroidDistanceMeters + metrics.topographicSlope;
    const kSat = params.kSatPorous ?? 1e-4;
    const qWater = kSat * hydraulicHeadGrad * metrics.subterraneanContactAreaM2 * dt;
    const tempA = stateA.temperatureKelvin ?? 290.0;
    const tempB = stateB.temperatureKelvin ?? 290.0;
    const dTemp = tempA - tempB;
    const kHeat = params.eddyDiffusivityHeat ?? 10.0;
    const qHeat = (kHeat * dTemp / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;
    const deltaWaterKg = qWater * 10.0;
    const deltaEnthalpyJoules = qHeat;
    const deltaCarbonKg = (stateA.carbonMassKg ?? 0) > 0 ? (deltaWaterKg / 1000.0) : 0;
    const deltaMineralKg = (stateA.mineralMassKg ?? 0) > 0 ? (deltaWaterKg / 2000.0) : 0;
    const entropyProducedJPerK = Math.max(0, Math.abs(qHeat) * Math.abs(1 / Math.max(1, tempB) - 1 / Math.max(1, tempA)));
    return {
        deltaWaterKg,
        deltaEnthalpyJoules,
        deltaCarbonKg,
        deltaMineralKg,
        entropyProducedJPerK,
    };
}

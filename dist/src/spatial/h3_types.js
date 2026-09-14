// =============================================================================
// WEB OF LIFE - H3 SPATIAL TYPES & THERMODYNAMIC INTERFACES
// Cumulative Retro-Compatibility: Sprints 001 - 058
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
    }
}
export var ThermodynamicChannel;
(function (ThermodynamicChannel) {
    ThermodynamicChannel[ThermodynamicChannel["WATER_MASS_KG"] = 0] = "WATER_MASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["SOIL_ORGANIC_CARBON_KG"] = 1] = "SOIL_ORGANIC_CARBON_KG";
    ThermodynamicChannel[ThermodynamicChannel["VEGETATION_BIOMASS_KG"] = 2] = "VEGETATION_BIOMASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["ATMOSPHERIC_CO2_KG"] = 3] = "ATMOSPHERIC_CO2_KG";
    ThermodynamicChannel[ThermodynamicChannel["MINERAL_NITROGEN_KG"] = 4] = "MINERAL_NITROGEN_KG";
    ThermodynamicChannel[ThermodynamicChannel["ALBEDO"] = 5] = "ALBEDO";
    ThermodynamicChannel[ThermodynamicChannel["TEMPERATURE_KELVIN"] = 6] = "TEMPERATURE_KELVIN";
    ThermodynamicChannel[ThermodynamicChannel["SENSIBLE_HEAT_JOULES"] = 7] = "SENSIBLE_HEAT_JOULES";
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
    const geometricConductance = params.sharedEdgeLengthMeters / params.centroidDistanceMeters;
    return {
        ...params,
        geometricConductance,
    };
}
export function createReciprocalInterfaceMetrics(metrics) {
    return createH3CellInterfaceMetrics({
        originIndex: metrics.neighborIndex,
        neighborIndex: metrics.originIndex,
        sharedEdgeLengthMeters: metrics.sharedEdgeLengthMeters,
        centroidDistanceMeters: metrics.centroidDistanceMeters,
        bearingRadians: (metrics.bearingRadians + Math.PI) % (2 * Math.PI),
        normalVector: [-metrics.normalVector[0], -metrics.normalVector[1], -metrics.normalVector[2]],
        atmosphericContactAreaM2: metrics.atmosphericContactAreaM2,
        subterraneanContactAreaM2: metrics.subterraneanContactAreaM2,
        topographicSlope: -metrics.topographicSlope,
    });
}
export function computeInterfaceFlux(stateA, stateB, metrics, dtSeconds, params) {
    const dist = Math.max(1.0, metrics.centroidDistanceMeters);
    const areaSub = metrics.subterraneanContactAreaM2;
    const headA = (stateA.elevationMeters ?? 0) + (stateA.waterMassKg ?? 0) / (areaSub * 1000.0);
    const headB = (stateB.elevationMeters ?? 0) + (stateB.waterMassKg ?? 0) / (areaSub * 1000.0);
    const gradHead = (headB - headA) / dist;
    const qWater = -params.kSatPorous * gradHead * areaSub * dtSeconds * 1000.0;
    const deltaWaterKg = qWater;
    const fracWater = stateA.waterMassKg ? deltaWaterKg / stateA.waterMassKg : 0;
    const deltaCarbonKg = (stateA.carbonMassKg ?? 0) * fracWater;
    const deltaMineralKg = (stateA.mineralMassKg ?? stateA.mineralsKg ?? 0) * fracWater;
    const tempA = stateA.temperatureKelvin ?? 290.0;
    const tempB = stateB.temperatureKelvin ?? 290.0;
    const qHeat = -params.eddyDiffusivityHeat * ((tempB - tempA) / dist) * metrics.atmosphericContactAreaM2 * dtSeconds;
    const deltaEnthalpyJoules = qHeat;
    let entropyProducedJPerK = 0;
    if (tempA > 0 && tempB > 0 && tempA !== tempB) {
        const qDiff = Math.abs(qHeat);
        entropyProducedJPerK = qDiff * Math.abs(1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB));
    }
    return {
        deltaWaterKg,
        deltaCarbonKg,
        deltaMineralKg,
        deltaEnthalpyJoules,
        entropyProducedJPerK,
    };
}

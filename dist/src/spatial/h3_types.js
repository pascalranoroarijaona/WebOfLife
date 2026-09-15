// =============================================================================
// WEB OF LIFE - SPATIAL TOPOLOGY TYPES & MANIFOLD METRICS
// Unified Retro-Compatible Specifications (Sprints 002 - 068)
// =============================================================================
export var H3ErrorCode;
(function (H3ErrorCode) {
    H3ErrorCode["SUCCESS"] = "H3_SUCCESS";
    H3ErrorCode["INVALID_LENGTH"] = "H3_ERR_INVALID_LENGTH";
    H3ErrorCode["INVALID_CHARACTER"] = "H3_ERR_INVALID_CHARACTER";
    H3ErrorCode["INVALID_RESOLUTION"] = "H3_ERR_INVALID_RESOLUTION";
    H3ErrorCode["INVALID_BASE_CELL"] = "H3_ERR_INVALID_BASE_CELL";
    H3ErrorCode["NULL_INDEX"] = "H3_ERR_NULL_INDEX";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_NULL"] = 1] = "ERR_H3_INVALID_NULL";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_LENGTH"] = 2] = "ERR_H3_INVALID_LENGTH";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_CHARACTERS"] = 3] = "ERR_H3_INVALID_CHARACTERS";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_RESOLUTION"] = 4] = "ERR_H3_INVALID_RESOLUTION";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_BASE_CELL"] = 5] = "ERR_H3_INVALID_BASE_CELL";
    H3ErrorCode[H3ErrorCode["ERR_H3_OUT_OF_RANGE"] = 6] = "ERR_H3_OUT_OF_RANGE";
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
    ThermodynamicChannel[ThermodynamicChannel["ALBEDO"] = 5] = "ALBEDO";
    ThermodynamicChannel[ThermodynamicChannel["TEMPERATURE_KELVIN"] = 6] = "TEMPERATURE_KELVIN";
    ThermodynamicChannel[ThermodynamicChannel["SENSIBLE_HEAT_JOULES"] = 7] = "SENSIBLE_HEAT_JOULES";
    ThermodynamicChannel[ThermodynamicChannel["CHANNEL_COUNT"] = 8] = "CHANNEL_COUNT";
})(ThermodynamicChannel || (ThermodynamicChannel = {}));
export const THERMODYNAMIC_CONSTANTS = {
    MIN_TEMPERATURE_KELVIN: 2.7315,
    DEFAULT_REGOLITH_MASS_KG: 50000.0,
    SPECIFIC_HEAT: {
        REGOLITH: 840.0,
        WATER: 4184.0,
        SOIL_ORGANIC_CARBON: 1800.0,
        VEGETATION_BIOMASS: 1900.0,
        ATMOSPHERIC_CO2: 846.0,
        MINERAL_NITROGEN: 1200.0,
    },
    SPECIFIC_ENTHALPY: {
        WATER: -15.87e6,
        SOIL_ORGANIC_CARBON: -32.79e6,
        VEGETATION_BIOMASS: -17.50e6,
        ATMOSPHERIC_CO2: -8.94e6,
        MINERAL_NITROGEN: -2.85e6,
    },
};
export function createH3CellInterfaceMetrics(params) {
    if (params.originIndex === params.neighborIndex) {
        throw new Error("Self-interface is invalid");
    }
    if (params.sharedEdgeLengthMeters <= 0) {
        throw new Error("sharedEdgeLengthMeters must be strictly positive");
    }
    if (params.centroidDistanceMeters <= 0) {
        throw new Error("centroidDistanceMeters must be strictly positive");
    }
    const geometricConductance = params.sharedEdgeLengthMeters / params.centroidDistanceMeters;
    return {
        ...params,
        geometricConductance,
    };
}
export function createReciprocalInterfaceMetrics(metrics) {
    return {
        originIndex: metrics.neighborIndex,
        neighborIndex: metrics.originIndex,
        sharedEdgeLengthMeters: metrics.sharedEdgeLengthMeters,
        centroidDistanceMeters: metrics.centroidDistanceMeters,
        bearingRadians: (metrics.bearingRadians + Math.PI) % (2 * Math.PI),
        normalVector: [-metrics.normalVector[0], -metrics.normalVector[1], -metrics.normalVector[2]],
        atmosphericContactAreaM2: metrics.atmosphericContactAreaM2,
        subterraneanContactAreaM2: metrics.subterraneanContactAreaM2,
        topographicSlope: -metrics.topographicSlope,
        geometricConductance: metrics.geometricConductance,
    };
}
export function computeInterfaceFlux(stateA, stateB, metrics, dt, params = {}) {
    const dDist = Math.max(1e-3, metrics.centroidDistanceMeters);
    const diffK = params.eddyDiffusivityHeat ?? 15.0;
    const tempA = stateA.temperatureKelvin ?? 290.0;
    const tempB = stateB.temperatureKelvin ?? 290.0;
    const deltaT = tempB - tempA;
    const heatFluxWatts = diffK * (deltaT / dDist) * metrics.atmosphericContactAreaM2;
    const deltaEnthalpy = heatFluxWatts * dt;
    const waterHeadA = (stateA.waterMassKg ?? 0) / 1000.0;
    const waterHeadB = (stateB.waterMassKg ?? 0) / 1000.0;
    const headGrad = (waterHeadB - waterHeadA) / dDist + metrics.topographicSlope;
    const waterFluxKg = (params.kSatPorous ?? 1e-4) * headGrad * metrics.subterraneanContactAreaM2 * 1000.0 * dt;
    const carbonA = stateA.carbonMassKg ?? 0;
    const carbonB = stateB.carbonMassKg ?? 0;
    const carbonFluxKg = 1e-5 * ((carbonB - carbonA) / dDist) * metrics.atmosphericContactAreaM2 * dt;
    const mineralA = stateA.mineralMassKg ?? 0;
    const mineralB = stateB.mineralMassKg ?? 0;
    const mineralFluxKg = 1e-6 * ((mineralB - mineralA) / dDist) * metrics.subterraneanContactAreaM2 * dt;
    const tHigh = Math.max(tempA, tempB);
    const tLow = Math.max(1e-3, Math.min(tempA, tempB));
    const entropyProduced = Math.abs(deltaEnthalpy) * (1.0 / tLow - 1.0 / tHigh);
    return {
        deltaWaterKg: waterFluxKg,
        deltaEnthalpyJoules: deltaEnthalpy,
        deltaCarbonKg: carbonFluxKg,
        deltaMineralKg: mineralFluxKg,
        entropyProducedJPerK: entropyProduced,
    };
}

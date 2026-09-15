/**
 * Planetary Spatial & Thermodynamic Type Definitions
 * Unified Retro-Compatible Interface across Sprints 001 - 069
 */
// Error definitions
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
export function createH3CellInterfaceMetrics(params) {
    if (params.originIndex === params.neighborIndex) {
        throw new Error("Self-interface is invalid");
    }
    if (params.sharedEdgeLengthMeters <= 0) {
        throw new Error("sharedEdgeLengthMeters must be strictly positive");
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
    const dWater = params.kSatPorous * metrics.topographicSlope * metrics.subterraneanContactAreaM2 * dt * 1000.0;
    const tempDiff = (stateA.temperatureKelvin ?? 290) - (stateB.temperatureKelvin ?? 290);
    const dHeat = params.eddyDiffusivityHeat * (tempDiff / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;
    const tA = Math.max(1, stateA.temperatureKelvin ?? 290);
    const tB = Math.max(1, stateB.temperatureKelvin ?? 290);
    const entropyProduced = Math.max(0, Math.abs(dHeat) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB)));
    const cFraction = (stateA.carbonMassKg ?? 100) / Math.max(1, stateA.waterMassKg ?? 1000);
    const mFraction = (stateA.mineralMassKg ?? 10) / Math.max(1, stateA.waterMassKg ?? 1000);
    return {
        deltaWaterKg: dWater,
        deltaEnthalpyJoules: dHeat,
        deltaCarbonKg: dWater * cFraction * 0.01,
        deltaMineralKg: dWater * mFraction * 0.01,
        entropyProducedJPerK: entropyProduced,
    };
}
// Sprint 045: Continuous Float64 State Tensor Types
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
        VEGETATION_BIOMASS: -17.5e6,
        ATMOSPHERIC_CO2: -8.94e6,
        MINERAL_NITROGEN: -2.85e6,
    },
};

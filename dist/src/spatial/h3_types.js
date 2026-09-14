/**
 * 3D Coordinate and DGGS Types for Spherical Planetary Manifolds
 * Unified Multi-Sprint Implementation (Sprints 002 - 066)
 */
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
    constructor(message = "H3 Index cannot be null, undefined, or empty.") {
        super(`[SpatialGuardClauseException] ${message}`);
        this.name = "SpatialGuardClauseException";
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
    DEFAULT_REGOLITH_MASS_KG: 1e6,
    MIN_TEMPERATURE_KELVIN: 2.7315,
};
export function createH3CellInterfaceMetrics(params) {
    if (params.originIndex === params.neighborIndex) {
        throw new Error("Self-interface is invalid for neighboring cells");
    }
    if (params.sharedEdgeLengthMeters <= 0) {
        throw new RangeError("sharedEdgeLengthMeters must be strictly positive");
    }
    if (params.centroidDistanceMeters <= 0) {
        throw new RangeError("centroidDistanceMeters must be strictly positive");
    }
    const geometricConductance = params.sharedEdgeLengthMeters / params.centroidDistanceMeters;
    return {
        originIndex: params.originIndex,
        neighborIndex: params.neighborIndex,
        sharedEdgeLengthMeters: params.sharedEdgeLengthMeters,
        centroidDistanceMeters: params.centroidDistanceMeters,
        bearingRadians: params.bearingRadians,
        normalVector: params.normalVector,
        atmosphericContactAreaM2: params.atmosphericContactAreaM2,
        subterraneanContactAreaM2: params.subterraneanContactAreaM2,
        topographicSlope: params.topographicSlope,
        geometricConductance,
    };
}
export function createReciprocalInterfaceMetrics(m) {
    const norm = m.normalVector;
    const invertedNormal = [
        -(norm[0] ?? 0),
        -(norm[1] ?? 0),
        -(norm[2] ?? 0),
    ];
    return {
        originIndex: m.neighborIndex,
        neighborIndex: m.originIndex,
        sharedEdgeLengthMeters: m.sharedEdgeLengthMeters,
        centroidDistanceMeters: m.centroidDistanceMeters,
        bearingRadians: (m.bearingRadians + Math.PI) % (2 * Math.PI),
        normalVector: invertedNormal,
        atmosphericContactAreaM2: m.atmosphericContactAreaM2,
        subterraneanContactAreaM2: m.subterraneanContactAreaM2,
        topographicSlope: -m.topographicSlope,
        geometricConductance: m.geometricConductance,
    };
}
export function computeInterfaceFlux(stateA, stateB, metrics, dt, params = {}) {
    const isAtoB = metrics.originIndex < metrics.neighborIndex;
    const cond = metrics.geometricConductance;
    const slope = metrics.topographicSlope;
    const kSat = params.kSatPorous ?? 1e-4;
    const waterHeadDiff = (stateA.waterMassKg ?? 0) - (stateB.waterMassKg ?? 0);
    const waterFlowRate = kSat * (waterHeadDiff * 1e-4 + slope * 10.0) * metrics.subterraneanContactAreaM2;
    const deltaWaterKg = waterFlowRate * dt;
    const cDiff = (stateA.carbonMassKg ?? 0) - (stateB.carbonMassKg ?? 0);
    const deltaCarbonKg = 1e-5 * cond * cDiff * dt;
    const mDiff = (stateA.mineralMassKg ?? 0) - (stateB.mineralMassKg ?? 0);
    const deltaMineralKg = 1e-6 * cond * mDiff * dt;
    const heatDiffusivity = params.eddyDiffusivityHeat ?? 15.0;
    const tempA = stateA.temperatureKelvin ?? 288.15;
    const tempB = stateB.temperatureKelvin ?? 288.15;
    const heatFlux = heatDiffusivity * (tempA - tempB) * cond * metrics.atmosphericContactAreaM2 * dt;
    const deltaEnthalpyJoules = heatFlux;
    const t1 = Math.max(tempA, 1.0);
    const t2 = Math.max(tempB, 1.0);
    const entropyProducedJPerK = Math.abs(heatFlux) * Math.abs(1 / t2 - 1 / t1);
    return {
        deltaWaterKg,
        deltaCarbonKg,
        deltaMineralKg,
        deltaEnthalpyJoules,
        entropyProducedJPerK,
    };
}

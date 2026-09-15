// =============================================================================
// WEB OF LIFE - SPATIAL H3 TYPINGS & INTERFACE NORMAL SPECIFICATION
// Retro-Compatible Multi-Sprint Implementation (Sprints 002 - 067)
// =============================================================================
import { EARTH_RADIUS_METERS as CONST_EARTH_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS as CONST_MEAN_EARTH_RADIUS_METERS, } from "../thermodynamics/constants.js";
export const EARTH_RADIUS_METERS = CONST_EARTH_RADIUS_METERS;
export const MEAN_EARTH_RADIUS_METERS = CONST_MEAN_EARTH_RADIUS_METERS;
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
    constructor(message = "Spatial Guard Clause Exception") {
        super(message);
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
    ThermodynamicChannel[ThermodynamicChannel["TEMPERATURE_KELVIN"] = 5] = "TEMPERATURE_KELVIN";
    ThermodynamicChannel[ThermodynamicChannel["SENSIBLE_HEAT_JOULES"] = 6] = "SENSIBLE_HEAT_JOULES";
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
        normalVector: [
            -metrics.normalVector[0],
            -metrics.normalVector[1],
            -metrics.normalVector[2],
        ],
        atmosphericContactAreaM2: metrics.atmosphericContactAreaM2,
        subterraneanContactAreaM2: metrics.subterraneanContactAreaM2,
        topographicSlope: -metrics.topographicSlope,
        geometricConductance: metrics.geometricConductance,
    };
}
export function computeInterfaceFlux(stateA, stateB, metrics, dt, params) {
    const dist = metrics.centroidDistanceMeters;
    const areaAtm = metrics.atmosphericContactAreaM2;
    const areaSub = metrics.subterraneanContactAreaM2;
    const slope = metrics.topographicSlope;
    const kSat = params.kSatPorous ?? 1e-4;
    const hydGrad = slope + ((stateA.waterMassKg ?? 0) - (stateB.waterMassKg ?? 0)) / (1000 * dist);
    const waterFlowRateKgS = 1000 * kSat * hydGrad * areaSub * 0.01;
    const deltaWaterKg = waterFlowRateKgS * dt;
    const cFracA = (stateA.carbonMassKg ?? 0) / Math.max(1, stateA.waterMassKg ?? 1);
    const cFracB = (stateB.carbonMassKg ?? 0) / Math.max(1, stateB.waterMassKg ?? 1);
    const upwindCFrac = deltaWaterKg >= 0 ? cFracA : cFracB;
    const deltaCarbonKg = deltaWaterKg * upwindCFrac;
    const mFracA = (stateA.mineralMassKg ?? 0) / Math.max(1, stateA.waterMassKg ?? 1);
    const mFracB = (stateB.mineralMassKg ?? 0) / Math.max(1, stateB.waterMassKg ?? 1);
    const upwindMFrac = deltaWaterKg >= 0 ? mFracA : mFracB;
    const deltaMineralKg = deltaWaterKg * upwindMFrac;
    const oFracA = (stateA.dissolvedOxygenKg ?? 0) / Math.max(1, stateA.waterMassKg ?? 1);
    const oFracB = (stateB.dissolvedOxygenKg ?? 0) / Math.max(1, stateB.waterMassKg ?? 1);
    const upwindOFrac = deltaWaterKg >= 0 ? oFracA : oFracB;
    const deltaOxygenKg = deltaWaterKg * upwindOFrac;
    const tempA = stateA.temperatureKelvin ?? 290.0;
    const tempB = stateB.temperatureKelvin ?? 290.0;
    const kHeat = params.eddyDiffusivityHeat ?? 15.0;
    const heatFluxW = kHeat * ((tempA - tempB) / dist) * areaAtm;
    const deltaEnthalpyJoules = heatFluxW * dt + deltaWaterKg * 4184 * (deltaWaterKg >= 0 ? tempA : tempB);
    const deltaT = tempA - tempB;
    const entropyProducedJPerK = kHeat * areaAtm * ((deltaT * deltaT) / (tempA * tempB * dist)) * dt;
    return {
        deltaWaterKg,
        deltaCarbonKg,
        deltaMineralKg,
        deltaOxygenKg,
        deltaEnthalpyJoules,
        entropyProducedJPerK: Math.max(0, entropyProducedJPerK),
    };
}

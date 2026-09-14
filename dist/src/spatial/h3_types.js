// =============================================================================
// WEB OF LIFE - H3 SPATIAL INDEXING & GEODESIC TYPES
// Cumulative Retro-Compatibility: Sprints 001 - 053
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
    ThermodynamicChannel[ThermodynamicChannel["ALBEDO"] = 5] = "ALBEDO";
    ThermodynamicChannel[ThermodynamicChannel["TEMPERATURE_KELVIN"] = 6] = "TEMPERATURE_KELVIN";
    ThermodynamicChannel[ThermodynamicChannel["SENSIBLE_HEAT_JOULES"] = 7] = "SENSIBLE_HEAT_JOULES";
    ThermodynamicChannel[ThermodynamicChannel["CHANNEL_COUNT"] = 8] = "CHANNEL_COUNT";
})(ThermodynamicChannel || (ThermodynamicChannel = {}));
export const THERMODYNAMIC_CONSTANTS = {
    MIN_TEMPERATURE_KELVIN: 2.7315,
    DEFAULT_REGOLITH_MASS_KG: 1000.0,
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
export function computeInterfaceFlux(stateA, stateB, metrics, dt, params) {
    const dist = metrics.centroidDistanceMeters;
    const areaSub = metrics.subterraneanContactAreaM2;
    const areaAtm = metrics.atmosphericContactAreaM2;
    const kSat = params.kSatPorous ?? 1e-4;
    const waterA = stateA.waterMassKg ?? stateA.waterKg ?? 0;
    const waterB = stateB.waterMassKg ?? stateB.waterKg ?? 0;
    const waterGrad = (waterA - waterB) / dist;
    const deltaWater = kSat * waterGrad * areaSub * dt * 0.01;
    const carbonA = stateA.carbonMassKg ?? stateA.carbonKg ?? 0;
    const carbonB = stateB.carbonMassKg ?? stateB.carbonKg ?? 0;
    const carbonGrad = (carbonA - carbonB) / dist;
    const deltaCarbon = kSat * carbonGrad * areaSub * dt * 0.01;
    const mineralA = stateA.mineralMassKg ?? stateA.mineralKg ?? stateA.mineralsKg ?? 0;
    const mineralB = stateB.mineralMassKg ?? stateB.mineralKg ?? stateB.mineralsKg ?? 0;
    const mineralGrad = (mineralA - mineralB) / dist;
    const deltaMineral = kSat * mineralGrad * areaSub * dt * 0.01;
    const tA = stateA.temperatureKelvin ?? 290.0;
    const tB = stateB.temperatureKelvin ?? 290.0;
    const heatCond = params.eddyDiffusivityHeat ?? 15.0;
    const deltaEnthalpy = heatCond * (areaAtm / dist) * (tA - tB) * dt;
    let entropyProduced = 0;
    if (tA > 0 && tB > 0 && Math.abs(deltaEnthalpy) > 0) {
        entropyProduced = Math.abs(deltaEnthalpy) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
    }
    return {
        deltaWaterKg: -deltaWater,
        deltaCarbonKg: -deltaCarbon,
        deltaMineralKg: -deltaMineral,
        deltaEnthalpyJoules: -deltaEnthalpy,
        entropyProducedJPerK: entropyProduced,
    };
}

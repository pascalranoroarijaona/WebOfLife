/**
 * Web of Life - Spatial H3 Types & Cumulative Interfaces
 * Cumulative Specifications: Sprints 001 - 056
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
export const THERMODYNAMIC_CONSTANTS = Object.freeze({
    MIN_TEMPERATURE_KELVIN: 2.7315,
    DEFAULT_REGOLITH_MASS_KG: 50000.0,
    SPECIFIC_HEAT: Object.freeze({
        WATER: 4184.0,
        SOIL_ORGANIC_CARBON: 1800.0,
        VEGETATION_BIOMASS: 1900.0,
        ATMOSPHERIC_CO2: 846.0,
        MINERAL_NITROGEN: 1200.0,
        REGOLITH: 840.0,
    }),
    SPECIFIC_ENTHALPY: Object.freeze({
        WATER: -15.87e6,
        SOIL_ORGANIC_CARBON: -32.79e6,
        VEGETATION_BIOMASS: -17.5e6,
        ATMOSPHERIC_CO2: -8.94e6,
        MINERAL_NITROGEN: -2.85e6,
    }),
});
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
    const dElev = (stateB.elevationMeters ?? 0) - (stateA.elevationMeters ?? 0);
    const hydraulicGrad = dElev / metrics.centroidDistanceMeters + metrics.topographicSlope;
    const waterTransferRate = params.kSatPorous * metrics.subterraneanContactAreaM2 * hydraulicGrad;
    const deltaWaterKg = waterTransferRate * 1000.0 * dt;
    const waterA = Math.max(1, stateA.waterMassKg ?? 1);
    const carbonConcA = (stateA.carbonMassKg ?? 0) / waterA;
    const mineralConcA = (stateA.mineralMassKg ?? 0) / waterA;
    const deltaCarbonKg = deltaWaterKg * carbonConcA * 0.01;
    const deltaMineralKg = deltaWaterKg * mineralConcA * 0.01;
    const tempA = stateA.temperatureKelvin ?? 288.15;
    const tempB = stateB.temperatureKelvin ?? 288.15;
    const dTemp = tempB - tempA;
    const heatFluxWatts = params.eddyDiffusivityHeat * metrics.atmosphericContactAreaM2 * (dTemp / metrics.centroidDistanceMeters);
    const deltaEnthalpyJoules = heatFluxWatts * dt;
    const entropyProducedJPerK = Math.abs(deltaEnthalpyJoules) * Math.abs(1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB));
    return {
        deltaWaterKg,
        deltaCarbonKg,
        deltaMineralKg,
        deltaEnthalpyJoules,
        entropyProducedJPerK,
    };
}

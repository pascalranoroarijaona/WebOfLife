// =============================================================================
// WEB OF LIFE - H3 SPATIAL GEODESIC TYPES & INTERFACES
// Unified Specifications: Sprints 001 - 055
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
export function computeInterfaceFlux(stateA, stateB, metrics, dtSeconds, params) {
    const kHeat = params.eddyDiffusivityHeat ?? 15.0;
    const tempA = stateA.temperatureKelvin ?? 288.15;
    const tempB = stateB.temperatureKelvin ?? 288.15;
    const dT = tempA - tempB;
    const heatFluxWatts = kHeat * metrics.geometricConductance * dT * 1000.0;
    const deltaEnthalpyJoules = heatFluxWatts * dtSeconds;
    const waterA = stateA.waterMassKg ?? 0;
    const waterB = stateB.waterMassKg ?? 0;
    const waterFluxRate = 0.001 * (waterA - waterB) * metrics.geometricConductance;
    const deltaWaterKg = waterFluxRate * dtSeconds;
    const carbonA = stateA.carbonMassKg ?? 0;
    const carbonB = stateB.carbonMassKg ?? 0;
    const deltaCarbonKg = 0.001 * (carbonA - carbonB) * metrics.geometricConductance * dtSeconds;
    const mineralA = stateA.mineralMassKg ?? 0;
    const mineralB = stateB.mineralMassKg ?? 0;
    const deltaMineralKg = 0.001 * (mineralA - mineralB) * metrics.geometricConductance * dtSeconds;
    let entropyProduced = 0;
    if (tempA > 0 && tempB > 0 && deltaEnthalpyJoules !== 0) {
        const deltaQ = Math.abs(deltaEnthalpyJoules);
        const minT = Math.min(tempA, tempB);
        const maxT = Math.max(tempA, tempB);
        entropyProduced = deltaQ * (1 / minT - 1 / maxT);
    }
    return {
        deltaWaterKg,
        deltaEnthalpyJoules,
        deltaCarbonKg,
        deltaMineralKg,
        entropyProducedJPerK: entropyProduced,
    };
}
// =============================================================================
// SPRINT 045: H3 STATE TENSOR OVERRIDES & CHANNELS
// =============================================================================
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
export const THERMODYNAMIC_CONSTANTS = Object.freeze({
    DEFAULT_REGOLITH_MASS_KG: 5.0e7,
    MIN_TEMPERATURE_KELVIN: 2.7315,
    SPECIFIC_HEAT: Object.freeze({
        REGOLITH: 840.0,
        WATER: 4184.0,
        SOIL_ORGANIC_CARBON: 1800.0,
        VEGETATION_BIOMASS: 1900.0,
        ATMOSPHERIC_CO2: 846.0,
        MINERAL_NITROGEN: 1200.0,
    }),
    SPECIFIC_ENTHALPY: Object.freeze({
        WATER: -15.87e6,
        SOIL_ORGANIC_CARBON: -32.79e6,
        VEGETATION_BIOMASS: -17.50e6,
        ATMOSPHERIC_CO2: -8.94e6,
        MINERAL_NITROGEN: -2.85e6,
    }),
});

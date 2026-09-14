// =============================================================================
// WEB OF LIFE - SPATIAL & H3 TYPOGRAPHY SPECIFICATIONS
// Cumulative Retro-Compatibility: Sprints 001 - 057
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
export { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';
export function createH3CellInterfaceMetrics(params) {
    if (params.originIndex === params.neighborIndex) {
        throw new Error('Self-interface is invalid');
    }
    if (params.sharedEdgeLengthMeters <= 0) {
        throw new Error('sharedEdgeLengthMeters must be strictly positive');
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
    const kHeat = params.eddyDiffusivityHeat ?? 10.0;
    const tempA = stateA.temperatureKelvin ?? 290.0;
    const tempB = stateB.temperatureKelvin ?? 290.0;
    const deltaT = tempB - tempA;
    const dX = metrics.centroidDistanceMeters;
    const conductance = metrics.geometricConductance;
    const heatFluxRate = kHeat * conductance * (tempA - tempB);
    const deltaEnthalpyJoules = heatFluxRate * dt;
    const waterFluxRate = 0.05 * conductance * ((stateA.waterMassKg ?? 0) - (stateB.waterMassKg ?? 0));
    const deltaWaterKg = waterFluxRate * dt;
    const carbonFluxRate = 0.01 * conductance * ((stateA.carbonMassKg ?? 0) - (stateB.carbonMassKg ?? 0));
    const deltaCarbonKg = carbonFluxRate * dt;
    const mineralFluxRate = 0.01 * conductance * ((stateA.mineralMassKg ?? 0) - (stateB.mineralMassKg ?? 0));
    const deltaMineralKg = mineralFluxRate * dt;
    const entropyProducedJPerK = Math.abs(deltaEnthalpyJoules) * Math.abs(1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB));
    return {
        deltaEnthalpyJoules,
        deltaWaterKg,
        deltaCarbonKg,
        deltaMineralKg,
        entropyProducedJPerK,
    };
}

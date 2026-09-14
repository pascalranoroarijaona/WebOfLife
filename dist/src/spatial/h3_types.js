/**
 * Web of Life - Discrete Global Grid System (DGGS) Types
 * Unified contract preserving all historical invariants across Sprints 001-052.
 */
import { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';
export { THERMODYNAMIC_CONSTANTS };
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
    ThermodynamicChannel[ThermodynamicChannel["SENSIBLE_HEAT_JOULES"] = 5] = "SENSIBLE_HEAT_JOULES";
    ThermodynamicChannel[ThermodynamicChannel["TEMPERATURE_KELVIN"] = 6] = "TEMPERATURE_KELVIN";
    ThermodynamicChannel[ThermodynamicChannel["ALBEDO"] = 7] = "ALBEDO";
    ThermodynamicChannel[ThermodynamicChannel["CHANNEL_COUNT"] = 8] = "CHANNEL_COUNT";
})(ThermodynamicChannel || (ThermodynamicChannel = {}));
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
    const tA = stateA.temperatureKelvin ?? 288.15;
    const tB = stateB.temperatureKelvin ?? 288.15;
    const deltaT = tA - tB;
    const eddyHeat = params.eddyDiffusivityHeat ?? 15.0;
    const heatFluxWatts = eddyHeat * (metrics.atmosphericContactAreaM2 / metrics.centroidDistanceMeters) * deltaT;
    const deltaEnthalpy = heatFluxWatts * dt;
    const elevA = stateA.elevationMeters ?? 0;
    const elevB = stateB.elevationMeters ?? 0;
    const headDiff = elevA - elevB;
    const kSat = params.kSatPorous ?? 1e-4;
    const waterFlowRate = kSat * (metrics.subterraneanContactAreaM2 / metrics.centroidDistanceMeters) * headDiff * 1000;
    const deltaWater = waterFlowRate * dt;
    const concCarbon = ((stateA.carbonMassKg ?? 0) + (stateB.carbonMassKg ?? 0)) / ((stateA.waterMassKg ?? 1) + (stateB.waterMassKg ?? 1));
    const concMineral = ((stateA.mineralMassKg ?? 0) + (stateB.mineralMassKg ?? 0)) / ((stateA.waterMassKg ?? 1) + (stateB.waterMassKg ?? 1));
    const deltaCarbon = deltaWater * concCarbon * 0.1;
    const deltaMineral = deltaWater * concMineral * 0.1;
    const entropyProduced = deltaEnthalpy * (1 / tB - 1 / tA);
    return {
        deltaWaterKg: deltaWater,
        deltaEnthalpyJoules: deltaEnthalpy,
        deltaCarbonKg: deltaCarbon,
        deltaMineralKg: deltaMineral,
        entropyProducedJPerK: Math.max(0, entropyProduced),
    };
}

// =============================================================================
// WEB OF LIFE - SPATIAL GEOMETRY & DGGS TOPOLOGY TYPES (SPRINTS 001 - 075)
// =============================================================================
import { THERMODYNAMIC_CONSTANTS as TC } from '../thermodynamics/constants.js';
export { TC as THERMODYNAMIC_CONSTANTS };
/**
 * Error hierarchy and codes for spatial validation.
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
    const cond = metrics.geometricConductance;
    const tempDiff = (stateA.temperatureKelvin ?? 293.15) - (stateB.temperatureKelvin ?? 293.15);
    const eddy = params.eddyDiffusivityHeat ?? 15.0;
    const deltaEnthalpy = eddy * tempDiff * metrics.atmosphericContactAreaM2 * dt * 0.001;
    const waterDiff = (stateA.massWaterKg ?? stateA.waterMassKg ?? stateA.waterKg ?? 0) - (stateB.massWaterKg ?? stateB.waterMassKg ?? stateB.waterKg ?? 0);
    const kPorous = params.kSatPorous ?? 1e-4;
    const deltaWater = kPorous * waterDiff * metrics.subterraneanContactAreaM2 * dt * 0.001;
    const carbonDiff = (stateA.massCarbonKg ?? stateA.carbonMassKg ?? stateA.carbonKg ?? 0) - (stateB.massCarbonKg ?? stateB.carbonMassKg ?? stateB.carbonKg ?? 0);
    const deltaCarbon = 1e-5 * carbonDiff * cond * dt;
    const mineralDiff = (stateA.massMineralsKg ?? stateA.mineralMassKg ?? stateA.mineralsKg ?? stateA.mineralKg ?? 0) - (stateB.massMineralsKg ?? stateB.mineralMassKg ?? stateB.mineralsKg ?? stateB.mineralKg ?? 0);
    const deltaMineral = 1e-6 * mineralDiff * cond * dt;
    const tA = Math.max(1e-3, stateA.temperatureKelvin ?? 293.15);
    const tB = Math.max(1e-3, stateB.temperatureKelvin ?? 293.15);
    const entropyProduced = Math.max(0, Math.abs(deltaEnthalpy) * Math.abs(1 / tB - 1 / tA));
    return {
        deltaWaterKg: deltaWater,
        deltaEnthalpyJoules: deltaEnthalpy,
        deltaCarbonKg: deltaCarbon,
        deltaMineralKg: deltaMineral,
        entropyProducedJPerK: entropyProduced,
    };
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
export const SPATIAL_CONSTANTS = {
    HEX_COORDINATION_NUMBER: 6,
    PENTAGON_COORDINATION_NUMBER: 5,
    HEX_FACE_LENGTH_FACTOR: 1.000000,
    PENTAGON_FACE_LENGTH_FACTOR: 1.051462,
    CELL_AREA_FACTOR_HEX: 1.000000,
    CELL_AREA_FACTOR_PENTAGON: 0.852398,
    WATER_DIFFUSIVITY: 1.25e-3,
    CARBON_DIFFUSION: 2.10e-5,
    OXYGEN_DIFFUSION: 2.01e-5,
    MINERAL_DIFFUSION: 1.00e-5,
    THERMAL_CONDUCTIVITY: 0.58,
};

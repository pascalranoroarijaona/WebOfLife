// =============================================================================
// WEB OF LIFE - SPATIAL DGGS & THERMODYNAMIC TYPES
// Cumulative Retro-Compatibility Suite: Sprints 001 - 061
// =============================================================================
import { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';
export { THERMODYNAMIC_CONSTANTS };
/**
 * Canonical H3 Error Codes mapping validation failures.
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
/**
 * Exception raised when spatial inputs violate strict guard clauses.
 */
export class SpatialGuardClauseException extends Error {
    constructor(message) {
        super(message);
        this.name = 'SpatialGuardClauseException';
    }
}
/**
 * Channel indices for continuous thermodynamic tensor slices.
 */
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
export function createH3CellInterfaceMetrics(params) {
    if (params.originIndex === params.neighborIndex) {
        throw new Error('Self-interface is invalid');
    }
    if (params.sharedEdgeLengthMeters <= 0) {
        throw new Error('sharedEdgeLengthMeters must be strictly positive');
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
    const tA = stateA.temperatureKelvin ?? 290.0;
    const tB = stateB.temperatureKelvin ?? 290.0;
    const deltaT = tA - tB;
    const eddy = params.eddyDiffusivityHeat ?? 15.0;
    const heatFlux = deltaT * metrics.geometricConductance * eddy * dt * 100.0;
    const wA = stateA.waterMassKg ?? 0;
    const wB = stateB.waterMassKg ?? 0;
    const waterFlux = (wA - wB) * 1e-4 * metrics.geometricConductance * dt;
    const cA = stateA.carbonMassKg ?? 0;
    const cB = stateB.carbonMassKg ?? 0;
    const carbonFlux = (cA - cB) * 1e-4 * metrics.geometricConductance * dt;
    const mA = stateA.mineralMassKg ?? 0;
    const mB = stateB.mineralMassKg ?? 0;
    const mineralFlux = (mA - mB) * 1e-4 * metrics.geometricConductance * dt;
    const entropyGen = deltaT !== 0
        ? Math.abs(heatFlux * (1.0 / Math.min(tA, tB) - 1.0 / Math.max(tA, tB)))
        : 0.0;
    return {
        deltaWaterKg: -waterFlux,
        deltaEnthalpyJoules: -heatFlux,
        deltaCarbonKg: -carbonFlux,
        deltaMineralKg: -mineralFlux,
        entropyProducedJPerK: entropyGen,
    };
}

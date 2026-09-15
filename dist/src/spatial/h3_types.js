// =============================================================================
// WEB OF LIFE - SPATIAL DGGS & ADJACENCY TYPE DEFINITIONS
// Retro-Compatible Unified Specifications (Sprints 002 - 079)
// =============================================================================
import { THERMODYNAMIC_CONSTANTS as TC } from '../thermodynamics/constants.js';
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
export const THERMODYNAMIC_CONSTANTS = TC;
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
    const tempA = stateA.temperatureKelvin ?? 290;
    const tempB = stateB.temperatureKelvin ?? 290;
    const tempGrad = (tempA - tempB) / metrics.centroidDistanceMeters;
    const heatFluxWatts = kHeat * tempGrad * metrics.atmosphericContactAreaM2;
    const deltaEnthalpyJoules = heatFluxWatts * dtSeconds;
    const waterA = stateA.waterMassKg ?? 0;
    const waterB = stateB.waterMassKg ?? 0;
    const waterDiff = waterA - waterB;
    const deltaWaterKg = (waterDiff / metrics.centroidDistanceMeters) * (params.kSatPorous ?? 1e-4) * metrics.subterraneanContactAreaM2 * dtSeconds;
    const carbonA = stateA.carbonMassKg ?? 0;
    const carbonB = stateB.carbonMassKg ?? 0;
    const deltaCarbonKg = ((carbonA - carbonB) / metrics.centroidDistanceMeters) * 1e-5 * metrics.atmosphericContactAreaM2 * dtSeconds;
    const mineralA = stateA.mineralMassKg ?? 0;
    const mineralB = stateB.mineralMassKg ?? 0;
    const deltaMineralKg = ((mineralA - mineralB) / metrics.centroidDistanceMeters) * 1e-5 * metrics.subterraneanContactAreaM2 * dtSeconds;
    const entropyProduced = Math.max(0, deltaEnthalpyJoules * (1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB)));
    return {
        deltaWaterKg: -deltaWaterKg,
        deltaEnthalpyJoules: -deltaEnthalpyJoules,
        deltaCarbonKg: -deltaCarbonKg,
        deltaMineralKg: -deltaMineralKg,
        entropyProducedJPerK: entropyProduced,
    };
}
export const SPATIAL_CONSTANTS = {
    DEFAULT_ANGULAR_EPSILON: 1e-9,
};
export class AdjacencyTopologicalError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AdjacencyTopologicalError';
        Object.setPrototypeOf(this, AdjacencyTopologicalError.prototype);
    }
}
export class TopologicalPreconditionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TopologicalPreconditionError';
        Object.setPrototypeOf(this, TopologicalPreconditionError.prototype);
    }
}

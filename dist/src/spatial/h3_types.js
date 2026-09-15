/**
 * =============================================================================
 * WEB OF LIFE - SPATIAL H3 TOPOLOGY, THERMODYNAMIC TYPES & INTERFACES
 * Cumulative Retro-Compatibility Specification (Sprints 002 - 083)
 * =============================================================================
 */
export const ALL_H3_DIRECTIONS = Object.freeze([1, 2, 3, 4, 5, 6]);
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
    constructor(message = 'Spatial guard clause exception') {
        super(message);
        this.name = 'SpatialGuardClauseException';
        Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
    }
}
export var CellTopologyType;
(function (CellTopologyType) {
    CellTopologyType["PENTAGON"] = "PENTAGON";
    CellTopologyType["HEXAGON"] = "HEXAGON";
})(CellTopologyType || (CellTopologyType = {}));
export function validatePentagonTopology(topology) {
    if (!topology || !Array.isArray(topology.presentDirections)) {
        return false;
    }
    if (topology.presentDirections.length !== 5) {
        return false;
    }
    const directionSet = new Set(topology.presentDirections);
    if (directionSet.size !== 5) {
        return false;
    }
    if (directionSet.has(topology.omittedDirection)) {
        return false;
    }
    return ALL_H3_DIRECTIONS.every((dir) => dir === topology.omittedDirection || directionSet.has(dir));
}
export function createPentagonTopology(omittedDirection) {
    if (!ALL_H3_DIRECTIONS.includes(omittedDirection)) {
        throw new Error(`Invalid omitted direction: ${omittedDirection}. Must be an H3Direction in 1..6.`);
    }
    const presentDirections = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
    return Object.freeze({
        presentDirections: Object.freeze(presentDirections),
        omittedDirection,
    });
}
// -----------------------------------------------------------------------------
// THERMODYNAMIC CHANNELS & CONSTANTS (SPRINTS 042 - 045)
// -----------------------------------------------------------------------------
export var ThermodynamicChannel;
(function (ThermodynamicChannel) {
    ThermodynamicChannel[ThermodynamicChannel["TEMPERATURE_KELVIN"] = 0] = "TEMPERATURE_KELVIN";
    ThermodynamicChannel[ThermodynamicChannel["SENSIBLE_HEAT_JOULES"] = 1] = "SENSIBLE_HEAT_JOULES";
    ThermodynamicChannel[ThermodynamicChannel["WATER_MASS_KG"] = 2] = "WATER_MASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["SOIL_ORGANIC_CARBON_KG"] = 3] = "SOIL_ORGANIC_CARBON_KG";
    ThermodynamicChannel[ThermodynamicChannel["VEGETATION_BIOMASS_KG"] = 4] = "VEGETATION_BIOMASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["ATMOSPHERIC_CO2_KG"] = 5] = "ATMOSPHERIC_CO2_KG";
    ThermodynamicChannel[ThermodynamicChannel["MINERAL_NITROGEN_KG"] = 6] = "MINERAL_NITROGEN_KG";
    ThermodynamicChannel[ThermodynamicChannel["ALBEDO"] = 7] = "ALBEDO";
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
        REGOLITH: 0.0,
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
    return {
        ...params,
        geometricConductance: params.sharedEdgeLengthMeters / params.centroidDistanceMeters,
    };
}
export function createReciprocalInterfaceMetrics(m) {
    return {
        ...m,
        originIndex: m.neighborIndex,
        neighborIndex: m.originIndex,
        normalVector: [-m.normalVector[0], -m.normalVector[1], -m.normalVector[2]],
        topographicSlope: -m.topographicSlope,
        bearingRadians: (m.bearingRadians + Math.PI) % (2 * Math.PI),
    };
}
export function computeInterfaceFlux(stateA, stateB, metrics, dt, params) {
    const dWater = ((stateA.waterMassKg ?? 0) - (stateB.waterMassKg ?? 0)) * 0.001 * dt;
    const dEnthalpy = ((stateA.enthalpyJoules ?? 0) - (stateB.enthalpyJoules ?? 0)) * 0.001 * dt;
    const dCarbon = ((stateA.carbonMassKg ?? 0) - (stateB.carbonMassKg ?? 0)) * 0.001 * dt;
    const dMineral = ((stateA.mineralMassKg ?? 0) - (stateB.mineralMassKg ?? 0)) * 0.001 * dt;
    const tA = stateA.temperatureKelvin ?? 295;
    const tB = stateB.temperatureKelvin ?? 288;
    const heatCond = (params.eddyDiffusivityHeat ?? 10) * ((tA - tB) / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;
    const entropy = Math.max(0, Math.abs(heatCond) * Math.abs(1 / Math.max(1, tB) - 1 / Math.max(1, tA)));
    return {
        deltaWaterKg: -dWater,
        deltaEnthalpyJoules: -dEnthalpy,
        deltaCarbonKg: -dCarbon,
        deltaMineralKg: -dMineral,
        entropyProducedJPerK: entropy,
    };
}

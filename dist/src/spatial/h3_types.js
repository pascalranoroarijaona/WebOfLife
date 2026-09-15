/**
 * Web of Life - H3 Types and Thermodynamic State Definitions
 * Comprehensive Multi-Sprint Unified Interface (Sprints 002 - 087)
 */
// =============================================================================
// SPRINT 087 ICOSAHEDRAL BASE CELL DIRECTIONS & DEFECT TYPINGS
// =============================================================================
export var Direction;
(function (Direction) {
    Direction[Direction["CENTER"] = 0] = "CENTER";
    Direction[Direction["K_AXES"] = 1] = "K_AXES";
    Direction[Direction["J_AXES"] = 2] = "J_AXES";
    Direction[Direction["JK_AXES"] = 3] = "JK_AXES";
    Direction[Direction["I_AXES"] = 4] = "I_AXES";
    Direction[Direction["IK_AXES"] = 5] = "IK_AXES";
    Direction[Direction["IJ_AXES"] = 6] = "IJ_AXES";
    Direction[Direction["INVALID"] = 7] = "INVALID";
})(Direction || (Direction = {}));
// =============================================================================
// SPATIAL ERROR CODES & EXCEPTIONS
// =============================================================================
export var H3ErrorCode;
(function (H3ErrorCode) {
    H3ErrorCode["SUCCESS"] = "H3_SUCCESS";
    H3ErrorCode["INVALID_LENGTH"] = "H3_ERR_INVALID_LENGTH";
    H3ErrorCode["INVALID_CHARACTER"] = "H3_ERR_INVALID_CHARACTER";
    H3ErrorCode["INVALID_RESOLUTION"] = "H3_ERR_INVALID_RESOLUTION";
    H3ErrorCode["INVALID_BASE_CELL"] = "H3_ERR_INVALID_BASE_CELL";
    H3ErrorCode["NULL_INDEX"] = "H3_ERR_NULL_INDEX";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_NULL"] = 1] = "ERR_H3_INVALID_NULL";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_LENGTH"] = 2] = "ERR_H3_INVALID_LENGTH";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_CHARACTERS"] = 3] = "ERR_H3_INVALID_CHARACTERS";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_RESOLUTION"] = 4] = "ERR_H3_INVALID_RESOLUTION";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_BASE_CELL"] = 5] = "ERR_H3_INVALID_BASE_CELL";
    H3ErrorCode[H3ErrorCode["ERR_H3_OUT_OF_RANGE"] = 6] = "ERR_H3_OUT_OF_RANGE";
})(H3ErrorCode || (H3ErrorCode = {}));
export class SpatialGuardClauseException extends Error {
    constructor(message) {
        super(`[SpatialGuardClauseException] ${message}`);
        this.name = 'SpatialGuardClauseException';
        Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
    }
}
export class InvalidH3ModeError extends Error {
    constructor(message = 'Invalid H3 mode') {
        super(message);
        this.name = 'InvalidH3ModeError';
    }
}
export class InvalidH3BaseCellError extends Error {
    constructor(message = 'Invalid H3 base cell') {
        super(message);
        this.name = 'InvalidH3BaseCellError';
    }
}
export class InvalidH3PaddingError extends Error {
    constructor(message = 'Invalid H3 padding digits') {
        super(message);
        this.name = 'InvalidH3PaddingError';
    }
}
export const ALL_H3_DIRECTIONS = Object.freeze([1, 2, 3, 4, 5, 6]);
export function createPentagonTopology(omittedDirection) {
    const presentDirections = ALL_H3_DIRECTIONS.filter(d => d !== omittedDirection);
    return {
        presentDirections,
        omittedDirection,
    };
}
export function validatePentagonTopology(topology) {
    if (!topology || !Array.isArray(topology.presentDirections))
        return false;
    if (topology.presentDirections.length !== 5)
        return false;
    if (topology.presentDirections.includes(topology.omittedDirection))
        return false;
    const set = new Set(topology.presentDirections);
    if (set.size !== 5)
        return false;
    for (const d of topology.presentDirections) {
        if (!ALL_H3_DIRECTIONS.includes(d))
            return false;
    }
    return ALL_H3_DIRECTIONS.includes(topology.omittedDirection);
}
export const H3DirectionBitmask = {
    NONE: 0,
    DIRECTION_0: 1 << 0,
    DIRECTION_1: 1 << 1,
    DIRECTION_2: 1 << 2,
    DIRECTION_3: 1 << 3,
    DIRECTION_4: 1 << 4,
    DIRECTION_5: 1 << 5,
    ALL: 63,
    BY_INDEX: [1 << 0, 1 << 1, 1 << 2, 1 << 3, 1 << 4, 1 << 5],
    hasDirection(mask, dir) {
        return (mask & (1 << dir)) !== 0;
    },
    setDirection(mask, dir) {
        return mask | (1 << dir);
    },
    clearDirection(mask, dir) {
        return mask & ~(1 << dir);
    },
    oppositeDirection(dir) {
        return ((dir + 3) % 6);
    },
    invertMask(mask) {
        let result = 0;
        for (let d = 0; d < 6; d++) {
            if ((mask & (1 << d)) !== 0) {
                result |= (1 << ((d + 3) % 6));
            }
        }
        return result;
    }
};
export class DirectionalFluxOperator {
    static isChannelPermeable(srcMask, tgtMask, dir) {
        const opp = H3DirectionBitmask.oppositeDirection(dir);
        return H3DirectionBitmask.hasDirection(srcMask, dir) && H3DirectionBitmask.hasDirection(tgtMask, opp);
    }
    static computeEdgeTransfer(stateI, stateJ, srcMask, tgtMask, dir, velocity, _diffusivity, _conductivity, geometry, dt) {
        if (!this.isChannelPermeable(srcMask, tgtMask, dir)) {
            return {
                dWaterKg: 0,
                dCarbonKg: 0,
                dMineralsKg: 0,
                dOxygenKg: 0,
                dEnergyJoules: 0
            };
        }
        const area = geometry.edgeLengthM * geometry.layerHeightM;
        const volFlow = velocity * area * dt;
        const frac = Math.min(0.2, volFlow / (stateI.volumeM3 || 100));
        return {
            dWaterKg: (stateI.waterKg ?? 0) * frac,
            dCarbonKg: (stateI.carbonKg ?? 0) * frac,
            dMineralsKg: (stateI.mineralsKg ?? 0) * frac,
            dOxygenKg: (stateI.oxygenKg ?? 0) * frac,
            dEnergyJoules: (stateI.internalEnergyJoules ?? 0) * frac
        };
    }
}
export var CellTopologyType;
(function (CellTopologyType) {
    CellTopologyType["PENTAGON"] = "PENTAGON";
    CellTopologyType["HEXAGON"] = "HEXAGON";
})(CellTopologyType || (CellTopologyType = {}));
export function createH3CellInterfaceMetrics(params) {
    if (params.originIndex === params.neighborIndex) {
        throw new Error('Self-interface is invalid');
    }
    if (params.sharedEdgeLengthMeters <= 0) {
        throw new Error('sharedEdgeLengthMeters must be strictly positive');
    }
    const geometricConductance = params.geometricConductance ?? (params.sharedEdgeLengthMeters / params.centroidDistanceMeters);
    return {
        ...params,
        geometricConductance
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
        geometricConductance: metrics.geometricConductance
    };
}
export function computeInterfaceFlux(stateA, stateB, metrics, dt, params) {
    const gradT = (stateA.temperatureKelvin - stateB.temperatureKelvin) / metrics.centroidDistanceMeters;
    const eddyK = params.eddyDiffusivityHeat ?? 15.0;
    const dEnthalpy = eddyK * gradT * metrics.atmosphericContactAreaM2 * dt;
    const gradH = ((stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0)) / metrics.centroidDistanceMeters + metrics.topographicSlope;
    const kSat = params.kSatPorous ?? 1e-4;
    const dWater = kSat * gradH * metrics.subterraneanContactAreaM2 * dt * 1000.0;
    const dCarbon = dWater * 0.005;
    const dMineral = dWater * 0.0015;
    const invTA = 1.0 / (stateA.temperatureKelvin ?? 295.15);
    const invTB = 1.0 / (stateB.temperatureKelvin ?? 288.15);
    const entropy = Math.abs(dEnthalpy * (invTB - invTA));
    return {
        deltaWaterKg: -dWater,
        deltaEnthalpyJoules: -dEnthalpy,
        deltaCarbonKg: -dCarbon,
        deltaMineralKg: -dMineral,
        entropyProducedJPerK: entropy
    };
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
    DEFAULT_REGOLITH_MASS_KG: 10000.0,
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

/**
 * Web of Life - Spatial Partitioning Engine
 * Core H3 Discrete Global Grid System & Thermodynamic Type Definitions
 * Sprints 001 - 088 Unified Specification
 */
export const H3_MIN_DIRECTION_DIGIT = 0;
export const H3_MAX_DIRECTION_DIGIT = 6;
// =============================================================================
// ERROR CODES & EXCEPTIONS
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
export class InvalidH3ModeError extends Error {
    constructor(message = 'Invalid H3 cell mode') {
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
    constructor(message = 'Invalid H3 padding bits') {
        super(message);
        this.name = 'InvalidH3PaddingError';
    }
}
export var CellTopologyType;
(function (CellTopologyType) {
    CellTopologyType["PENTAGON"] = "PENTAGON";
    CellTopologyType["HEXAGON"] = "HEXAGON";
})(CellTopologyType || (CellTopologyType = {}));
// =============================================================================
// SPRINT 045: STATE TENSOR OVERRIDES & CHANNELS
// =============================================================================
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
    const gradT = ((stateA.temperatureKelvin ?? 290) - (stateB.temperatureKelvin ?? 290)) / metrics.centroidDistanceMeters;
    const kHeat = params.eddyDiffusivityHeat ?? 15.0;
    const areaAtm = metrics.atmosphericContactAreaM2;
    const qHeatJoules = kHeat * gradT * areaAtm * dt;
    const gradHead = (((stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0)) / metrics.centroidDistanceMeters) + metrics.topographicSlope;
    const kWater = params.kSatPorous ?? 1e-4;
    const areaSub = metrics.subterraneanContactAreaM2;
    const qWaterKg = kWater * gradHead * areaSub * dt * 1000.0;
    const waterA = Math.max(1, stateA.waterMassKg ?? 10000);
    const carbonFrac = (stateA.carbonMassKg ?? 0) / waterA;
    const mineralFrac = (stateA.mineralMassKg ?? 0) / waterA;
    const deltaWater = qWaterKg;
    const deltaCarbon = qWaterKg * carbonFrac;
    const deltaMineral = qWaterKg * mineralFrac;
    const deltaEnthalpy = qHeatJoules + qWaterKg * 4184.0 * (stateA.temperatureKelvin ?? 290);
    const tWarm = Math.max(stateA.temperatureKelvin ?? 290, stateB.temperatureKelvin ?? 290);
    const tCold = Math.min(stateA.temperatureKelvin ?? 290, stateB.temperatureKelvin ?? 290);
    const deltaT = tWarm - tCold;
    const entropyProducedJPerK = Math.abs(qHeatJoules) * (deltaT / (tWarm * tCold + 1e-6));
    return {
        deltaWaterKg: -deltaWater,
        deltaEnthalpyJoules: -deltaEnthalpy,
        deltaCarbonKg: -deltaCarbon,
        deltaMineralKg: -deltaMineral,
        entropyProducedJPerK,
    };
}
export const ALL_H3_DIRECTIONS = [1, 2, 3, 4, 5, 6];
export function createPentagonTopology(omittedDirection) {
    const presentDirections = [1, 2, 3, 4, 5, 6].filter((d) => d !== omittedDirection);
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
    const set = new Set(topology.presentDirections);
    if (set.size !== 5)
        return false;
    if (set.has(topology.omittedDirection))
        return false;
    for (const d of topology.presentDirections) {
        if (d < 1 || d > 6)
            return false;
    }
    return true;
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
        let res = 0;
        for (let i = 0; i < 6; i++) {
            if ((mask & (1 << i)) !== 0) {
                res |= 1 << ((i + 3) % 6);
            }
        }
        return res;
    },
};
export class DirectionalFluxOperator {
    static isChannelPermeable(srcMask, tgtMask, direction) {
        const opp = (direction + 3) % 6;
        return H3DirectionBitmask.hasDirection(srcMask, direction) && H3DirectionBitmask.hasDirection(tgtMask, opp);
    }
    static computeEdgeTransfer(src, tgt, srcMask, tgtMask, direction, velocityMs, diffCoeff, thermalCond, geometry, dt) {
        if (!this.isChannelPermeable(srcMask, tgtMask, direction)) {
            return {
                dWaterKg: 0,
                dCarbonKg: 0,
                dMineralsKg: 0,
                dOxygenKg: 0,
                dEnergyJoules: 0,
            };
        }
        const area = geometry.edgeLengthM * geometry.layerHeightM;
        const flowVol = velocityMs * area * dt;
        const frac = Math.min(0.2, flowVol / Math.max(1, src.volumeM3 ?? 100));
        return {
            dWaterKg: (src.waterKg ?? 0) * frac,
            dCarbonKg: (src.carbonKg ?? 0) * frac,
            dMineralsKg: (src.mineralsKg ?? 0) * frac,
            dOxygenKg: (src.oxygenKg ?? 0) * frac,
            dEnergyJoules: (src.internalEnergyJoules ?? 0) * frac,
        };
    }
}
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

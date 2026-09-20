// =============================================================================
// WEB OF LIFE - SPATIAL H3 HIERARCHY, APERTURE & THERMODYNAMIC TYPE SYSTEM
// Retro-Compatible Unified Specification (Sprints 002 - 093)
// =============================================================================
export const H3_CELL_MODE = 1;
export const H3_MIN_RESOLUTION = 0;
export const H3_MAX_RESOLUTION = 15;
export const DIRECTION_CENTER = 0;
export const PENTAGON_BASE_CELLS = new Set([
    4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117
]);
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
export var ApertureClass;
(function (ApertureClass) {
    ApertureClass["CLASS_II"] = "CLASS_II";
    ApertureClass["CLASS_III"] = "CLASS_III";
})(ApertureClass || (ApertureClass = {}));
export class Vector3D {
    0;
    1;
    2;
    x;
    y;
    z;
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this[0] = x;
        this[1] = y;
        this[2] = z;
    }
}
export function createVec3D(x = 0, y = 0, z = 0) {
    return new Vector3D(x, y, z);
}
export var CellTopologyType;
(function (CellTopologyType) {
    CellTopologyType["PENTAGON"] = "PENTAGON";
    CellTopologyType["HEXAGON"] = "HEXAGON";
})(CellTopologyType || (CellTopologyType = {}));
export const ALL_H3_DIRECTIONS = [1, 2, 3, 4, 5, 6];
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
    const union = new Set([...topology.presentDirections, topology.omittedDirection]);
    return union.size === 6 && ALL_H3_DIRECTIONS.every((d) => union.has(d));
}
export function createPentagonTopology(omittedDirection) {
    const presentDirections = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
    return { presentDirections, omittedDirection };
}
export const H3DirectionBitmask = {
    DIRECTION_0: 1 << 0,
    DIRECTION_1: 1 << 1,
    DIRECTION_2: 1 << 2,
    DIRECTION_3: 1 << 3,
    DIRECTION_4: 1 << 4,
    DIRECTION_5: 1 << 5,
    NONE: 0,
    ALL: 0x3f,
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
        for (let d = 0; d < 6; d++) {
            if ((mask & (1 << d)) !== 0) {
                res |= 1 << ((d + 3) % 6);
            }
        }
        return res;
    },
};
export class DirectionalFluxOperator {
    static isChannelPermeable(srcMask, tgtMask, dir) {
        const opp = H3DirectionBitmask.oppositeDirection(dir);
        return H3DirectionBitmask.hasDirection(srcMask, dir) && H3DirectionBitmask.hasDirection(tgtMask, opp);
    }
    static computeEdgeTransfer(sI, sJ, srcMask, tgtMask, dir, velocity, diffCoeff, thermCond, geom, dt) {
        if (!this.isChannelPermeable(srcMask, tgtMask, dir)) {
            return { dWaterKg: 0, dCarbonKg: 0, dMineralsKg: 0, dOxygenKg: 0, dEnergyJoules: 0 };
        }
        const area = geom.edgeLengthM * geom.layerHeightM;
        const volFlow = velocity * area * dt;
        const frac = Math.min(0.2, volFlow / (sI.volumeM3 || 100));
        return {
            dWaterKg: sI.waterKg * frac,
            dCarbonKg: sI.carbonKg * frac,
            dMineralsKg: sI.mineralsKg * frac,
            dOxygenKg: sI.oxygenKg * frac,
            dEnergyJoules: sI.internalEnergyJoules * frac,
        };
    }
}
export class InvalidH3ModeError extends Error {
    constructor(mode) {
        super(`Invalid H3 mode: ${mode}`);
        this.name = 'InvalidH3ModeError';
    }
}
export class InvalidH3BaseCellError extends Error {
    constructor(baseCell) {
        super(`Invalid H3 base cell: ${baseCell}`);
        this.name = 'InvalidH3BaseCellError';
    }
}
export class InvalidH3PaddingError extends Error {
    constructor() {
        super(`Invalid H3 padding bits`);
        this.name = 'InvalidH3PaddingError';
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
export function computeInterfaceFlux(sA, sB, metrics, dt, _params) {
    const cond = metrics.geometricConductance;
    const tempA = sA.temperatureKelvin ?? 290.0;
    const tempB = sB.temperatureKelvin ?? 290.0;
    const dTemp = tempA - tempB;
    const heatFluxJ = cond * dTemp * 100.0 * dt;
    const dWaterKg = cond * ((sA.waterMassKg ?? 0) - (sB.waterMassKg ?? 0)) * 0.001 * dt;
    const dCarbonKg = cond * ((sA.carbonMassKg ?? 0) - (sB.carbonMassKg ?? 0)) * 0.001 * dt;
    const dMineralKg = cond * ((sA.mineralMassKg ?? 0) - (sB.mineralMassKg ?? 0)) * 0.001 * dt;
    const entropyProd = heatFluxJ > 0 ? heatFluxJ * (1 / tempB - 1 / tempA) : -heatFluxJ * (1 / tempA - 1 / tempB);
    return {
        deltaWaterKg: -dWaterKg,
        deltaEnthalpyJoules: -heatFluxJ,
        deltaCarbonKg: -dCarbonKg,
        deltaMineralKg: -dMineralKg,
        entropyProducedJPerK: Math.max(0, entropyProd),
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
export const THERMODYNAMIC_CONSTANTS = {
    MIN_TEMPERATURE_KELVIN: 2.7315,
    DEFAULT_REGOLITH_MASS_KG: 50000.0,
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

/**
 * Web of Life - H3 Discrete Global Grid System (DGGS) Type Definitions
 * Retro-Compatible Multi-Sprint Unified Implementation (Sprints 001 - 094)
 */
export const MIN_H3_RES = 0;
export const MAX_H3_RES = 15;
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_MIN_RESOLUTION = 0;
export const H3_MAX_RESOLUTION = 15;
export const APERTURE_7_ROTATION_RAD = Math.asin(Math.sqrt(3) / (2 * Math.sqrt(7)));
export const APERTURE_7_ROTATION_DEG = (APERTURE_7_ROTATION_RAD * 180) / Math.PI;
export var ApertureClass;
(function (ApertureClass) {
    ApertureClass["CLASS_II"] = "CLASS_II";
    ApertureClass["CLASS_III"] = "CLASS_III";
    ApertureClass["ClassII"] = "ClassII";
    ApertureClass["ClassIII"] = "ClassIII";
})(ApertureClass || (ApertureClass = {}));
export class Vector3D {
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
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    [Symbol.iterator]() {
        return [this.x, this.y, this.z][Symbol.iterator]();
    }
}
export function createVec3D(x = 0, y = 0, z = 0) {
    return new Vector3D(x, y, z);
}
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
export const H3_CELL_MODE = 1;
export const DIRECTION_CENTER = 0;
export const PENTAGON_BASE_CELLS_ARRAY = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117];
export const PENTAGON_BASE_CELL_SET = new Set(PENTAGON_BASE_CELLS_ARRAY);
export const PENTAGON_BASE_CELLS = Object.assign(new Set(PENTAGON_BASE_CELLS_ARRAY), PENTAGON_BASE_CELLS_ARRAY);
export const TOTAL_BASE_CELLS = 122;
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
        VEGETATION_BIOMASS: -17.50e6,
        ATMOSPHERIC_CO2: -8.94e6,
        MINERAL_NITROGEN: -2.85e6,
    },
};
export const ALL_H3_DIRECTIONS = [1, 2, 3, 4, 5, 6];
export function createPentagonTopology(omittedDirection) {
    const present = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
    return { presentDirections: present, omittedDirection };
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
        let inv = 0;
        for (let d = 0; d < 6; d++) {
            if ((mask & (1 << d)) !== 0) {
                inv |= 1 << ((d + 3) % 6);
            }
        }
        return inv;
    },
};
export class DirectionalFluxOperator {
    static isChannelPermeable(srcMask, tgtMask, dir) {
        const opp = (dir + 3) % 6;
        return (srcMask & (1 << dir)) !== 0 && (tgtMask & (1 << opp)) !== 0;
    }
    static computeEdgeTransfer(stateI, _stateJ, srcMask, tgtMask, dir, velocity, _diffCoeff, _cond, geom, dt) {
        if (!DirectionalFluxOperator.isChannelPermeable(srcMask, tgtMask, dir)) {
            return { dWaterKg: 0, dCarbonKg: 0, dMineralsKg: 0, dOxygenKg: 0, dEnergyJoules: 0 };
        }
        const area = geom.edgeLengthM * geom.layerHeightM;
        const volFlow = Math.abs(velocity) * area * dt;
        const frac = Math.min(0.1, volFlow / Math.max(stateI.volumeM3, 1.0));
        return {
            dWaterKg: stateI.waterKg * frac,
            dCarbonKg: stateI.carbonKg * frac,
            dMineralsKg: stateI.mineralsKg * frac,
            dOxygenKg: stateI.oxygenKg * frac,
            dEnergyJoules: stateI.internalEnergyJoules * frac,
        };
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
    constructor(message = 'Invalid H3 padding') {
        super(message);
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
    return {
        ...params,
        geometricConductance: params.sharedEdgeLengthMeters / params.centroidDistanceMeters,
    };
}
export function createReciprocalInterfaceMetrics(metrics) {
    return {
        ...metrics,
        originIndex: metrics.neighborIndex,
        neighborIndex: metrics.originIndex,
        normalVector: [-metrics.normalVector[0], -metrics.normalVector[1], -metrics.normalVector[2]],
        topographicSlope: -metrics.topographicSlope,
        bearingRadians: (metrics.bearingRadians + Math.PI) % (2 * Math.PI),
    };
}
export function computeInterfaceFlux(stateA, stateB, _metrics, dt, _params) {
    const dW = (stateA.waterMassKg - stateB.waterMassKg) * 0.001 * dt;
    const dC = (stateA.carbonMassKg - stateB.carbonMassKg) * 0.001 * dt;
    const dM = (stateA.mineralMassKg - stateB.mineralMassKg) * 0.001 * dt;
    const dE = (stateA.enthalpyJoules - stateB.enthalpyJoules) * 0.001 * dt;
    const tempA = stateA.temperatureKelvin;
    const tempB = stateB.temperatureKelvin;
    const entropy = Math.max(0, Math.abs(dE) * Math.abs(1 / tempB - 1 / tempA));
    return {
        deltaWaterKg: -dW,
        deltaCarbonKg: -dC,
        deltaMineralKg: -dM,
        deltaEnthalpyJoules: -dE,
        entropyProducedJPerK: entropy,
    };
}

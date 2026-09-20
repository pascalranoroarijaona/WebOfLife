// =============================================================================
// WEB OF LIFE - SPATIAL DGGS H3 TYPES, ENUMS & INTERFACES
// Retro-Compatible Unified Multi-Sprint Specification (Sprints 001 - 090)
// =============================================================================
/** Mode 1 represents standard hexagonal/pentagonal discrete cell indexes */
export const H3_CELL_MODE = 1;
/** Mode 2 represents directed edge indexes */
export const H3_DIRECTED_EDGE_MODE = 2;
export const H3_MIN_RESOLUTION = 0;
export const H3_MAX_RESOLUTION = 15;
/** Directional digits along aperture-7 hierarchy */
export const DIRECTION_CENTER = 0;
export const DIRECTION_K_AXES = 1;
export const DIRECTION_J_AXES = 2;
export const DIRECTION_JK_AXES = 3;
export const DIRECTION_I_AXES = 4;
export const DIRECTION_IK_AXES = 5;
export const DIRECTION_IJ_AXES = 6;
export const DIRECTION_INVALID = 7;
/**
 * 12 Canonical icosahedral pentagonal base cell IDs in H3 DGGS.
 * Encapsulated as an array supporting both .length, .size, and .has().
 */
const pentagonBaseCellArray = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117];
const pentagonBaseCellSet = new Set(pentagonBaseCellArray);
pentagonBaseCellArray.has = (val) => pentagonBaseCellSet.has(val);
pentagonBaseCellArray.size = 12;
export const PENTAGON_BASE_CELLS = pentagonBaseCellArray;
export const PENTAGON_BASE_CELL_SET = pentagonBaseCellSet;
// =============================================================================
// 3D VECTOR & COORDINATE TYPES
// =============================================================================
export class Vector3D extends Array {
    constructor(x = 0, y = 0, z = 0) {
        super(x, y, z);
        Object.setPrototypeOf(this, Vector3D.prototype);
    }
    get x() {
        return this[0] ?? 0;
    }
    set x(v) {
        this[0] = v;
    }
    get y() {
        return this[1] ?? 0;
    }
    set y(v) {
        this[1] = v;
    }
    get z() {
        return this[2] ?? 0;
    }
    set z(v) {
        this[2] = v;
    }
    magnitude() {
        return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
    }
}
export function createVec3D(x = 0, y = 0, z = 0) {
    return new Vector3D(x, y, z);
}
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
    constructor(message = 'Invalid H3 padding digits') {
        super(message);
        this.name = 'InvalidH3PaddingError';
    }
}
// =============================================================================
// THERMODYNAMIC STOCKS & OVERRIDES CONTRACTS
// =============================================================================
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
export const ALL_H3_DIRECTIONS = Object.freeze([1, 2, 3, 4, 5, 6]);
export function validatePentagonTopology(topology) {
    if (!topology || !Array.isArray(topology.presentDirections))
        return false;
    if (topology.presentDirections.length !== 5)
        return false;
    if (topology.presentDirections.includes(topology.omittedDirection))
        return false;
    const validDirs = new Set(ALL_H3_DIRECTIONS);
    if (!validDirs.has(topology.omittedDirection))
        return false;
    const presentSet = new Set(topology.presentDirections);
    if (presentSet.size !== 5)
        return false;
    for (const d of topology.presentDirections) {
        if (!validDirs.has(d))
            return false;
    }
    return true;
}
export function createPentagonTopology(omitted) {
    const present = ALL_H3_DIRECTIONS.filter((d) => d !== omitted);
    return {
        presentDirections: present,
        omittedDirection: omitted,
    };
}
export const H3DirectionBitmask = {
    DIRECTION_0: 1 << 0,
    DIRECTION_1: 1 << 1,
    DIRECTION_2: 1 << 2,
    DIRECTION_3: 1 << 3,
    DIRECTION_4: 1 << 4,
    DIRECTION_5: 1 << 5,
    NONE: 0,
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
        const opp = (dir + 3) % 6;
        return (srcMask & (1 << dir)) !== 0 && (tgtMask & (1 << opp)) !== 0;
    }
    static computeEdgeTransfer(stateI, stateJ, srcMask, tgtMask, dir, vel, _diff, _cond, geom, dt) {
        if (!this.isChannelPermeable(srcMask, tgtMask, dir)) {
            return { dWaterKg: 0, dCarbonKg: 0, dMineralsKg: 0, dOxygenKg: 0, dEnergyJoules: 0 };
        }
        const area = geom.edgeLengthM * geom.layerHeightM;
        const fluxRate = vel * area * dt;
        const donor = vel >= 0 ? stateI : stateJ;
        const frac = Math.min(0.2, Math.abs(fluxRate) / (donor.volumeM3 ?? 100));
        return {
            dWaterKg: (donor.waterKg ?? 0) * frac,
            dCarbonKg: (donor.carbonKg ?? 0) * frac,
            dMineralsKg: (donor.mineralsKg ?? 0) * frac,
            dOxygenKg: (donor.oxygenKg ?? 0) * frac,
            dEnergyJoules: (donor.internalEnergyJoules ?? 0) * frac,
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
    if (params.centroidDistanceMeters <= 0) {
        throw new Error('centroidDistanceMeters must be strictly positive');
    }
    const geometricConductance = params.geometricConductance ?? params.sharedEdgeLengthMeters / params.centroidDistanceMeters;
    return {
        ...params,
        geometricConductance,
    };
}
export function createReciprocalInterfaceMetrics(m) {
    return createH3CellInterfaceMetrics({
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
    });
}
export function computeInterfaceFlux(stateA, stateB, metrics, dt, params = {}) {
    const diffT = (stateA.temperatureKelvin ?? 295.15) - (stateB.temperatureKelvin ?? 295.15);
    const eddy = params.eddyDiffusivityHeat ?? 15.0;
    const qHeat = eddy * (diffT / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;
    const diffW = (stateA.waterMassKg ?? 100000) - (stateB.waterMassKg ?? 100000);
    const qWater = 0.001 * (diffW / metrics.centroidDistanceMeters) * metrics.subterraneanContactAreaM2 * dt;
    const diffC = (stateA.carbonMassKg ?? 500) - (stateB.carbonMassKg ?? 500);
    const qCarbon = 0.0001 * (diffC / metrics.centroidDistanceMeters) * metrics.subterraneanContactAreaM2 * dt;
    const diffM = (stateA.mineralMassKg ?? 150) - (stateB.mineralMassKg ?? 150);
    const qMineral = 0.0001 * (diffM / metrics.centroidDistanceMeters) * metrics.subterraneanContactAreaM2 * dt;
    const tA = Math.max(1, stateA.temperatureKelvin ?? 295.15);
    const tB = Math.max(1, stateB.temperatureKelvin ?? 295.15);
    const entropyProduced = Math.abs(qHeat) * Math.abs(1 / tB - 1 / tA);
    return {
        deltaWaterKg: -qWater,
        deltaEnthalpyJoules: -qHeat,
        deltaCarbonKg: -qCarbon,
        deltaMineralKg: -qMineral,
        entropyProducedJPerK: entropyProduced,
    };
}

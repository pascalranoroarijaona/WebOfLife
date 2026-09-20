// =============================================================================
// WEB OF LIFE - SPATIAL DGGS & THERMODYNAMIC TYPES (RETRO-COMPATIBLE ENGINE)
// Sprints 002 - 092 Unified Specification
// =============================================================================
export const H3_CELL_MODE = 1;
export const H3_MIN_RESOLUTION = 0;
export const H3_MAX_RESOLUTION = 15;
export const DIRECTION_CENTER = 0;
const PENTAGON_BASE_ARRAY = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117];
export const PENTAGON_BASE_CELLS = Object.assign(PENTAGON_BASE_ARRAY, {
    has(val) {
        return PENTAGON_BASE_ARRAY.includes(val);
    },
});
export const PENTAGON_BASE_CELL_SET = new Set(PENTAGON_BASE_CELLS);
export const TOTAL_BASE_CELLS = 122;
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
    constructor(message = 'H3 Index cannot be null, undefined, or empty.') {
        super(`[SpatialGuardClauseException] ${message}`);
        this.name = 'SpatialGuardClauseException';
        Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
    }
}
export class InvalidH3ModeError extends Error {
    constructor(message = 'Invalid H3 cell mode') {
        super(message);
        this.name = 'InvalidH3ModeError';
        Object.setPrototypeOf(this, InvalidH3ModeError.prototype);
    }
}
export class InvalidH3BaseCellError extends Error {
    constructor(message = 'Invalid H3 base cell') {
        super(message);
        this.name = 'InvalidH3BaseCellError';
        Object.setPrototypeOf(this, InvalidH3BaseCellError.prototype);
    }
}
export class InvalidH3PaddingError extends Error {
    constructor(message = 'Invalid H3 padding digits') {
        super(message);
        this.name = 'InvalidH3PaddingError';
        Object.setPrototypeOf(this, InvalidH3PaddingError.prototype);
    }
}
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
    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
        yield this.z;
    }
}
export function createVec3D(x = 0, y = 0, z = 0) {
    return new Vector3D(x, y, z);
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
    SPECIFIC_HEAT: {
        WATER: 4184.0,
        SOIL_ORGANIC_CARBON: 1800.0,
        VEGETATION_BIOMASS: 1900.0,
        ATMOSPHERIC_CO2: 846.0,
        MINERAL_NITROGEN: 1200.0,
        REGOLITH: 840.0,
    },
    SPECIFIC_ENTHALPY: {
        WATER: -15.87e6,
        SOIL_ORGANIC_CARBON: -32.79e6,
        VEGETATION_BIOMASS: -17.50e6,
        ATMOSPHERIC_CO2: -8.94e6,
        MINERAL_NITROGEN: -2.85e6,
    },
    MIN_TEMPERATURE_KELVIN: 2.7315,
    DEFAULT_REGOLITH_MASS_KG: 1e5,
};
export const ALL_H3_DIRECTIONS = [1, 2, 3, 4, 5, 6];
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
export function createPentagonTopology(omittedDirection) {
    const present = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
    return {
        presentDirections: present,
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
    const unique = new Set(topology.presentDirections);
    if (unique.size !== 5)
        return false;
    for (const d of topology.presentDirections) {
        if (d < 1 || d > 6)
            return false;
    }
    return topology.omittedDirection >= 1 && topology.omittedDirection <= 6;
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
    BY_INDEX: [1, 2, 4, 8, 16, 32],
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
export const DirectionalFluxOperator = {
    isChannelPermeable(srcMask, tgtMask, dir) {
        const opp = (dir + 3) % 6;
        return H3DirectionBitmask.hasDirection(srcMask, dir) && H3DirectionBitmask.hasDirection(tgtMask, opp);
    },
    computeEdgeTransfer(stateI, stateJ, srcMask, tgtMask, dir, vel, _diff, _cond, geom, dt) {
        if (!this.isChannelPermeable(srcMask, tgtMask, dir)) {
            return { dWaterKg: 0, dCarbonKg: 0, dMineralsKg: 0, dOxygenKg: 0, dEnergyJoules: 0 };
        }
        const area = (geom.edgeLengthM ?? 1000) * (geom.layerHeightM ?? 10);
        const frac = Math.min(0.2, (vel * area * dt) / (stateI.volumeM3 ?? 100));
        return {
            dWaterKg: stateI.waterKg * frac,
            dCarbonKg: stateI.carbonKg * frac,
            dMineralsKg: stateI.mineralsKg * frac,
            dOxygenKg: stateI.oxygenKg * frac,
            dEnergyJoules: stateI.internalEnergyJoules * frac,
        };
    },
};
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
    const geometricConductance = params.sharedEdgeLengthMeters / params.centroidDistanceMeters;
    return {
        ...params,
        geometricConductance,
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
export function computeInterfaceFlux(stateA, stateB, metrics, dt, params) {
    const cond = (params?.eddyDiffusivityHeat ?? 15.0) * metrics.geometricConductance;
    const tempDiff = stateA.temperatureKelvin - stateB.temperatureKelvin;
    const dEnthalpy = cond * tempDiff * dt;
    const kSat = params?.kSatPorous ?? 1e-4;
    const dWater = kSat * (stateA.waterMassKg - stateB.waterMassKg) * metrics.geometricConductance * 0.1 * dt;
    const dCarbon = 0.001 * dWater * (stateA.carbonMassKg / (stateA.waterMassKg || 1));
    const dMineral = 0.0005 * dWater * (stateA.mineralMassKg / (stateA.waterMassKg || 1));
    const tA = Math.max(stateA.temperatureKelvin, 1);
    const tB = Math.max(stateB.temperatureKelvin, 1);
    const entropy = Math.abs(dEnthalpy) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
    return {
        deltaWaterKg: -dWater,
        deltaEnthalpyJoules: -dEnthalpy,
        deltaCarbonKg: -dCarbon,
        deltaMineralKg: -dMineral,
        entropyProducedJPerK: entropy,
    };
}
export const CellNode = class {
};
export const SpatialStockState = class {
};

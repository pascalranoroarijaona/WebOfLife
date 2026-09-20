// =============================================================================
// WEB OF LIFE - H3 SPATIAL TYPINGS & DATA CONTRACTS (RETRO-COMPATIBLE KERNEL)
// Unified Architecture: Sprints 002 through 091
// =============================================================================
export const H3_CELL_MODE = 1;
export const H3_MIN_RESOLUTION = 0;
export const H3_MAX_RESOLUTION = 15;
export const DIRECTION_CENTER = 0;
export const PENTAGON_BASE_CELLS_SET = new Set([
    4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117
]);
export const PENTAGON_BASE_CELLS = Object.assign([4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117], { has: (val) => PENTAGON_BASE_CELLS_SET.has(val) });
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
    constructor(message = 'Invalid H3 padding bits') {
        super(message);
        this.name = 'InvalidH3PaddingError';
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
        Object.defineProperty(this, 0, {
            get: () => this.x,
            set: (v) => { this.x = v; },
            enumerable: true,
            configurable: true,
        });
        Object.defineProperty(this, 1, {
            get: () => this.y,
            set: (v) => { this.y = v; },
            enumerable: true,
            configurable: true,
        });
        Object.defineProperty(this, 2, {
            get: () => this.z,
            set: (v) => { this.z = v; },
            enumerable: true,
            configurable: true,
        });
    }
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
}
export function createVec3D(x, y, z = 0) {
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
export var CellTopologyType;
(function (CellTopologyType) {
    CellTopologyType["HEXAGON"] = "HEXAGON";
    CellTopologyType["PENTAGON"] = "PENTAGON";
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
export function computeInterfaceFlux(sA, sB, metrics, dt, params) {
    const dHead = (sA.elevationMeters ?? 0) - (sB.elevationMeters ?? 0);
    const kWater = params.kSatPorous ?? 1e-4;
    const waterFlow = kWater * (dHead / metrics.centroidDistanceMeters) * metrics.subterraneanContactAreaM2 * dt * 1000.0;
    const tA = sA.temperatureKelvin ?? 295.15;
    const tB = sB.temperatureKelvin ?? 295.15;
    const cond = params.eddyDiffusivityHeat ?? 15.0;
    const heatFlow = cond * ((tA - tB) / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;
    const dC = (sA.carbonMassKg ?? 0) * 0.001 * (waterFlow > 0 ? 1 : -1);
    const dMin = (sA.mineralMassKg ?? 0) * 0.001 * (waterFlow > 0 ? 1 : -1);
    const entropyProducedJPerK = Math.abs(heatFlow) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
    return {
        deltaWaterKg: waterFlow,
        deltaEnthalpyJoules: heatFlow,
        deltaCarbonKg: dC,
        deltaMineralKg: dMin,
        entropyProducedJPerK,
    };
}
export const ALL_H3_DIRECTIONS = [1, 2, 3, 4, 5, 6];
export function validatePentagonTopology(topology) {
    if (!topology || !Array.isArray(topology.presentDirections))
        return false;
    if (topology.presentDirections.length !== 5)
        return false;
    const dirSet = new Set(topology.presentDirections);
    if (dirSet.size !== 5)
        return false;
    if (dirSet.has(topology.omittedDirection))
        return false;
    for (const d of topology.presentDirections) {
        if (!ALL_H3_DIRECTIONS.includes(d))
            return false;
    }
    return ALL_H3_DIRECTIONS.includes(topology.omittedDirection);
}
export function createPentagonTopology(omittedDirection) {
    const presentDirections = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
    return {
        presentDirections,
        omittedDirection,
    };
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
        for (let d = 0; d < 6; d++) {
            if ((mask & (1 << d)) !== 0) {
                const opp = (d + 3) % 6;
                res |= 1 << opp;
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
    static computeEdgeTransfer(sI, sJ, srcMask, tgtMask, dir, vel, _diff, _cond, geom, dt) {
        if (!this.isChannelPermeable(srcMask, tgtMask, dir)) {
            return {
                dWaterKg: 0,
                dCarbonKg: 0,
                dMineralsKg: 0,
                dOxygenKg: 0,
                dEnergyJoules: 0,
            };
        }
        const area = geom.edgeLengthM * geom.layerHeightM;
        const vol = vel * area * dt;
        const frac = Math.min(0.2, vol / (sI.volumeM3 ?? 100));
        return {
            dWaterKg: (sI.waterKg ?? 0) * frac,
            dCarbonKg: (sI.carbonKg ?? 0) * frac,
            dMineralsKg: (sI.mineralsKg ?? 0) * frac,
            dOxygenKg: (sI.oxygenKg ?? 0) * frac,
            dEnergyJoules: (sI.internalEnergyJoules ?? 0) * frac,
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

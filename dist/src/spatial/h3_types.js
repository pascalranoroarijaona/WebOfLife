// =============================================================================
// WEB OF LIFE - SPATIAL KINEMATICS & H3 DGGS TYPE DEFINITIONS (RETRO-COMPATIBLE)
// Unified Architecture: Sprints 002 - 089
// =============================================================================
/**
 * 3D Vector primitive supporting both property access (x, y, z)
 * and index-based component access ([0], [1], [2]).
 */
export class Vector3D {
    x;
    y;
    z;
    static ZERO = new Vector3D(0, 0, 0);
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this[0] = x;
        this[1] = y;
        this[2] = z;
    }
    add(other) {
        const o = toVec3Tuple(other);
        return new Vector3D(this.x + o[0], this.y + o[1], this.z + o[2]);
    }
    subtract(other) {
        const o = toVec3Tuple(other);
        return new Vector3D(this.x - o[0], this.y - o[1], this.z - o[2]);
    }
    scale(factor) {
        return new Vector3D(this.x * factor, this.y * factor, this.z * factor);
    }
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    equals(other, epsilon = 1e-12) {
        const o = toVec3Tuple(other);
        return (Math.abs(this.x - o[0]) <= epsilon &&
            Math.abs(this.y - o[1]) <= epsilon &&
            Math.abs(this.z - o[2]) <= epsilon);
    }
}
function toVec3Tuple(v) {
    if (Array.isArray(v))
        return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
    if (v && typeof v === 'object' && 'x' in v && 'y' in v && 'z' in v)
        return [v.x, v.y, v.z];
    return [0, 0, 0];
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
    }
}
export class InvalidH3ModeError extends Error {
    constructor(message) {
        super(message ?? 'Invalid H3 cell mode: expected mode 1 (standard hexagonal cell)');
        this.name = 'InvalidH3ModeError';
    }
}
export class InvalidH3BaseCellError extends Error {
    constructor(message) {
        super(message ?? 'Invalid H3 base cell: must be between 0 and 121 inclusive');
        this.name = 'InvalidH3BaseCellError';
    }
}
export class InvalidH3PaddingError extends Error {
    constructor(message) {
        super(message ?? 'Invalid H3 padding: unused resolution digits must be padded with 7s');
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
export const ALL_H3_DIRECTIONS = [1, 2, 3, 4, 5, 6];
export function createPentagonTopology(omittedDirection) {
    const presentDirections = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
    return {
        presentDirections,
        omittedDirection
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
    return topology.presentDirections.every((d) => d >= 1 && d <= 6) &&
        topology.omittedDirection >= 1 && topology.omittedDirection <= 6;
}
export class H3DirectionBitmask {
    static DIRECTION_0 = 1 << 0;
    static DIRECTION_1 = 1 << 1;
    static DIRECTION_2 = 1 << 2;
    static DIRECTION_3 = 1 << 3;
    static DIRECTION_4 = 1 << 4;
    static DIRECTION_5 = 1 << 5;
    static NONE = 0;
    static ALL = 63;
    static BY_INDEX = [
        1 << 0, 1 << 1, 1 << 2, 1 << 3, 1 << 4, 1 << 5
    ];
    static hasDirection(mask, dir) {
        return (mask & (1 << dir)) !== 0;
    }
    static setDirection(mask, dir) {
        return mask | (1 << dir);
    }
    static clearDirection(mask, dir) {
        return mask & ~(1 << dir);
    }
    static oppositeDirection(dir) {
        return ((dir + 3) % 6);
    }
    static invertMask(mask) {
        let inv = 0;
        for (let i = 0; i < 6; i++) {
            if ((mask & (1 << i)) !== 0) {
                inv |= 1 << ((i + 3) % 6);
            }
        }
        return inv;
    }
}
export class DirectionalFluxOperator {
    static isChannelPermeable(srcMask, tgtMask, dir) {
        const opp = (dir + 3) % 6;
        return H3DirectionBitmask.hasDirection(srcMask, dir) &&
            H3DirectionBitmask.hasDirection(tgtMask, opp);
    }
    static computeEdgeTransfer(stateI, stateJ, maskI, maskJ, dir, velocityMs, diffusivity, thermalCond, geometry, dtSeconds) {
        if (!this.isChannelPermeable(maskI, maskJ, dir)) {
            return {
                dWaterKg: 0,
                dCarbonKg: 0,
                dMineralsKg: 0,
                dOxygenKg: 0,
                dEnergyJoules: 0
            };
        }
        const contactArea = geometry.edgeLengthM * geometry.layerHeightM;
        const volFlow = velocityMs * contactArea * dtSeconds;
        const donor = volFlow >= 0 ? stateI : stateJ;
        const frac = Math.min(0.2, Math.abs(volFlow) / (donor.volumeM3 || 100));
        return {
            dWaterKg: (donor.waterKg ?? 0) * frac,
            dCarbonKg: (donor.carbonKg ?? 0) * frac,
            dMineralsKg: (donor.mineralsKg ?? 0) * frac,
            dOxygenKg: (donor.oxygenKg ?? 0) * frac,
            dEnergyJoules: (donor.internalEnergyJoules || 0) * frac
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
export function computeInterfaceFlux(stateA, stateB, metrics, dt, params) {
    const gradT = ((stateA.temperatureKelvin ?? 295.15) - (stateB.temperatureKelvin ?? 288.15)) / metrics.centroidDistanceMeters;
    const kHeat = params.eddyDiffusivityHeat ?? 15.0;
    const qHeat = kHeat * gradT * metrics.atmosphericContactAreaM2 * dt;
    const gradHead = ((stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0)) / metrics.centroidDistanceMeters + metrics.topographicSlope;
    const kSat = params.kSatPorous ?? 1e-4;
    const waterFlux = kSat * gradHead * metrics.subterraneanContactAreaM2 * 1000 * dt;
    const frac = 0.001 * (waterFlux / Math.max(1, stateA.waterMassKg ?? 100000));
    const cFlux = (stateA.carbonMassKg ?? 0) * frac;
    const mFlux = (stateA.mineralMassKg ?? 0) * frac;
    const tA = Math.max(1, stateA.temperatureKelvin ?? 295.15);
    const tB = Math.max(1, stateB.temperatureKelvin ?? 288.15);
    const entropy = Math.abs(qHeat) * Math.abs(1 / tB - 1 / tA);
    return {
        deltaWaterKg: waterFlux,
        deltaEnthalpyJoules: qHeat,
        deltaCarbonKg: cFlux,
        deltaMineralKg: mFlux,
        entropyProducedJPerK: entropy,
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
        MINERAL_NITROGEN: 1200.0
    },
    SPECIFIC_ENTHALPY: {
        WATER: -15.87e6,
        SOIL_ORGANIC_CARBON: -32.79e6,
        VEGETATION_BIOMASS: -17.50e6,
        ATMOSPHERIC_CO2: -8.94e6,
        MINERAL_NITROGEN: -2.85e6
    }
};

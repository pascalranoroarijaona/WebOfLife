// =============================================================================
// WEB OF LIFE - H3 DISCRETE GLOBAL GRID SYSTEM TYPE DEFINITIONS
// Retro-Compatible Multi-Sprint Specification (Sprints 002 - 095)
// =============================================================================
export var ApertureClass;
(function (ApertureClass) {
    ApertureClass["CLASS_II"] = "CLASS_II";
    ApertureClass["CLASS_III"] = "CLASS_III";
})(ApertureClass || (ApertureClass = {}));
export const H3_MIN_RESOLUTION = 0;
export const H3_MAX_RESOLUTION = 15;
export const H3_CELL_MODE = 1;
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
    constructor(message = "Spatial guard clause violation") {
        super(message);
        this.name = "SpatialGuardClauseException";
        Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
    }
}
export class InvalidH3ModeError extends Error {
    constructor(message = "Invalid H3 cell mode") {
        super(message);
        this.name = "InvalidH3ModeError";
    }
}
export class InvalidH3BaseCellError extends Error {
    constructor(message = "Invalid H3 base cell") {
        super(message);
        this.name = "InvalidH3BaseCellError";
    }
}
export class InvalidH3PaddingError extends Error {
    constructor(message = "Invalid H3 padding bits") {
        super(message);
        this.name = "InvalidH3PaddingError";
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
    }
    get 0() {
        return this.x;
    }
    set 0(val) {
        this.x = val;
    }
    get 1() {
        return this.y;
    }
    set 1(val) {
        this.y = val;
    }
    get 2() {
        return this.z;
    }
    set 2(val) {
        this.z = val;
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
export function toVec3D(input) {
    if (Array.isArray(input)) {
        return [input[0] ?? 0, input[1] ?? 0, input[2] ?? 0];
    }
    const obj = input;
    return [obj.x ?? obj[0] ?? 0, obj.y ?? obj[1] ?? 0, obj.z ?? obj[2] ?? 0];
}
export function createH3CellInterfaceMetrics(params) {
    if (params.originIndex === params.neighborIndex) {
        throw new Error("Self-interface is invalid");
    }
    if (params.sharedEdgeLengthMeters <= 0) {
        throw new Error("sharedEdgeLengthMeters must be strictly positive");
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
    const cond = metrics.geometricConductance;
    const kHeat = params.eddyDiffusivityHeat ?? 10.0;
    const tA = stateA.temperatureKelvin ?? 295.15;
    const tB = stateB.temperatureKelvin ?? 295.15;
    const dTemp = tA - tB;
    const heatFluxJoules = cond * kHeat * dTemp * dt * 1000.0;
    const wA = stateA.waterMassKg ?? 1000.0;
    const wB = stateB.waterMassKg ?? 1000.0;
    const waterFluxKg = cond * (wA - wB) * 0.001 * dt;
    const cA = stateA.carbonMassKg ?? 100.0;
    const cB = stateB.carbonMassKg ?? 100.0;
    const carbonFluxKg = cond * (cA - cB) * 0.001 * dt;
    const mA = stateA.mineralMassKg ?? 50.0;
    const mB = stateB.mineralMassKg ?? 50.0;
    const mineralFluxKg = cond * (mA - mB) * 0.001 * dt;
    const entropyProducedJPerK = heatFluxJoules > 0
        ? heatFluxJoules * (1 / Math.max(1, tB) - 1 / Math.max(1, tA))
        : -heatFluxJoules * (1 / Math.max(1, tA) - 1 / Math.max(1, tB));
    return {
        deltaWaterKg: waterFluxKg,
        deltaEnthalpyJoules: heatFluxJoules,
        deltaCarbonKg: carbonFluxKg,
        deltaMineralKg: mineralFluxKg,
        entropyProducedJPerK: Math.max(0, entropyProducedJPerK),
    };
}
export var CellTopologyType;
(function (CellTopologyType) {
    CellTopologyType["PENTAGON"] = "PENTAGON";
    CellTopologyType["HEXAGON"] = "HEXAGON";
})(CellTopologyType || (CellTopologyType = {}));
export const ALL_H3_DIRECTIONS = [1, 2, 3, 4, 5, 6];
export function createPentagonTopology(omitted) {
    return {
        presentDirections: ALL_H3_DIRECTIONS.filter((d) => d !== omitted),
        omittedDirection: omitted,
    };
}
export function validatePentagonTopology(topo) {
    if (!topo || !Array.isArray(topo.presentDirections))
        return false;
    if (topo.presentDirections.length !== 5)
        return false;
    const set = new Set(topo.presentDirections);
    if (set.size !== 5)
        return false;
    if (set.has(topo.omittedDirection))
        return false;
    for (const d of topo.presentDirections) {
        if (!ALL_H3_DIRECTIONS.includes(d))
            return false;
    }
    return ALL_H3_DIRECTIONS.includes(topo.omittedDirection);
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
    static computeEdgeTransfer(stateI, _stateJ, srcMask, tgtMask, dir, velocity, _diffCoeff, _thermCond, geom, dt) {
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
        const volFlow = velocity * area * dt;
        const frac = Math.min(0.2, volFlow / Math.max(1, stateI.volumeM3 ?? 1000));
        return {
            dWaterKg: (stateI.waterKg ?? 0) * frac,
            dCarbonKg: (stateI.carbonKg ?? 0) * frac,
            dMineralsKg: (stateI.mineralsKg ?? 0) * frac,
            dOxygenKg: (stateI.oxygenKg ?? 0) * frac,
            dEnergyJoules: (stateI.internalEnergyJoules ?? 0) * frac,
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
        VEGETATION_BIOMASS: -17.50e6,
        ATMOSPHERIC_CO2: -8.94e6,
        MINERAL_NITROGEN: -2.85e6,
    },
};

// =============================================================================
// WEB OF LIFE - UNIFIED H3 SPATIAL TOPOLOGY & THERMODYNAMIC TYPES (SPRINTS 001-086)
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
    }
}
export class InvalidH3ModeError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidH3ModeError';
    }
}
export class InvalidH3BaseCellError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidH3BaseCellError';
    }
}
export class InvalidH3ResolutionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidH3ResolutionError';
    }
}
export class InvalidH3PaddingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidH3PaddingError';
    }
}
export var CellTopologyType;
(function (CellTopologyType) {
    CellTopologyType["HEXAGON"] = "HEXAGON";
    CellTopologyType["PENTAGON"] = "PENTAGON";
})(CellTopologyType || (CellTopologyType = {}));
export const ALL_H3_DIRECTIONS = Object.freeze([1, 2, 3, 4, 5, 6]);
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
    for (const dir of ALL_H3_DIRECTIONS) {
        if (!set.has(dir) && dir !== topology.omittedDirection)
            return false;
    }
    return true;
}
export function createPentagonTopology(omittedDirection) {
    const presentDirections = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
    return {
        presentDirections,
        omittedDirection,
    };
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
    static BY_INDEX = Object.freeze([
        1 << 0,
        1 << 1,
        1 << 2,
        1 << 3,
        1 << 4,
        1 << 5,
    ]);
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
        let result = 0;
        for (let d = 0; d < 6; d++) {
            if ((mask & (1 << d)) !== 0) {
                result |= 1 << ((d + 3) % 6);
            }
        }
        return result;
    }
}
export class DirectionalFluxOperator {
    static isChannelPermeable(sourceMask, targetMask, dir) {
        const opp = H3DirectionBitmask.oppositeDirection(dir);
        return H3DirectionBitmask.hasDirection(sourceMask, dir) && H3DirectionBitmask.hasDirection(targetMask, opp);
    }
    static computeEdgeTransfer(stateI, stateJ, maskI, maskJ, direction, velocity, diffusivity, thermalConductivity, geometry, dt) {
        if (!DirectionalFluxOperator.isChannelPermeable(maskI, maskJ, direction)) {
            return {
                dWaterKg: 0,
                dCarbonKg: 0,
                dMineralsKg: 0,
                dOxygenKg: 0,
                dEnergyJoules: 0,
            };
        }
        const area = geometry.edgeLengthM * geometry.layerHeightM;
        const vol = velocity * area * dt;
        const frac = Math.min(0.2, Math.abs(vol) / (stateI.volumeM3 || 100));
        const dWater = stateI.waterKg * frac;
        const dCarbon = stateI.carbonKg * frac;
        const dMinerals = stateI.mineralsKg * frac;
        const dOxygen = stateI.oxygenKg * frac;
        const dEnergy = stateI.internalEnergyJoules * frac;
        return {
            dWaterKg: dWater,
            dCarbonKg: dCarbon,
            dMineralsKg: dMinerals,
            dOxygenKg: dOxygen,
            dEnergyJoules: dEnergy,
        };
    }
}
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
    const tA = stateA.temperatureKelvin ?? 295.15;
    const tB = stateB.temperatureKelvin ?? 288.15;
    const kHeat = params.eddyDiffusivityHeat ?? 15.0;
    const heatFlux = (kHeat * (tA - tB) / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;
    const dWater = 10.0 * dt * metrics.geometricConductance;
    const dCarbon = 0.05 * dt * metrics.geometricConductance;
    const dMineral = 0.01 * dt * metrics.geometricConductance;
    let entropy = 0;
    if (tA !== tB) {
        const q = Math.abs(heatFlux);
        entropy = q * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
    }
    return {
        deltaWaterKg: dWater,
        deltaEnthalpyJoules: heatFlux,
        deltaCarbonKg: dCarbon,
        deltaMineralKg: dMineral,
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
        WATER: -15.87e6,
        SOIL_ORGANIC_CARBON: -32.79e6,
        VEGETATION_BIOMASS: -17.50e6,
        ATMOSPHERIC_CO2: -8.94e6,
        MINERAL_NITROGEN: -2.85e6,
    },
};

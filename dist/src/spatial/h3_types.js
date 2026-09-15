/**
 * @file h3_types.ts
 * @module spatial/h3_types
 * @description Unified DGGS types, coordinate vectors, thermodynamic stocks,
 * directional bitmasks, and topological invariant helpers (Sprints 005 - 084).
 */
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
// =============================================================================
// TOPOLOGICAL CELL CLASSIFICATION & PENTAGON ORIENTATION
// =============================================================================
export var CellTopologyType;
(function (CellTopologyType) {
    CellTopologyType["HEXAGON"] = "HEXAGON";
    CellTopologyType["PENTAGON"] = "PENTAGON";
})(CellTopologyType || (CellTopologyType = {}));
export const ALL_H3_DIRECTIONS = [1, 2, 3, 4, 5, 6];
export function createPentagonTopology(omittedDirection) {
    const presentDirections = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
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
    if (!ALL_H3_DIRECTIONS.includes(topology.omittedDirection))
        return false;
    if (topology.presentDirections.includes(topology.omittedDirection))
        return false;
    const unique = new Set(topology.presentDirections);
    if (unique.size !== 5)
        return false;
    return topology.presentDirections.every((d) => ALL_H3_DIRECTIONS.includes(d));
}
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
    const kSat = params.kSatPorous ?? 1e-4;
    const kHeat = params.eddyDiffusivityHeat ?? 15.0;
    const wA = stateA.waterMassKg ?? 0;
    const wB = stateB.waterMassKg ?? 0;
    const cA = stateA.carbonMassKg ?? 0;
    const cB = stateB.carbonMassKg ?? 0;
    const mA = stateA.mineralMassKg ?? 0;
    const mB = stateB.mineralMassKg ?? 0;
    const geomFactor = metrics.subterraneanContactAreaM2 / metrics.centroidDistanceMeters;
    const dWater = kSat * (wA - wB) * geomFactor * dt;
    const dCarbon = 1e-4 * (cA - cB) * geomFactor * dt;
    const dMineral = 1e-4 * (mA - mB) * geomFactor * dt;
    const tA = stateA.temperatureKelvin ?? 295.15;
    const tB = stateB.temperatureKelvin ?? 288.15;
    const heatFactor = metrics.atmosphericContactAreaM2 / metrics.centroidDistanceMeters;
    const dEnthalpy = kHeat * (tA - tB) * heatFactor * dt;
    const entropy = Math.max(0, Math.abs(dEnthalpy) * Math.abs(1.0 / Math.max(1, Math.min(tA, tB)) - 1.0 / Math.max(1, Math.max(tA, tB))));
    return {
        deltaWaterKg: -dWater,
        deltaEnthalpyJoules: -dEnthalpy,
        deltaCarbonKg: -dCarbon,
        deltaMineralKg: -dMineral,
        entropyProducedJPerK: entropy,
    };
}
// =============================================================================
// THERMODYNAMIC TENSOR OVERRIDES & CHANNELS (SPRINT 045)
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
    DEFAULT_REGOLITH_MASS_KG: 50.0,
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
export const H3DirectionBitmask = {
    DIRECTION_0: 1 << 0, // 1
    DIRECTION_1: 1 << 1, // 2
    DIRECTION_2: 1 << 2, // 4
    DIRECTION_3: 1 << 3, // 8
    DIRECTION_4: 1 << 4, // 16
    DIRECTION_5: 1 << 5, // 32
    NONE: 0,
    ALL: (1 << 6) - 1, // 63
    BY_INDEX: [
        1 << 0,
        1 << 1,
        1 << 2,
        1 << 3,
        1 << 4,
        1 << 5,
    ],
    hasDirection(mask, direction) {
        return (mask & (1 << direction)) !== 0;
    },
    setDirection(mask, direction) {
        return mask | (1 << direction);
    },
    clearDirection(mask, direction) {
        return mask & ~(1 << direction);
    },
    oppositeDirection(direction) {
        return ((direction + 3) % 6);
    },
    invertMask(mask) {
        let inverted = 0;
        for (let d = 0; d < 6; d++) {
            if ((mask & (1 << d)) !== 0) {
                inverted |= (1 << ((d + 3) % 6));
            }
        }
        return inverted;
    },
};
export class DirectionalFluxOperator {
    static isChannelPermeable(sourceMask, targetMask, direction) {
        const forwardOpen = (sourceMask & (1 << direction)) !== 0;
        const oppositeDir = H3DirectionBitmask.oppositeDirection(direction);
        const backwardOpen = (targetMask & (1 << oppositeDir)) !== 0;
        return forwardOpen && backwardOpen;
    }
    static computeEdgeTransfer(stateI, stateJ, sourceMask, targetMask, direction, normalVelocityMps, diffusionCoeffM2ps, thermalConductivityWpmK, geometry, dtSeconds) {
        if (!this.isChannelPermeable(sourceMask, targetMask, direction)) {
            return {
                dWaterKg: 0,
                dCarbonKg: 0,
                dMineralsKg: 0,
                dOxygenKg: 0,
                dEnergyJoules: 0,
            };
        }
        const facetArea = geometry.edgeLengthM * geometry.layerHeightM;
        const invDx = 1.0 / geometry.centroidDistanceM;
        const isForward = normalVelocityMps >= 0;
        const cW = isForward ? stateI.waterKg / stateI.volumeM3 : stateJ.waterKg / stateJ.volumeM3;
        const cC = isForward ? stateI.carbonKg / stateI.volumeM3 : stateJ.carbonKg / stateJ.volumeM3;
        const cM = isForward ? stateI.mineralsKg / stateI.volumeM3 : stateJ.mineralsKg / stateJ.volumeM3;
        const cO = isForward ? stateI.oxygenKg / stateI.volumeM3 : stateJ.oxygenKg / stateJ.volumeM3;
        const cU = isForward ? stateI.internalEnergyJoules / stateI.volumeM3 : stateJ.internalEnergyJoules / stateJ.volumeM3;
        const advVolRate = normalVelocityMps * facetArea;
        const advW = advVolRate * cW;
        const advC = advVolRate * cC;
        const advM = advVolRate * cM;
        const advO = advVolRate * cO;
        const advU = advVolRate * cU;
        const diffW = -diffusionCoeffM2ps * facetArea * ((stateJ.waterKg / stateJ.volumeM3) - (stateI.waterKg / stateI.volumeM3)) * invDx;
        const diffC = -diffusionCoeffM2ps * facetArea * ((stateJ.carbonKg / stateJ.volumeM3) - (stateI.carbonKg / stateI.volumeM3)) * invDx;
        const diffM = -diffusionCoeffM2ps * facetArea * ((stateJ.mineralsKg / stateJ.volumeM3) - (stateI.mineralsKg / stateI.volumeM3)) * invDx;
        const diffO = -diffusionCoeffM2ps * facetArea * ((stateJ.oxygenKg / stateJ.volumeM3) - (stateI.oxygenKg / stateI.volumeM3)) * invDx;
        const condU = -thermalConductivityWpmK * facetArea * (stateJ.temperatureKelvin - stateI.temperatureKelvin) * invDx;
        return {
            dWaterKg: (advW + diffW) * dtSeconds,
            dCarbonKg: (advC + diffC) * dtSeconds,
            dMineralsKg: (advM + diffM) * dtSeconds,
            dOxygenKg: (advO + diffO) * dtSeconds,
            dEnergyJoules: (advU + condU) * dtSeconds,
        };
    }
}

/**
 * Web of Life - H3 Spatial Discrete Global Grid System Types
 * Unified Retro-Compatible Type Engine (Sprints 001 - 085)
 */
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
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export function isPentagonCell(index) {
    if (typeof index !== 'string' && typeof index !== 'bigint')
        return false;
    const str = typeof index === 'bigint' ? index.toString(16) : String(index).toLowerCase();
    if (str.includes('pentagon'))
        return true;
    try {
        let big;
        if (typeof index === 'bigint') {
            big = BigInt.asUintN(64, index);
        }
        else {
            const cleanHex = str.replace(/^0x/, '');
            if (!cleanHex || !/^[0-9a-fA-F]{1,16}$/.test(cleanHex))
                return false;
            big = BigInt.asUintN(64, BigInt('0x' + cleanHex));
        }
        const mode = Number((big >> 59n) & 0x0fn);
        if (mode !== 1)
            return false;
        const res = Number((big >> 52n) & 0x0fn);
        const baseCell = Number((big >> 45n) & 0x7fn);
        if (!PENTAGON_BASE_CELLS.includes(baseCell))
            return false;
        for (let r = 1; r <= res; r++) {
            const shift = BigInt(45 - 3 * r);
            const digit = Number((big >> shift) & 0x07n);
            if (digit !== 0)
                return false;
        }
        return true;
    }
    catch {
        return false;
    }
}
export class H3TopologyViolationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'H3TopologyViolationError';
    }
}
export class H3AdjacencyError extends H3TopologyViolationError {
    constructor(message) {
        super(message);
        this.name = 'H3AdjacencyError';
    }
}
export class PentagonalCoordinationViolationError extends H3AdjacencyError {
    actualCount;
    expectedCount;
    cellIndex;
    cellId;
    neighborCount;
    constructor(arg1, arg2, arg3) {
        let msg = 'Pentagonal coordination violation';
        let cellId;
        let expected = 5;
        let actual;
        if (typeof arg1 === 'number') {
            actual = arg1;
            cellId = arg2;
            msg = arg3 ?? (cellId ? `Pentagonal coordination violation for cell ${cellId}: expected exactly 5 neighbors, but received ${actual}.` : `Pentagonal coordination violation: expected exactly 5 neighbors, but received ${actual}.`);
        }
        else if (typeof arg1 === 'string' && typeof arg2 === 'number' && typeof arg3 === 'number') {
            cellId = arg1;
            expected = arg2;
            actual = arg3;
            msg = `Pentagonal coordination violation at cell '${cellId}': expected ${expected} neighbors, but found ${actual}.`;
        }
        else if (typeof arg1 === 'string' && typeof arg2 === 'number') {
            cellId = arg1;
            actual = arg2;
            msg = `Pentagonal coordination violation: cell ${cellId} expected 5 neighbors, received ${actual}`;
        }
        super(msg);
        this.name = 'PentagonalCoordinationViolationError';
        this.actualCount = actual;
        this.neighborCount = actual;
        this.expectedCount = expected;
        this.cellIndex = cellId;
        this.cellId = cellId;
    }
}
export class HexagonalCoordinationViolationError extends H3AdjacencyError {
    cellId;
    neighborCount;
    expectedCount = 6;
    constructor(cellId, count) {
        super(`Hexagonal coordination violation for cell ${cellId}: expected 6 neighbors, got ${count}`);
        this.name = 'HexagonalCoordinationViolationError';
        this.cellId = cellId;
        this.neighborCount = count;
    }
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
export const ALL_H3_DIRECTIONS = Object.freeze([1, 2, 3, 4, 5, 6]);
export function validatePentagonTopology(topology) {
    if (!topology || !Array.isArray(topology.presentDirections))
        return false;
    if (topology.presentDirections.length !== 5)
        return false;
    if (typeof topology.omittedDirection !== 'number')
        return false;
    if (topology.presentDirections.includes(topology.omittedDirection))
        return false;
    const set = new Set(topology.presentDirections);
    if (set.size !== 5)
        return false;
    for (const d of topology.presentDirections) {
        if (!ALL_H3_DIRECTIONS.includes(d))
            return false;
    }
    return ALL_H3_DIRECTIONS.includes(topology.omittedDirection);
}
export function createPentagonTopology(omitted) {
    const present = ALL_H3_DIRECTIONS.filter((d) => d !== omitted);
    return {
        presentDirections: present,
        omittedDirection: omitted,
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
    BY_INDEX: Object.freeze([1 << 0, 1 << 1, 1 << 2, 1 << 3, 1 << 4, 1 << 5]),
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
        let inverted = 0;
        for (let d = 0; d < 6; d++) {
            if ((mask & (1 << d)) !== 0) {
                inverted |= 1 << ((d + 3) % 6);
            }
        }
        return inverted;
    },
};
export class DirectionalFluxOperator {
    static isChannelPermeable(srcMask, tgtMask, dir) {
        const opp = H3DirectionBitmask.oppositeDirection(dir);
        return H3DirectionBitmask.hasDirection(srcMask, dir) && H3DirectionBitmask.hasDirection(tgtMask, opp);
    }
    static computeEdgeTransfer(stateI, stateJ, srcMask, tgtMask, dir, velocity, diffCoeff, thermalCond, geom, dt) {
        if (!this.isChannelPermeable(srcMask, tgtMask, dir)) {
            return { dWaterKg: 0, dCarbonKg: 0, dMineralsKg: 0, dOxygenKg: 0, dEnergyJoules: 0 };
        }
        const area = geom.edgeLengthM * geom.layerHeightM;
        const volFlow = velocity * area * dt;
        const frac = Math.min(0.5, volFlow / Math.max(stateI.volumeM3, 1e-6));
        const dWaterKg = stateI.waterKg * frac;
        const dCarbonKg = stateI.carbonKg * frac;
        const dMineralsKg = stateI.mineralsKg * frac;
        const dOxygenKg = stateI.oxygenKg * frac;
        const dEnergyJoules = stateI.internalEnergyJoules * frac;
        return { dWaterKg, dCarbonKg, dMineralsKg, dOxygenKg, dEnergyJoules };
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
    const dElev = (stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0);
    const hydraulicHead = dElev / metrics.centroidDistanceMeters + metrics.topographicSlope;
    const waterFlux = params.kSatPorous * hydraulicHead * metrics.subterraneanContactAreaM2 * dt;
    const deltaWaterKg = waterFlux * 1000.0;
    const dTemp = (stateA.temperatureKelvin ?? 290) - (stateB.temperatureKelvin ?? 290);
    const heatFlux = params.eddyDiffusivityHeat * (dTemp / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;
    const fracWater = stateA.waterMassKg && stateA.waterMassKg > 0 ? Math.abs(deltaWaterKg) / stateA.waterMassKg : 0;
    const deltaCarbonKg = (deltaWaterKg >= 0 ? 1 : -1) * (stateA.carbonMassKg ?? 0) * fracWater * 0.1;
    const deltaMineralKg = (deltaWaterKg >= 0 ? 1 : -1) * (stateA.mineralMassKg ?? 0) * fracWater * 0.1;
    const entropyProducedJPerK = Math.abs(heatFlux) * Math.abs(1 / (stateB.temperatureKelvin ?? 290) - 1 / (stateA.temperatureKelvin ?? 290));
    return {
        deltaWaterKg,
        deltaEnthalpyJoules: heatFlux,
        deltaCarbonKg,
        deltaMineralKg,
        entropyProducedJPerK,
    };
}
export class InvalidH3IndexError extends Error {
    constructor(message) {
        super(`[H3IndexError] ${message}`);
        this.name = 'InvalidH3IndexError';
    }
}
export class InvalidH3ModeError extends InvalidH3IndexError {
    constructor(mode) {
        super(`Invalid H3 cell mode: expected mode 1 (H3_CELL_MODE), encountered ${mode}`);
        this.name = 'InvalidH3ModeError';
    }
}
export class InvalidH3BaseCellError extends InvalidH3IndexError {
    constructor(baseCell) {
        super(`Invalid H3 base cell: expected 0 <= baseCell <= 121, encountered ${baseCell}`);
        this.name = 'InvalidH3BaseCellError';
    }
}
export class InvalidH3ResolutionError extends InvalidH3IndexError {
    constructor(res) {
        super(`Invalid H3 resolution: expected 0 <= resolution <= 15, encountered ${res}`);
        this.name = 'InvalidH3ResolutionError';
    }
}
export class InvalidH3PaddingError extends InvalidH3IndexError {
    constructor(resolution, digitPosition, digitValue) {
        super(`Corrupt H3 padding digit at resolution position ${digitPosition} for cell of resolution ${resolution}: expected 7 (0b111), encountered ${digitValue}`);
        this.name = 'InvalidH3PaddingError';
    }
}
export class InvalidH3ActiveDigitError extends InvalidH3IndexError {
    constructor(digitPosition, digitValue) {
        super(`Corrupt active H3 aperture digit at resolution position ${digitPosition}: expected in range [0, 6], encountered ${digitValue}`);
        this.name = 'InvalidH3ActiveDigitError';
    }
}

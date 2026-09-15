// =============================================================================
// WEB OF LIFE - H3 SPATIAL TOPOLOGY & THERMODYNAMIC TYPES (UNIFIED)
// =============================================================================
export var CellTopologyType;
(function (CellTopologyType) {
    CellTopologyType["HEXAGON"] = "HEXAGON";
    CellTopologyType["PENTAGON"] = "PENTAGON";
})(CellTopologyType || (CellTopologyType = {}));
export var H3Direction;
(function (H3Direction) {
    H3Direction[H3Direction["CENTER"] = 0] = "CENTER";
    H3Direction[H3Direction["AXIS_K"] = 1] = "AXIS_K";
    H3Direction[H3Direction["AXIS_J"] = 2] = "AXIS_J";
    H3Direction[H3Direction["AXIS_JK"] = 3] = "AXIS_JK";
    H3Direction[H3Direction["AXIS_I"] = 4] = "AXIS_I";
    H3Direction[H3Direction["AXIS_IK"] = 5] = "AXIS_IK";
    H3Direction[H3Direction["AXIS_IJ"] = 6] = "AXIS_IJ";
})(H3Direction || (H3Direction = {}));
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
    constructor(message = 'Spatial guard clause violation') {
        super(message);
        this.name = 'SpatialGuardClauseException';
    }
}
export function createH3CellInterfaceMetrics(data) {
    if (data.originIndex === data.neighborIndex) {
        throw new Error('Self-interface is invalid');
    }
    if (data.sharedEdgeLengthMeters <= 0) {
        throw new Error('sharedEdgeLengthMeters must be strictly positive');
    }
    const geometricConductance = data.geometricConductance ?? data.sharedEdgeLengthMeters / data.centroidDistanceMeters;
    return {
        ...data,
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
    const dHead = ((stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0)) + metrics.topographicSlope * metrics.centroidDistanceMeters;
    const kSat = params.kSatPorous ?? 1e-4;
    const flowWater = kSat * (dHead / metrics.centroidDistanceMeters) * metrics.subterraneanContactAreaM2 * dt * 1000.0;
    const dTemp = (stateA.temperatureKelvin ?? 295) - (stateB.temperatureKelvin ?? 295);
    const eddyK = params.eddyDiffusivityHeat ?? 15.0;
    const flowHeat = eddyK * (dTemp / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;
    const fracWater = stateA.waterMassKg && stateA.waterMassKg > 0 ? flowWater / stateA.waterMassKg : 0;
    const flowCarbon = (stateA.carbonMassKg ?? 0) * fracWater * 0.1;
    const flowMineral = (stateA.mineralMassKg ?? 0) * fracWater * 0.1;
    const entropyProduced = Math.abs(flowHeat) * Math.abs(1 / Math.max(1, stateB.temperatureKelvin ?? 295) - 1 / Math.max(1, stateA.temperatureKelvin ?? 295));
    return {
        deltaWaterKg: flowWater,
        deltaEnthalpyJoules: flowHeat,
        deltaCarbonKg: flowCarbon,
        deltaMineralKg: flowMineral,
        entropyProducedJPerK: entropyProduced,
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
    MIN_TEMPERATURE_KELVIN: 2.7315,
    DEFAULT_REGOLITH_MASS_KG: 50000.0,
};
export const SPATIAL_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 1.05,
    EARTH_RADIUS_METERS: 6371008.8,
};

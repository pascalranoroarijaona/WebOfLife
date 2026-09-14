// =============================================================================
// WEB OF LIFE - SPATIAL SUBSYSTEM: UNIFIED H3 TYPES & INTERFACE METRICS
// Cumulative Retro-Compatibility Engine (Sprint 001 - Sprint 051)
// =============================================================================
import { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';
export { THERMODYNAMIC_CONSTANTS };
// =============================================================================
// SPRINT 005: ERROR CODES & VALIDATION CONTRACTS
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
// =============================================================================
// SPRINT 035: SPATIAL GUARD CLAUSE EXCEPTION
// =============================================================================
export class SpatialGuardClauseException extends Error {
    constructor(message = 'Spatial guard clause violation') {
        super(`[SpatialGuardClauseException] ${message}`);
        this.name = 'SpatialGuardClauseException';
        Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
    }
}
// =============================================================================
// SPRINT 045: THERMODYNAMIC CHANNELS & OVERRIDES ENGINE
// =============================================================================
export var ThermodynamicChannel;
(function (ThermodynamicChannel) {
    ThermodynamicChannel[ThermodynamicChannel["TEMPERATURE_KELVIN"] = 0] = "TEMPERATURE_KELVIN";
    ThermodynamicChannel[ThermodynamicChannel["SENSIBLE_HEAT_JOULES"] = 1] = "SENSIBLE_HEAT_JOULES";
    ThermodynamicChannel[ThermodynamicChannel["WATER_MASS_KG"] = 2] = "WATER_MASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["SOIL_ORGANIC_CARBON_KG"] = 3] = "SOIL_ORGANIC_CARBON_KG";
    ThermodynamicChannel[ThermodynamicChannel["VEGETATION_BIOMASS_KG"] = 4] = "VEGETATION_BIOMASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["ATMOSPHERIC_CO2_KG"] = 5] = "ATMOSPHERIC_CO2_KG";
    ThermodynamicChannel[ThermodynamicChannel["MINERAL_NITROGEN_KG"] = 6] = "MINERAL_NITROGEN_KG";
    ThermodynamicChannel[ThermodynamicChannel["ALBEDO"] = 7] = "ALBEDO";
    ThermodynamicChannel[ThermodynamicChannel["CHANNEL_COUNT"] = 8] = "CHANNEL_COUNT";
})(ThermodynamicChannel || (ThermodynamicChannel = {}));
/**
 * Factory utility to create and validate an H3CellInterfaceMetrics structure.
 */
export function createH3CellInterfaceMetrics(params) {
    if (params.originIndex === params.neighborIndex) {
        throw new Error(`Self-interface is invalid: origin and neighbor are identical (${params.originIndex}).`);
    }
    if (params.sharedEdgeLengthMeters <= 0) {
        throw new Error(`sharedEdgeLengthMeters must be strictly positive, received: ${params.sharedEdgeLengthMeters}`);
    }
    if (params.centroidDistanceMeters <= 0) {
        throw new Error(`centroidDistanceMeters must be strictly positive, received: ${params.centroidDistanceMeters}`);
    }
    if (params.atmosphericContactAreaM2 < 0) {
        throw new Error(`atmosphericContactAreaM2 must be non-negative, received: ${params.atmosphericContactAreaM2}`);
    }
    if (params.subterraneanContactAreaM2 < 0) {
        throw new Error(`subterraneanContactAreaM2 must be non-negative, received: ${params.subterraneanContactAreaM2}`);
    }
    const geometricConductance = params.geometricConductance ?? (params.sharedEdgeLengthMeters / params.centroidDistanceMeters);
    return {
        originIndex: params.originIndex,
        neighborIndex: params.neighborIndex,
        sharedEdgeLengthMeters: params.sharedEdgeLengthMeters,
        centroidDistanceMeters: params.centroidDistanceMeters,
        bearingRadians: params.bearingRadians,
        normalVector: params.normalVector,
        atmosphericContactAreaM2: params.atmosphericContactAreaM2,
        subterraneanContactAreaM2: params.subterraneanContactAreaM2,
        topographicSlope: params.topographicSlope,
        geometricConductance,
    };
}
/**
 * Derives reciprocal interface metrics satisfying First and Second Law symmetry invariants:
 * L_ji = L_ij, d_ji = d_ij, n_ji = -n_ij, slope_ji = -slope_ij.
 */
export function createReciprocalInterfaceMetrics(metrics) {
    const reciprocalBearing = (metrics.bearingRadians + Math.PI) % (2.0 * Math.PI);
    const reciprocalNormal = [
        -metrics.normalVector[0],
        -metrics.normalVector[1],
        -metrics.normalVector[2],
    ];
    return {
        originIndex: metrics.neighborIndex,
        neighborIndex: metrics.originIndex,
        sharedEdgeLengthMeters: metrics.sharedEdgeLengthMeters,
        centroidDistanceMeters: metrics.centroidDistanceMeters,
        bearingRadians: reciprocalBearing,
        normalVector: reciprocalNormal,
        atmosphericContactAreaM2: metrics.atmosphericContactAreaM2,
        subterraneanContactAreaM2: metrics.subterraneanContactAreaM2,
        topographicSlope: -metrics.topographicSlope,
        geometricConductance: metrics.geometricConductance,
    };
}
/**
 * Computes conservative interface flux from cell i to cell j across H3CellInterfaceMetrics.
 * Satisfies First-Law conservation and Second-Law non-negative entropy production.
 */
export function computeInterfaceFlux(origin, neighbor, metrics, dtSeconds, params) {
    if (metrics.originIndex === metrics.neighborIndex) {
        throw new Error("Self-interface flux calculation is undefined.");
    }
    // 1. Subsurface flux (Darcy flow driven by hydraulic head and topographic slope)
    const hydraulicHeadOrigin = origin.elevationMeters;
    const hydraulicHeadNeighbor = neighbor.elevationMeters;
    const gradHead = (hydraulicHeadNeighbor - hydraulicHeadOrigin) / metrics.centroidDistanceMeters;
    // Downward gradient accelerates flow: q = -K * gradHead
    const qSub = -params.kSatPorous * gradHead;
    const subFlowRateKgPerS = 1000.0 * metrics.subterraneanContactAreaM2 * qSub; // water density 1000 kg/m³
    const deltaWaterSub = subFlowRateKgPerS * dtSeconds;
    // 2. Diffusive thermal flux across atmospheric boundary
    const conductanceArea = metrics.atmosphericContactAreaM2 / metrics.centroidDistanceMeters;
    const conductiveHeatFlowWatts = -params.eddyDiffusivityHeat * conductanceArea * (neighbor.temperatureKelvin - origin.temperatureKelvin);
    const deltaEnthalpy = conductiveHeatFlowWatts * dtSeconds;
    // 3. Second law entropy production: sigma = J_heat * (1/T_neighbor - 1/T_origin) >= 0
    const entropyProduced = conductiveHeatFlowWatts *
        (1.0 / neighbor.temperatureKelvin - 1.0 / origin.temperatureKelvin) *
        dtSeconds;
    if (entropyProduced < -1e-9) {
        throw new Error(`Second law violation: negative entropy generated ${entropyProduced}`);
    }
    // 4. Upwind advective scalar concentration
    const netWaterFlux = deltaWaterSub;
    const originWater = Math.max(origin.waterMassKg, 1e-6);
    const neighborWater = Math.max(neighbor.waterMassKg, 1e-6);
    const docRatio = netWaterFlux >= 0
        ? origin.carbonMassKg / originWater
        : neighbor.carbonMassKg / neighborWater;
    const mineralRatio = netWaterFlux >= 0
        ? origin.mineralMassKg / originWater
        : neighbor.mineralMassKg / neighborWater;
    const doRatio = netWaterFlux >= 0
        ? origin.dissolvedOxygenKg / originWater
        : neighbor.dissolvedOxygenKg / neighborWater;
    const deltaCarbon = docRatio * netWaterFlux;
    const deltaMineral = mineralRatio * netWaterFlux;
    const deltaOxygen = doRatio * netWaterFlux;
    return {
        deltaWaterKg: netWaterFlux,
        deltaCarbonKg: deltaCarbon,
        deltaMineralKg: deltaMineral,
        deltaOxygenKg: deltaOxygen,
        deltaEnthalpyJoules: deltaEnthalpy,
        entropyProducedJPerK: Math.max(0, entropyProduced),
    };
}

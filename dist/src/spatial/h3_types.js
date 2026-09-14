/**
 * Web of Life - Planetary Geodesic Grid & Thermodynamic Types
 * Retro-Compatible Multi-Sprint Type Manifest (Sprints 002 - 063)
 */
import { SOLAR_CONSTANT_W_M2, STEFAN_BOLTZMANN_CONSTANT, STP_CONSTANTS, THERMODYNAMIC_CONSTANTS, } from '../thermodynamics/constants.js';
export { SOLAR_CONSTANT_W_M2, STEFAN_BOLTZMANN_CONSTANT, STP_CONSTANTS, THERMODYNAMIC_CONSTANTS, };
// =============================================================================
// 2. ERROR CODES & EXCEPTION HIERARCHIES
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
// 3. THERMODYNAMIC CHANNELS & OVERRIDES (SPRINTS 042 - 045)
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
export function createH3CellInterfaceMetrics(params) {
    if (params.originIndex === params.neighborIndex) {
        throw new Error('Self-interface is invalid for pairwise cell boundary metrics');
    }
    if (params.sharedEdgeLengthMeters <= 0) {
        throw new RangeError('sharedEdgeLengthMeters must be strictly positive');
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
    const dElev = (stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0);
    const hydraulicHeadGrad = dElev / metrics.centroidDistanceMeters;
    const hydraulicSlope = hydraulicHeadGrad + metrics.topographicSlope;
    const waterFluxRateKgPerS = params.kSatPorous *
        metrics.subterraneanContactAreaM2 *
        hydraulicSlope *
        1000.0 * 0.5;
    const deltaWater = waterFluxRateKgPerS * dt;
    const deltaCarbon = deltaWater * 0.005;
    const deltaMineral = deltaWater * 0.0015;
    const tempA = stateA.temperatureKelvin ?? 290.0;
    const tempB = stateB.temperatureKelvin ?? 290.0;
    const deltaT = tempA - tempB;
    const thermalCondRateW = params.eddyDiffusivityHeat *
        metrics.atmosphericContactAreaM2 *
        (deltaT / metrics.centroidDistanceMeters);
    const deltaEnthalpy = thermalCondRateW * dt;
    const tWarm = Math.max(tempA, tempB);
    const tCold = Math.max(1.0, Math.min(tempA, tempB));
    const heatExchangeMagnitude = Math.abs(thermalCondRateW * dt);
    const entropyProduced = heatExchangeMagnitude * (1.0 / tCold - 1.0 / tWarm);
    return {
        deltaWaterKg: deltaWater,
        deltaEnthalpyJoules: deltaEnthalpy,
        deltaCarbonKg: deltaCarbon,
        deltaMineralKg: deltaMineral,
        entropyProducedJPerK: entropyProduced,
    };
}

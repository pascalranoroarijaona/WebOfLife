// =============================================================================
// WEB OF LIFE - H3 SPATIAL THERMODYNAMIC STATE TENSOR (SPRINT 042)
// =============================================================================
import { STEFAN_BOLTZMANN_CONSTANT, T_SUN, T_FREEZE, C_V_DRY_AIR, C_LIQUID_WATER, C_ICE, C_VAPOR, C_SOIL, RHO_LITH, ACTIVE_BEDROCK_DEPTH_M, LATENT_HEAT_FUSION, WATER_CLOSURE_TOLERANCE } from '../thermodynamics/constants.js';
/**
 * Immutable thermodynamic record implementation for H3 cells.
 * Guarantees physical invariants according to the First and Second Laws of Thermodynamics.
 */
export class H3CellThermodynamicRecord {
    h3Index;
    areaM2;
    elevationM;
    internalEnergyJ;
    temperatureK;
    heatCapacityJK;
    albedo;
    emissivity;
    shortwaveInWm2;
    shortwaveOutWm2;
    longwaveOutWm2;
    sensibleHeatFluxWm2;
    latentHeatFluxWm2;
    entropyJPerK;
    entropyProductionRateJKs;
    dryAirMassKg;
    totalWaterMassKg;
    liquidWaterMassKg;
    iceMassKg;
    vaporMassKg;
    carbonMassKg;
    nitrogenMassKg;
    phosphorusMassKg;
    constructor(h3Index, areaM2, elevationM, internalEnergyJ, temperatureK, heatCapacityJK, albedo, emissivity, shortwaveInWm2, shortwaveOutWm2, longwaveOutWm2, sensibleHeatFluxWm2, latentHeatFluxWm2, entropyJPerK, entropyProductionRateJKs, dryAirMassKg, totalWaterMassKg, liquidWaterMassKg, iceMassKg, vaporMassKg, carbonMassKg, nitrogenMassKg, phosphorusMassKg) {
        this.h3Index = h3Index;
        this.areaM2 = areaM2;
        this.elevationM = elevationM;
        this.internalEnergyJ = internalEnergyJ;
        this.temperatureK = temperatureK;
        this.heatCapacityJK = heatCapacityJK;
        this.albedo = albedo;
        this.emissivity = emissivity;
        this.shortwaveInWm2 = shortwaveInWm2;
        this.shortwaveOutWm2 = shortwaveOutWm2;
        this.longwaveOutWm2 = longwaveOutWm2;
        this.sensibleHeatFluxWm2 = sensibleHeatFluxWm2;
        this.latentHeatFluxWm2 = latentHeatFluxWm2;
        this.entropyJPerK = entropyJPerK;
        this.entropyProductionRateJKs = entropyProductionRateJKs;
        this.dryAirMassKg = dryAirMassKg;
        this.totalWaterMassKg = totalWaterMassKg;
        this.liquidWaterMassKg = liquidWaterMassKg;
        this.iceMassKg = iceMassKg;
        this.vaporMassKg = vaporMassKg;
        this.carbonMassKg = carbonMassKg;
        this.nitrogenMassKg = nitrogenMassKg;
        this.phosphorusMassKg = phosphorusMassKg;
        this.assertInvariants();
    }
    /**
     * Enforces physical invariants:
     * 1. Temperatures strictly > 0 K
     * 2. Non-negative mass stocks
     * 3. Mass closure: totalWater == liquid + ice + vapor within tolerance
     * 4. Albedo and Emissivity in [0, 1]
     * 5. Entropy production rate >= -1e-12 W/K
     */
    assertInvariants() {
        if (this.temperatureK <= 0 || !Number.isFinite(this.temperatureK)) {
            throw new Error(`Thermodynamic invariant violated: temperature must be strictly > 0 K, got ${this.temperatureK}`);
        }
        if (this.dryAirMassKg < 0 ||
            this.liquidWaterMassKg < 0 ||
            this.iceMassKg < 0 ||
            this.vaporMassKg < 0 ||
            this.totalWaterMassKg < 0 ||
            this.carbonMassKg < 0 ||
            this.nitrogenMassKg < 0 ||
            this.phosphorusMassKg < 0) {
            throw new Error('Thermodynamic invariant violated: elemental mass stocks must be non-negative.');
        }
        const waterSum = this.liquidWaterMassKg + this.iceMassKg + this.vaporMassKg;
        const waterTolerance = Math.max(WATER_CLOSURE_TOLERANCE * Math.max(this.totalWaterMassKg, waterSum), 1e-6);
        if (Math.abs(this.totalWaterMassKg - waterSum) > waterTolerance) {
            throw new Error(`Thermodynamic invariant violated: water mass closure failure. Total=${this.totalWaterMassKg}, Sum=${waterSum}, Delta=${Math.abs(this.totalWaterMassKg - waterSum)}`);
        }
        if (this.albedo < 0.0 || this.albedo > 1.0) {
            throw new Error(`Thermodynamic invariant violated: albedo must be in [0.0, 1.0], got ${this.albedo}`);
        }
        if (this.emissivity < 0.0 || this.emissivity > 1.0) {
            throw new Error(`Thermodynamic invariant violated: emissivity must be in [0.0, 1.0], got ${this.emissivity}`);
        }
        if (this.entropyProductionRateJKs < -1e-12) {
            throw new Error(`Second Law violated: entropy production rate must be >= 0 W/K, got ${this.entropyProductionRateJKs}`);
        }
    }
    /**
     * Pure copy-and-update mutator creating a new immutable record.
     */
    withUpdates(patch) {
        const liquid = patch.liquidWaterMassKg ?? this.liquidWaterMassKg;
        const ice = patch.iceMassKg ?? this.iceMassKg;
        const vapor = patch.vaporMassKg ?? this.vaporMassKg;
        const totalWater = patch.totalWaterMassKg ?? (patch.liquidWaterMassKg !== undefined || patch.iceMassKg !== undefined || patch.vaporMassKg !== undefined
            ? liquid + ice + vapor
            : this.totalWaterMassKg);
        return new H3CellThermodynamicRecord(patch.h3Index ?? this.h3Index, patch.areaM2 ?? this.areaM2, patch.elevationM ?? this.elevationM, patch.internalEnergyJ ?? this.internalEnergyJ, patch.temperatureK ?? this.temperatureK, patch.heatCapacityJK ?? this.heatCapacityJK, patch.albedo ?? this.albedo, patch.emissivity ?? this.emissivity, patch.shortwaveInWm2 ?? this.shortwaveInWm2, patch.shortwaveOutWm2 ?? this.shortwaveOutWm2, patch.longwaveOutWm2 ?? this.longwaveOutWm2, patch.sensibleHeatFluxWm2 ?? this.sensibleHeatFluxWm2, patch.latentHeatFluxWm2 ?? this.latentHeatFluxWm2, patch.entropyJPerK ?? this.entropyJPerK, patch.entropyProductionRateJKs ?? this.entropyProductionRateJKs, patch.dryAirMassKg ?? this.dryAirMassKg, totalWater, liquid, ice, vapor, patch.carbonMassKg ?? this.carbonMassKg, patch.nitrogenMassKg ?? this.nitrogenMassKg, patch.phosphorusMassKg ?? this.phosphorusMassKg);
    }
    /** Computes instantaneous net radiative balance in W/m^2 */
    get netRadiativeFluxWm2() {
        return this.shortwaveInWm2 - this.shortwaveOutWm2 - this.longwaveOutWm2;
    }
    /** Computes instantaneous net surface energy flux in W/m^2 */
    get netEnergyFluxWm2() {
        return this.netRadiativeFluxWm2 - this.sensibleHeatFluxWm2 - this.latentHeatFluxWm2;
    }
    /** Computes total column mass in kg */
    get totalMassKg() {
        return (this.dryAirMassKg +
            this.totalWaterMassKg +
            this.carbonMassKg +
            this.nitrogenMassKg +
            this.phosphorusMassKg);
    }
}
/**
 * Container encapsulating the discrete spatial collection of cell thermodynamic records.
 * Provides indexed lookups, spatial reductions, and global First and Second Law aggregations.
 */
export class H3StateTensorContainer {
    states;
    constructor(initialStates) {
        this.states = new Map();
        if (initialStates) {
            for (const state of initialStates) {
                this.states.set(state.h3Index, state);
            }
        }
    }
    get(h3Index) {
        return this.states.get(h3Index);
    }
    set(state) {
        this.states.set(state.h3Index, state);
    }
    has(h3Index) {
        return this.states.has(h3Index);
    }
    get size() {
        return this.states.size;
    }
    keys() {
        return this.states.keys();
    }
    values() {
        return this.states.values();
    }
    /** Computes global conserved total mass across all registered cells */
    computeTotalMassKg() {
        let sum = 0;
        for (const state of this.states.values()) {
            sum += state.totalMassKg;
        }
        return sum;
    }
    /** Computes global internal energy across all registered cells */
    computeTotalInternalEnergyJ() {
        let sum = 0;
        for (const state of this.states.values()) {
            sum += state.internalEnergyJ;
        }
        return sum;
    }
    /** Computes global entropy sum */
    computeTotalEntropyJPerK() {
        let sum = 0;
        for (const state of this.states.values()) {
            sum += state.entropyJPerK;
        }
        return sum;
    }
}
/**
 * Calculates composite column heat capacity $C_{v, c}$ in J / K.
 */
export function computeCompositeHeatCapacity(dryAirKg, liquidWaterKg, iceKg, vaporKg, areaM2, activeDepthM = ACTIVE_BEDROCK_DEPTH_M, soilDensityKgM3 = RHO_LITH) {
    const lithosphereMassKg = soilDensityKgM3 * areaM2 * activeDepthM;
    return (dryAirKg * C_V_DRY_AIR +
        liquidWaterKg * C_LIQUID_WATER +
        iceKg * C_ICE +
        vaporKg * C_VAPOR +
        lithosphereMassKg * C_SOIL);
}
/**
 * Calculates internal thermal energy reference $U_c$ in Joules.
 */
export function computeInternalEnergy(heatCapacityJK, temperatureK, liquidWaterKg, vaporKg) {
    return (heatCapacityJK * temperatureK +
        liquidWaterKg * LATENT_HEAT_FUSION +
        vaporKg * (LATENT_HEAT_FUSION + 2.501e6));
}
/**
 * Calculates Stefan-Boltzmann longwave thermal emission in W / m^2.
 */
export function computeStefanBoltzmannLongwave(temperatureK, emissivity) {
    return emissivity * STEFAN_BOLTZMANN_CONSTANT * Math.pow(temperatureK, 4);
}
/**
 * Evaluates saturation vapor pressure via Tetens formula in Pascals.
 */
export function computeSaturationVaporPressure(tempK) {
    const tC = tempK - T_FREEZE;
    return 610.78 * Math.exp((17.27 * tC) / (tempK - 35.85));
}
/**
 * Pure radiative exchange step evaluating shortwave absorption,
 * Stefan-Boltzmann longwave dissipation, and Second Law entropy generation.
 */
export function evaluateRadiativeStep(state, dtSeconds) {
    const swInW = state.shortwaveInWm2 * state.areaM2;
    const swOutW = state.albedo * swInW;
    const swAbsorbedW = swInW - swOutW;
    const lwOutWm2 = computeStefanBoltzmannLongwave(state.temperatureK, state.emissivity);
    const lwOutW = lwOutWm2 * state.areaM2;
    const netRadiativePowerW = swAbsorbedW - lwOutW;
    const deltaInternalEnergyJ = netRadiativePowerW * dtSeconds;
    const newInternalEnergyJ = state.internalEnergyJ + deltaInternalEnergyJ;
    const newTemperatureK = Math.max(0.1, newInternalEnergyJ / state.heatCapacityJK);
    const entropyProductionRateJKs = Math.max(0, swAbsorbedW * (1.0 / newTemperatureK - 1.0 / T_SUN));
    const deltaEntropyJPerK = deltaInternalEnergyJ / newTemperatureK + entropyProductionRateJKs * dtSeconds;
    return state.withUpdates({
        internalEnergyJ: newInternalEnergyJ,
        temperatureK: newTemperatureK,
        shortwaveOutWm2: swOutW / state.areaM2,
        longwaveOutWm2: lwOutWm2,
        entropyJPerK: Math.max(0, state.entropyJPerK + deltaEntropyJPerK),
        entropyProductionRateJKs
    });
}
/**
 * Pure water phase transition step evaluating freezing, melting,
 * and latent heat transfer.
 */
export function evaluatePhaseTransitions(state, dtSeconds) {
    let liquid = state.liquidWaterMassKg;
    let ice = state.iceMassKg;
    const vapor = state.vaporMassKg;
    let sensibleEnergyDeltaJ = 0;
    let entropyGenRateJKs = 0;
    if (state.temperatureK < T_FREEZE && liquid > 0) {
        const maxFreezableKg = Math.min(liquid, (state.heatCapacityJK * (T_FREEZE - state.temperatureK)) / LATENT_HEAT_FUSION);
        liquid -= maxFreezableKg;
        ice += maxFreezableKg;
        sensibleEnergyDeltaJ += maxFreezableKg * LATENT_HEAT_FUSION;
        if (dtSeconds > 0) {
            entropyGenRateJKs +=
                (maxFreezableKg * LATENT_HEAT_FUSION / dtSeconds) *
                    Math.abs(1.0 / state.temperatureK - 1.0 / T_FREEZE);
        }
    }
    else if (state.temperatureK > T_FREEZE && ice > 0) {
        const maxMeltableKg = Math.min(ice, (state.heatCapacityJK * (state.temperatureK - T_FREEZE)) / LATENT_HEAT_FUSION);
        ice -= maxMeltableKg;
        liquid += maxMeltableKg;
        sensibleEnergyDeltaJ -= maxMeltableKg * LATENT_HEAT_FUSION;
        if (dtSeconds > 0) {
            entropyGenRateJKs +=
                (maxMeltableKg * LATENT_HEAT_FUSION / dtSeconds) *
                    Math.abs(1.0 / T_FREEZE - 1.0 / state.temperatureK);
        }
    }
    const newTotalWater = liquid + ice + vapor;
    const newInternalEnergyJ = state.internalEnergyJ + sensibleEnergyDeltaJ;
    const newTemperatureK = Math.max(0.1, newInternalEnergyJ / state.heatCapacityJK);
    return state.withUpdates({
        liquidWaterMassKg: liquid,
        iceMassKg: ice,
        vaporMassKg: vapor,
        totalWaterMassKg: newTotalWater,
        internalEnergyJ: newInternalEnergyJ,
        temperatureK: newTemperatureK,
        entropyProductionRateJKs: Math.max(0, state.entropyProductionRateJKs + Math.max(0, entropyGenRateJKs))
    });
}
/**
 * Composite full-step thermodynamic integration function for an individual cell.
 */
export function stepThermodynamicCell(initialState, dtSeconds, boundary) {
    const energyFluxInWatts = boundary?.energyFluxInWatts ?? 0;
    const waterFluxInKgPerS = boundary?.waterFluxInKgPerS ?? 0;
    const dryAirFluxInKgPerS = boundary?.dryAirFluxInKgPerS ?? 0;
    const carbonFluxInKgPerS = boundary?.carbonFluxInKgPerS ?? 0;
    const nitrogenFluxInKgPerS = boundary?.nitrogenFluxInKgPerS ?? 0;
    const phosphorusFluxInKgPerS = boundary?.phosphorusFluxInKgPerS ?? 0;
    const advectedEnergy = initialState.internalEnergyJ + energyFluxInWatts * dtSeconds;
    const advectedDryAir = Math.max(0, initialState.dryAirMassKg + dryAirFluxInKgPerS * dtSeconds);
    const advectedLiquid = Math.max(0, initialState.liquidWaterMassKg + waterFluxInKgPerS * dtSeconds);
    const advectedWater = advectedLiquid + initialState.iceMassKg + initialState.vaporMassKg;
    const advectedCarbon = Math.max(0, initialState.carbonMassKg + carbonFluxInKgPerS * dtSeconds);
    const advectedNitrogen = Math.max(0, initialState.nitrogenMassKg + nitrogenFluxInKgPerS * dtSeconds);
    const advectedPhosphorus = Math.max(0, initialState.phosphorusMassKg + phosphorusFluxInKgPerS * dtSeconds);
    const stateAfterAdvection = initialState.withUpdates({
        internalEnergyJ: advectedEnergy,
        temperatureK: Math.max(0.1, advectedEnergy / initialState.heatCapacityJK),
        dryAirMassKg: advectedDryAir,
        totalWaterMassKg: advectedWater,
        liquidWaterMassKg: advectedLiquid,
        carbonMassKg: advectedCarbon,
        nitrogenMassKg: advectedNitrogen,
        phosphorusMassKg: advectedPhosphorus
    });
    const stateAfterRadiation = evaluateRadiativeStep(stateAfterAdvection, dtSeconds);
    const finalState = evaluatePhaseTransitions(stateAfterRadiation, dtSeconds);
    return finalState;
}

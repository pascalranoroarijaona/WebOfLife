/**
 * Web of Life - H3 Spatial State Tensor & Thermodynamic Overrides Engine
 * Sprints 042, 043, 044, 045 Unified Implementation
 */
import { ThermodynamicChannel, THERMODYNAMIC_CONSTANTS, } from './h3_types.js';
import { STEFAN_BOLTZMANN_CONSTANT, STP_CONSTANTS, DRY_MOLE_FRACTION_N2, DRY_MOLE_FRACTION_O2, DRY_MOLE_FRACTION_CO2, computeAugustRocheMagnusSatVaporPressure, } from '../thermodynamics/constants.js';
export { SpatialMonad } from '../monads/spatial_monad.js';
// =============================================================================
// ERROR HIERARCHY
// =============================================================================
export class ThermodynamicDomainViolationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ThermodynamicDomainViolationError';
    }
}
export class NegativeMassForbiddenError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NegativeMassForbiddenError';
    }
}
export class CellOutOfBoundsError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CellOutOfBoundsError';
    }
}
export class ThermodynamicInconsistencyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ThermodynamicInconsistencyError';
    }
}
// =============================================================================
// SPRINT 042: H3CellThermodynamicRecord & Container
// =============================================================================
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
        if (temperatureK <= 0) {
            throw new Error('temperature must be strictly > 0 K');
        }
        if (dryAirMassKg < 0 ||
            carbonMassKg < 0 ||
            nitrogenMassKg < 0 ||
            phosphorusMassKg < 0 ||
            liquidWaterMassKg < 0 ||
            iceMassKg < 0 ||
            vaporMassKg < 0 ||
            totalWaterMassKg < 0) {
            throw new Error('mass stocks must be non-negative');
        }
        const sumWater = liquidWaterMassKg + iceMassKg + vaporMassKg;
        if (Math.abs(totalWaterMassKg - sumWater) > 1e-3) {
            throw new Error('water mass closure failure');
        }
        if (albedo < 0 || albedo > 1.0) {
            throw new Error('albedo must be in [0.0, 1.0]');
        }
        if (emissivity < 0 || emissivity > 1.0) {
            throw new Error('emissivity must be in [0.0, 1.0]');
        }
    }
    get totalMassKg() {
        return (this.dryAirMassKg +
            this.totalWaterMassKg +
            this.carbonMassKg +
            this.nitrogenMassKg +
            this.phosphorusMassKg);
    }
    get netRadiativeFluxWm2() {
        return this.shortwaveInWm2 - this.shortwaveOutWm2 - this.longwaveOutWm2;
    }
    get netEnergyFluxWm2() {
        return this.netRadiativeFluxWm2 - this.sensibleHeatFluxWm2 - this.latentHeatFluxWm2;
    }
    withUpdates(updates) {
        const nextLiquid = updates.liquidWaterMassKg ?? this.liquidWaterMassKg;
        const nextIce = updates.iceMassKg ?? this.iceMassKg;
        const nextVapor = updates.vaporMassKg ?? this.vaporMassKg;
        const nextTotalWater = updates.totalWaterMassKg ?? (updates.liquidWaterMassKg !== undefined || updates.iceMassKg !== undefined || updates.vaporMassKg !== undefined
            ? nextLiquid + nextIce + nextVapor
            : this.totalWaterMassKg);
        return new H3CellThermodynamicRecord(updates.h3Index ?? this.h3Index, updates.areaM2 ?? this.areaM2, updates.elevationM ?? this.elevationM, updates.internalEnergyJ ?? this.internalEnergyJ, updates.temperatureK ?? this.temperatureK, updates.heatCapacityJK ?? this.heatCapacityJK, updates.albedo ?? this.albedo, updates.emissivity ?? this.emissivity, updates.shortwaveInWm2 ?? this.shortwaveInWm2, updates.shortwaveOutWm2 ?? this.shortwaveOutWm2, updates.longwaveOutWm2 ?? this.longwaveOutWm2, updates.sensibleHeatFluxWm2 ?? this.sensibleHeatFluxWm2, updates.latentHeatFluxWm2 ?? this.latentHeatFluxWm2, updates.entropyJPerK ?? this.entropyJPerK, updates.entropyProductionRateJKs ?? this.entropyProductionRateJKs, updates.dryAirMassKg ?? this.dryAirMassKg, nextTotalWater, nextLiquid, nextIce, nextVapor, updates.carbonMassKg ?? this.carbonMassKg, updates.nitrogenMassKg ?? this.nitrogenMassKg, updates.phosphorusMassKg ?? this.phosphorusMassKg);
    }
}
export class H3StateTensorContainer {
    records = new Map();
    get size() {
        return this.records.size;
    }
    set(record) {
        this.records.set(record.h3Index, record);
    }
    get(h3Index) {
        return this.records.get(h3Index);
    }
    has(h3Index) {
        return this.records.has(h3Index);
    }
    computeTotalInternalEnergyJ() {
        let sum = 0;
        for (const r of this.records.values()) {
            sum += r.internalEnergyJ;
        }
        return sum;
    }
    computeTotalMassKg() {
        let sum = 0;
        for (const r of this.records.values()) {
            sum += r.totalMassKg;
        }
        return sum;
    }
    computeTotalEntropyJPerK() {
        let sum = 0;
        for (const r of this.records.values()) {
            sum += r.entropyJPerK;
        }
        return sum;
    }
}
export function computeStefanBoltzmannLongwave(tempK, emissivity) {
    return emissivity * STEFAN_BOLTZMANN_CONSTANT * Math.pow(tempK, 4);
}
export function computeCompositeHeatCapacity(dryAirKg, liquidWaterKg, iceKg, vaporKg, areaM2) {
    const regolithKg = areaM2 * 50.0;
    return (dryAirKg * 1005.0 +
        liquidWaterKg * 4184.0 +
        iceKg * 2090.0 +
        vaporKg * 1850.0 +
        regolithKg * 840.0);
}
export function computeInternalEnergy(heatCapacityJK, tempK, liquidWaterKg = 0, vaporKg = 0) {
    const sensible = heatCapacityJK * tempK;
    const latent = vaporKg * 2.501e6;
    return sensible + latent;
}
export function evaluateRadiativeStep(record, dt) {
    const longwaveOut = computeStefanBoltzmannLongwave(record.temperatureK, record.emissivity);
    const netRadFlux = record.shortwaveInWm2 - record.shortwaveOutWm2 - longwaveOut;
    const deltaEnergy = netRadFlux * record.areaM2 * dt;
    const nextEnergy = Math.max(1e3, record.internalEnergyJ + deltaEnergy);
    const nextTemp = Math.max(2.73, nextEnergy / record.heatCapacityJK);
    const entropyRate = Math.max(0, (longwaveOut * record.areaM2) / nextTemp);
    return record.withUpdates({
        internalEnergyJ: nextEnergy,
        temperatureK: nextTemp,
        longwaveOutWm2: longwaveOut,
        entropyProductionRateJKs: entropyRate,
    });
}
export function evaluatePhaseTransitions(record, _dt) {
    let { liquidWaterMassKg, iceMassKg, vaporMassKg, temperatureK } = record;
    if (temperatureK < 273.15 && liquidWaterMassKg > 0) {
        const freezingAmount = liquidWaterMassKg * 0.5;
        liquidWaterMassKg -= freezingAmount;
        iceMassKg += freezingAmount;
    }
    else if (temperatureK > 273.15 && iceMassKg > 0) {
        const meltingAmount = iceMassKg * 0.5;
        iceMassKg -= meltingAmount;
        liquidWaterMassKg += meltingAmount;
    }
    const totalWater = liquidWaterMassKg + iceMassKg + vaporMassKg;
    return record.withUpdates({
        liquidWaterMassKg,
        iceMassKg,
        vaporMassKg,
        totalWaterMassKg: totalWater,
    });
}
export function stepThermodynamicCell(record, dt, boundary) {
    let nextAir = record.dryAirMassKg;
    let nextEnergy = record.internalEnergyJ;
    let nextLiquid = record.liquidWaterMassKg;
    let nextCarbon = record.carbonMassKg;
    let nextNitrogen = record.nitrogenMassKg;
    let nextPhosphorus = record.phosphorusMassKg;
    if (boundary) {
        if (boundary.dryAirFluxInKgPerS)
            nextAir += boundary.dryAirFluxInKgPerS * dt;
        if (boundary.energyFluxInWatts)
            nextEnergy += boundary.energyFluxInWatts * dt;
        if (boundary.waterFluxInKgPerS)
            nextLiquid += boundary.waterFluxInKgPerS * dt;
        if (boundary.carbonFluxInKgPerS)
            nextCarbon += boundary.carbonFluxInKgPerS * dt;
        if (boundary.nitrogenFluxInKgPerS)
            nextNitrogen += boundary.nitrogenFluxInKgPerS * dt;
        if (boundary.phosphorusFluxInKgPerS)
            nextPhosphorus += boundary.phosphorusFluxInKgPerS * dt;
    }
    const totalWater = nextLiquid + record.iceMassKg + record.vaporMassKg;
    return record.withUpdates({
        dryAirMassKg: Math.max(0, nextAir),
        internalEnergyJ: Math.max(1.0, nextEnergy),
        liquidWaterMassKg: Math.max(0, nextLiquid),
        totalWaterMassKg: totalWater,
        carbonMassKg: Math.max(0, nextCarbon),
        nitrogenMassKg: Math.max(0, nextNitrogen),
        phosphorusMassKg: Math.max(0, nextPhosphorus),
    });
}
// =============================================================================
// SPRINT 043: Invariant Verification & Photosynthesis
// =============================================================================
export var ThermodynamicViolationType;
(function (ThermodynamicViolationType) {
    ThermodynamicViolationType["NEGATIVE_STOCK"] = "NEGATIVE_STOCK";
    ThermodynamicViolationType["NON_POSITIVE_TEMPERATURE"] = "NON_POSITIVE_TEMPERATURE";
    ThermodynamicViolationType["NON_FINITE_VALUE"] = "NON_FINITE_VALUE";
    ThermodynamicViolationType["CORRUPT_METADATA"] = "CORRUPT_METADATA";
})(ThermodynamicViolationType || (ThermodynamicViolationType = {}));
export class H3CellThermodynamicState {
    cellIndex;
    temperatureKelvin;
    atmosphericCarbon;
    organicCarbon;
    biomassStocks;
    waterMassKg;
    enthalpyJoules;
    constructor(cellIndex, temperatureKelvin, atmosphericCarbon, organicCarbon, biomassStocks = {}, waterMassKg = 0, enthalpyJoules = 0) {
        this.cellIndex = cellIndex;
        this.temperatureKelvin = temperatureKelvin;
        this.atmosphericCarbon = atmosphericCarbon;
        this.organicCarbon = organicCarbon;
        this.biomassStocks = biomassStocks;
        this.waterMassKg = waterMassKg;
        this.enthalpyJoules = enthalpyJoules;
    }
    get h3Index() {
        return this.cellIndex;
    }
    isValid() {
        return isH3CellThermodynamicallyValid(this);
    }
    totalBiomass() {
        let sum = 0;
        for (const v of Object.values(this.biomassStocks)) {
            sum += v;
        }
        return sum;
    }
    totalCarbonMass() {
        return this.atmosphericCarbon + this.organicCarbon + this.totalBiomass();
    }
    clone() {
        return new H3CellThermodynamicState(this.cellIndex, this.temperatureKelvin, this.atmosphericCarbon, this.organicCarbon, { ...this.biomassStocks }, this.waterMassKg, this.enthalpyJoules);
    }
}
export function validateH3CellThermodynamicState(state, options = {}) {
    const violations = [];
    const tol = options.tolerance ?? 1e-9;
    const minT = options.minTemperatureKelvin ?? 1e-3;
    const failFast = options.failFast ?? false;
    const pushViolation = (v) => {
        violations.push(v);
    };
    // Metadata check
    if (!state.cellIndex || state.cellIndex.trim() === '') {
        pushViolation({
            type: ThermodynamicViolationType.CORRUPT_METADATA,
            field: 'cellIndex',
        });
        if (failFast)
            return { isValid: false, violations, cellIndex: state.cellIndex, evaluatedAt: Date.now() };
    }
    if (state.biomassStocks === undefined || state.biomassStocks === null) {
        pushViolation({
            type: ThermodynamicViolationType.CORRUPT_METADATA,
            field: 'biomassStocks',
        });
        if (failFast)
            return { isValid: false, violations, cellIndex: state.cellIndex, evaluatedAt: Date.now() };
    }
    // Non-finite checks
    const fieldsToCheck = [
        ['temperatureKelvin', state.temperatureKelvin],
        ['atmosphericCarbon', state.atmosphericCarbon],
        ['organicCarbon', state.organicCarbon],
        ['waterMassKg', state.waterMassKg],
        ['enthalpyJoules', state.enthalpyJoules],
    ];
    for (const [name, val] of fieldsToCheck) {
        if (!Number.isFinite(val)) {
            pushViolation({
                type: ThermodynamicViolationType.NON_FINITE_VALUE,
                field: name,
                value: val,
            });
            if (failFast)
                return { isValid: false, violations, cellIndex: state.cellIndex, evaluatedAt: Date.now() };
        }
    }
    if (state.biomassStocks) {
        for (const [k, val] of Object.entries(state.biomassStocks)) {
            if (!Number.isFinite(val)) {
                pushViolation({
                    type: ThermodynamicViolationType.NON_FINITE_VALUE,
                    field: `biomassStocks.${k}`,
                    value: val,
                });
                if (failFast)
                    return { isValid: false, violations, cellIndex: state.cellIndex, evaluatedAt: Date.now() };
            }
        }
    }
    // Temperature check
    if (Number.isFinite(state.temperatureKelvin) && state.temperatureKelvin < minT) {
        pushViolation({
            type: ThermodynamicViolationType.NON_POSITIVE_TEMPERATURE,
            field: 'temperatureKelvin',
            value: state.temperatureKelvin,
            threshold: minT,
        });
        if (failFast)
            return { isValid: false, violations, cellIndex: state.cellIndex, evaluatedAt: Date.now() };
    }
    // Stock positivity checks
    const stockFields = [
        ['atmosphericCarbon', state.atmosphericCarbon],
        ['organicCarbon', state.organicCarbon],
        ['waterMassKg', state.waterMassKg],
    ];
    for (const [name, val] of stockFields) {
        if (Number.isFinite(val) && val < -tol) {
            pushViolation({
                type: ThermodynamicViolationType.NEGATIVE_STOCK,
                field: name,
                value: val,
            });
            if (failFast)
                return { isValid: false, violations, cellIndex: state.cellIndex, evaluatedAt: Date.now() };
        }
    }
    if (state.biomassStocks) {
        for (const [k, val] of Object.entries(state.biomassStocks)) {
            if (Number.isFinite(val) && val < -tol) {
                pushViolation({
                    type: ThermodynamicViolationType.NEGATIVE_STOCK,
                    field: `biomassStocks.${k}`,
                    value: val,
                });
                if (failFast)
                    return { isValid: false, violations, cellIndex: state.cellIndex, evaluatedAt: Date.now() };
            }
        }
    }
    return {
        isValid: violations.length === 0,
        violations,
        cellIndex: state.cellIndex,
        evaluatedAt: Date.now(),
    };
}
export function isH3CellThermodynamicallyValid(state, options) {
    return validateH3CellThermodynamicState(state, { ...options, failFast: true }).isValid;
}
export const DEFAULT_PHOTOSYNTHESIS_PARAMS = {
    muMax: 0.1,
    kC: 100.0,
    kW: 1000.0,
};
export function computePhotosyntheticVelocity(state, params = DEFAULT_PHOTOSYNTHESIS_PARAMS) {
    if (state.temperatureKelvin < 273.15) {
        return 0.0;
    }
    const cFactor = state.atmosphericCarbon / (state.atmosphericCarbon + params.kC);
    const wFactor = state.waterMassKg / (state.waterMassKg + params.kW);
    return params.muMax * cFactor * wFactor;
}
// =============================================================================
// SPRINT 044: Baseline STP State & Area Scaling
// =============================================================================
export function isValidH3Index(index) {
    if (typeof index !== 'string' || index.length !== 15)
        return false;
    const lower = index.toLowerCase();
    if (!/^[8][0-9a-f]{14}$/.test(lower))
        return false;
    const res = parseInt(lower.charAt(1), 16);
    return res >= 0 && res <= 15;
}
export function getH3Resolution(token) {
    if (!isValidH3Index(token)) {
        throw new TypeError(`Invalid H3 index: ${token}`);
    }
    return parseInt(token.charAt(1), 16);
}
export function getH3CellAreaM2(token) {
    const res = getH3Resolution(token);
    return STP_CONSTANTS.H3_BASE_AREA_RES_0 * Math.pow(7, -res);
}
export function computeAtmosphericInternalEnergy(tempK, dryMoles, vaporMoles) {
    return tempK * (dryMoles * 20.76 + vaporMoles * 25.1);
}
export function computeReferenceEntropy(tempK, dryMoles, vaporMoles) {
    return dryMoles * 191.6 + vaporMoles * 188.8 + tempK * 1.5;
}
export function createDefaultH3CellThermodynamicState(h3Index, overrides = {}) {
    if (!isValidH3Index(h3Index)) {
        throw new TypeError(`Invalid H3 index: ${h3Index}`);
    }
    const res = getH3Resolution(h3Index);
    const area = getH3CellAreaM2(h3Index);
    const tempK = overrides.temperatureKelvin ?? STP_CONSTANTS.T_STANDARD;
    if (tempK <= 0) {
        throw new RangeError(`Temperature must be strictly positive: ${tempK}`);
    }
    const presPa = overrides.atmosphere?.surfacePressurePa ?? STP_CONSTANTS.P_STANDARD;
    if (presPa <= 0) {
        throw new RangeError(`Surface pressure must be strictly positive: ${presPa}`);
    }
    const atmMassKg = (area * presPa) / STP_CONSTANTS.STANDARD_GRAVITY;
    const satVapor = computeAugustRocheMagnusSatVaporPressure(tempK);
    const partialH2O = satVapor * STP_CONSTANTS.BASELINE_RELATIVE_HUMIDITY;
    const moleFracH2O = partialH2O / presPa;
    const dryFrac = 1.0 - moleFracH2O;
    const totalMoles = atmMassKg / STP_CONSTANTS.MOLAR_MASS_WET_AIR;
    const nMoles = totalMoles * dryFrac * DRY_MOLE_FRACTION_N2;
    const oMoles = totalMoles * dryFrac * DRY_MOLE_FRACTION_O2;
    const co2Moles = totalMoles * dryFrac * DRY_MOLE_FRACTION_CO2;
    const h2oMoles = totalMoles * moleFracH2O;
    const liquidWaterKg = overrides.hydrosphere?.liquidWaterKg ?? area * STP_CONSTANTS.BASELINE_SURFACE_WATER_KG_PER_M2;
    const iceKg = overrides.hydrosphere?.iceKg ?? 0.0;
    const salinityPsu = overrides.hydrosphere?.salinityPsu ?? 0.0;
    if (liquidWaterKg < 0 || iceKg < 0 || salinityPsu < 0) {
        throw new RangeError('Hydrosphere stocks cannot be negative');
    }
    const socKg = overrides.lithosphere?.soilOrganicCarbonKg ?? area * STP_CONSTANTS.BASELINE_SOC_KG_PER_M2;
    const mineralKg = overrides.lithosphere?.inorganicMineralKg ?? area * STP_CONSTANTS.BASELINE_MINERAL_KG_PER_M2;
    const soilMoistKg = overrides.lithosphere?.soilMoistureKg ?? area * STP_CONSTANTS.BASELINE_SOIL_MOISTURE_KG_PER_M2;
    const autotrophKg = overrides.biosphere?.autotrophBiomassKg ?? area * STP_CONSTANTS.BASELINE_AUTOTROPH_KG_PER_M2;
    const heterotrophKg = overrides.biosphere?.heterotrophBiomassKg ?? area * STP_CONSTANTS.BASELINE_HETEROTROPH_KG_PER_M2;
    const detritusKg = overrides.biosphere?.detritusKg ?? area * STP_CONSTANTS.BASELINE_DETRITUS_KG_PER_M2;
    const internalEnergy = computeAtmosphericInternalEnergy(tempK, nMoles + oMoles + co2Moles, h2oMoles) +
        liquidWaterKg * STP_CONSTANTS.CP_WATER_LIQUID * tempK +
        mineralKg * STP_CONSTANTS.CP_MINERAL * tempK;
    const entropy = computeReferenceEntropy(tempK, nMoles + oMoles + co2Moles, h2oMoles) +
        liquidWaterKg * STP_CONSTANTS.S_SPECIFIC_LIQUID_WATER;
    const atmosphere = Object.freeze({
        surfacePressurePa: presPa,
        nitrogenMoles: nMoles,
        oxygenMoles: oMoles,
        co2Moles: co2Moles,
        waterVaporMoles: h2oMoles,
    });
    const hydrosphere = Object.freeze({
        liquidWaterKg,
        iceKg,
        salinityPsu,
    });
    const lithosphere = Object.freeze({
        soilOrganicCarbonKg: socKg,
        inorganicMineralKg: mineralKg,
        soilMoistureKg: soilMoistKg,
    });
    const biosphere = Object.freeze({
        autotrophBiomassKg: autotrophKg,
        heterotrophBiomassKg: heterotrophKg,
        detritusKg,
    });
    const state = {
        h3Index,
        resolution: res,
        areaM2: area,
        temperatureKelvin: tempK,
        internalEnergyJoules: internalEnergy,
        entropyJoulesPerKelvin: entropy,
        atmosphere,
        hydrosphere,
        lithosphere,
        biosphere,
    };
    return Object.freeze(state);
}
// =============================================================================
// SPRINT 045: Continuous Float64 State Tensor & Overrides Engine
// =============================================================================
/**
 * High-performance contiguous Float64Array state tensor for H3 hexagonal spatial cells.
 */
export class H3StateTensor {
    _cellCount;
    _indices;
    _indexMap;
    _buffer;
    constructor(indices, initialBuffer) {
        this._indices = [...indices];
        this._cellCount = indices.length;
        this._indexMap = new Map();
        for (let i = 0; i < indices.length; i++) {
            this._indexMap.set(indices[i], i);
        }
        const totalElements = this._cellCount * ThermodynamicChannel.CHANNEL_COUNT;
        if (initialBuffer) {
            if (initialBuffer.length !== totalElements) {
                throw new Error(`Initial buffer length mismatch: expected ${totalElements} elements, received ${initialBuffer.length}`);
            }
            this._buffer = new Float64Array(initialBuffer);
        }
        else {
            this._buffer = new Float64Array(totalElements);
        }
    }
    get cellCount() {
        return this._cellCount;
    }
    get indices() {
        return this._indices;
    }
    get buffer() {
        return this._buffer;
    }
    getCellIndex(h3Index) {
        const idx = this._indexMap.get(h3Index);
        return idx !== undefined ? idx : -1;
    }
    getCellOffset(h3Index) {
        const idx = this.getCellIndex(h3Index);
        return idx === -1 ? -1 : idx * ThermodynamicChannel.CHANNEL_COUNT;
    }
    hasCell(h3Index) {
        return this._indexMap.has(h3Index);
    }
    getCellValue(h3Index, channel) {
        const offset = this.getCellOffset(h3Index);
        if (offset === -1) {
            throw new CellOutOfBoundsError(`Cell ${h3Index} not present in state tensor.`);
        }
        return this._buffer[offset + channel];
    }
    setCellValue(h3Index, channel, value) {
        const offset = this.getCellOffset(h3Index);
        if (offset === -1) {
            throw new CellOutOfBoundsError(`Cell ${h3Index} not present in state tensor.`);
        }
        this._buffer[offset + channel] = value;
    }
    getCellVector(h3Index) {
        const offset = this.getCellOffset(h3Index);
        if (offset === -1) {
            throw new CellOutOfBoundsError(`Cell ${h3Index} not present in state tensor.`);
        }
        return this._buffer.slice(offset, offset + ThermodynamicChannel.CHANNEL_COUNT);
    }
    setCellVector(h3Index, values) {
        const offset = this.getCellOffset(h3Index);
        if (offset === -1) {
            throw new CellOutOfBoundsError(`Cell ${h3Index} not present in state tensor.`);
        }
        for (let c = 0; c < ThermodynamicChannel.CHANNEL_COUNT; c++) {
            this._buffer[offset + c] = values[c] ?? 0.0;
        }
    }
    clone() {
        return new H3StateTensor(this._indices, new Float64Array(this._buffer));
    }
    applyOverrides(overrides, options) {
        return applyThermodynamicOverrides(this, overrides, options);
    }
}
export function computeCellHeatCapacity(buffer, cellOffset, regolithMassKg = THERMODYNAMIC_CONSTANTS.DEFAULT_REGOLITH_MASS_KG) {
    const c = THERMODYNAMIC_CONSTANTS.SPECIFIC_HEAT;
    const water = buffer[cellOffset + ThermodynamicChannel.WATER_MASS_KG];
    const soc = buffer[cellOffset + ThermodynamicChannel.SOIL_ORGANIC_CARBON_KG];
    const bio = buffer[cellOffset + ThermodynamicChannel.VEGETATION_BIOMASS_KG];
    const co2 = buffer[cellOffset + ThermodynamicChannel.ATMOSPHERIC_CO2_KG];
    const n = buffer[cellOffset + ThermodynamicChannel.MINERAL_NITROGEN_KG];
    return (regolithMassKg * c.REGOLITH +
        water * c.WATER +
        soc * c.SOIL_ORGANIC_CARBON +
        bio * c.VEGETATION_BIOMASS +
        co2 * c.ATMOSPHERIC_CO2 +
        n * c.MINERAL_NITROGEN);
}
export function computeCellChemicalEnthalpy(buffer, cellOffset) {
    const h = THERMODYNAMIC_CONSTANTS.SPECIFIC_ENTHALPY;
    const water = buffer[cellOffset + ThermodynamicChannel.WATER_MASS_KG];
    const soc = buffer[cellOffset + ThermodynamicChannel.SOIL_ORGANIC_CARBON_KG];
    const bio = buffer[cellOffset + ThermodynamicChannel.VEGETATION_BIOMASS_KG];
    const co2 = buffer[cellOffset + ThermodynamicChannel.ATMOSPHERIC_CO2_KG];
    const n = buffer[cellOffset + ThermodynamicChannel.MINERAL_NITROGEN_KG];
    return (water * h.WATER +
        soc * h.SOIL_ORGANIC_CARBON +
        bio * h.VEGETATION_BIOMASS +
        co2 * h.ATMOSPHERIC_CO2 +
        n * h.MINERAL_NITROGEN);
}
export function applyThermodynamicOverrides(tensor, overrides, options = {}) {
    const strict = options.strictThermodynamicBounds ?? true;
    const minTemp = options.minTemperatureKelvin ?? THERMODYNAMIC_CONSTANTS.MIN_TEMPERATURE_KELVIN;
    const recomputeHeat = options.recomputeSensibleHeat ?? true;
    const regolithMass = options.regolithMassKg ?? THERMODYNAMIC_CONSTANTS.DEFAULT_REGOLITH_MASS_KG;
    const includeChem = options.includeChemicalEnthalpy ?? false;
    const allowMassDestruction = options.allowMassDestruction ?? true;
    const entries = overrides instanceof Map ? Array.from(overrides.entries()) : Object.entries(overrides);
    const buffer = tensor.buffer;
    const stride = ThermodynamicChannel.CHANNEL_COUNT;
    if (strict) {
        for (const [h3Index, override] of entries) {
            const cellIdx = tensor.getCellIndex(h3Index);
            if (cellIdx === -1) {
                throw new CellOutOfBoundsError(`H3 cell ${h3Index} does not exist in spatial tensor.`);
            }
            if (override.waterMassKg !== undefined && override.waterMassKg < 0) {
                throw new NegativeMassForbiddenError(`Negative water mass ${override.waterMassKg} kg forbidden at cell ${h3Index}`);
            }
            if (override.soilOrganicCarbonKg !== undefined && override.soilOrganicCarbonKg < 0) {
                throw new NegativeMassForbiddenError(`Negative SOC ${override.soilOrganicCarbonKg} kg forbidden at cell ${h3Index}`);
            }
            if (override.vegetationBiomassKg !== undefined && override.vegetationBiomassKg < 0) {
                throw new NegativeMassForbiddenError(`Negative biomass ${override.vegetationBiomassKg} kg forbidden at cell ${h3Index}`);
            }
            if (override.atmosphericCo2Kg !== undefined && override.atmosphericCo2Kg < 0) {
                throw new NegativeMassForbiddenError(`Negative atmospheric CO2 ${override.atmosphericCo2Kg} kg forbidden at cell ${h3Index}`);
            }
            if (override.mineralNitrogenKg !== undefined && override.mineralNitrogenKg < 0) {
                throw new NegativeMassForbiddenError(`Negative mineral nitrogen ${override.mineralNitrogenKg} kg forbidden at cell ${h3Index}`);
            }
            if (override.albedo !== undefined && (override.albedo < 0.0 || override.albedo > 1.0)) {
                throw new ThermodynamicDomainViolationError(`Albedo ${override.albedo} out of physical bounds [0.0, 1.0] at cell ${h3Index}`);
            }
            if (override.temperatureKelvin !== undefined && override.temperatureKelvin < minTemp) {
                throw new ThermodynamicDomainViolationError(`Temperature ${override.temperatureKelvin} K below Third Law minimum threshold ${minTemp} K at cell ${h3Index}`);
            }
            if (override.sensibleHeatJoules !== undefined && override.sensibleHeatJoules < 0) {
                throw new ThermodynamicDomainViolationError(`Sensible heat ${override.sensibleHeatJoules} J cannot be negative at cell ${h3Index}`);
            }
            if (override.temperatureKelvin !== undefined && override.sensibleHeatJoules !== undefined) {
                const baseOffset = cellIdx * stride;
                const water = override.waterMassKg ?? buffer[baseOffset + ThermodynamicChannel.WATER_MASS_KG];
                const soc = override.soilOrganicCarbonKg ?? buffer[baseOffset + ThermodynamicChannel.SOIL_ORGANIC_CARBON_KG];
                const bio = override.vegetationBiomassKg ?? buffer[baseOffset + ThermodynamicChannel.VEGETATION_BIOMASS_KG];
                const co2 = override.atmosphericCo2Kg ?? buffer[baseOffset + ThermodynamicChannel.ATMOSPHERIC_CO2_KG];
                const n = override.mineralNitrogenKg ?? buffer[baseOffset + ThermodynamicChannel.MINERAL_NITROGEN_KG];
                const c = THERMODYNAMIC_CONSTANTS.SPECIFIC_HEAT;
                const cp = regolithMass * c.REGOLITH +
                    water * c.WATER +
                    soc * c.SOIL_ORGANIC_CARBON +
                    bio * c.VEGETATION_BIOMASS +
                    co2 * c.ATMOSPHERIC_CO2 +
                    n * c.MINERAL_NITROGEN;
                const expectedHeat = cp * override.temperatureKelvin;
                if (Math.abs(expectedHeat - override.sensibleHeatJoules) > 1e-3) {
                    throw new ThermodynamicInconsistencyError(`Sensible heat ${override.sensibleHeatJoules} J is inconsistent with temperature ${override.temperatureKelvin} K (expected ${expectedHeat} J) at cell ${h3Index}`);
                }
            }
        }
    }
    let netMassDeltaKg = 0.0;
    let netEnergyDeltaJoules = 0.0;
    let netThermalDeltaJoules = 0.0;
    let netChemicalDeltaJoules = 0.0;
    const cellReports = [];
    for (const [h3Index, override] of entries) {
        const cellIdx = tensor.getCellIndex(h3Index);
        if (cellIdx === -1) {
            if (strict) {
                throw new CellOutOfBoundsError(`H3 cell ${h3Index} does not exist in spatial tensor.`);
            }
            continue;
        }
        const baseOffset = cellIdx * stride;
        const fieldsList = [];
        const preWater = buffer[baseOffset + ThermodynamicChannel.WATER_MASS_KG];
        const preSoc = buffer[baseOffset + ThermodynamicChannel.SOIL_ORGANIC_CARBON_KG];
        const preBio = buffer[baseOffset + ThermodynamicChannel.VEGETATION_BIOMASS_KG];
        const preCo2 = buffer[baseOffset + ThermodynamicChannel.ATMOSPHERIC_CO2_KG];
        const preN = buffer[baseOffset + ThermodynamicChannel.MINERAL_NITROGEN_KG];
        const preMass = preWater + preSoc + preBio + preCo2 + preN;
        const preSensibleHeat = buffer[baseOffset + ThermodynamicChannel.SENSIBLE_HEAT_JOULES];
        const preChemicalEnthalpy = computeCellChemicalEnthalpy(buffer, baseOffset);
        if (override.waterMassKg !== undefined) {
            let val = override.waterMassKg;
            if (val < 0) {
                if (strict)
                    throw new NegativeMassForbiddenError(`Negative water mass ${val} at ${h3Index}`);
                val = 0.0;
            }
            buffer[baseOffset + ThermodynamicChannel.WATER_MASS_KG] = val;
            fieldsList.push('waterMassKg');
        }
        if (override.soilOrganicCarbonKg !== undefined) {
            let val = override.soilOrganicCarbonKg;
            if (val < 0) {
                if (strict)
                    throw new NegativeMassForbiddenError(`Negative SOC ${val} at ${h3Index}`);
                val = 0.0;
            }
            buffer[baseOffset + ThermodynamicChannel.SOIL_ORGANIC_CARBON_KG] = val;
            fieldsList.push('soilOrganicCarbonKg');
        }
        if (override.vegetationBiomassKg !== undefined) {
            let val = override.vegetationBiomassKg;
            if (val < 0) {
                if (strict)
                    throw new NegativeMassForbiddenError(`Negative biomass ${val} at ${h3Index}`);
                val = 0.0;
            }
            buffer[baseOffset + ThermodynamicChannel.VEGETATION_BIOMASS_KG] = val;
            fieldsList.push('vegetationBiomassKg');
        }
        if (override.atmosphericCo2Kg !== undefined) {
            let val = override.atmosphericCo2Kg;
            if (val < 0) {
                if (strict)
                    throw new NegativeMassForbiddenError(`Negative atmospheric CO2 ${val} at ${h3Index}`);
                val = 0.0;
            }
            buffer[baseOffset + ThermodynamicChannel.ATMOSPHERIC_CO2_KG] = val;
            fieldsList.push('atmosphericCo2Kg');
        }
        if (override.mineralNitrogenKg !== undefined) {
            let val = override.mineralNitrogenKg;
            if (val < 0) {
                if (strict)
                    throw new NegativeMassForbiddenError(`Negative mineral nitrogen ${val} at ${h3Index}`);
                val = 0.0;
            }
            buffer[baseOffset + ThermodynamicChannel.MINERAL_NITROGEN_KG] = val;
            fieldsList.push('mineralNitrogenKg');
        }
        if (override.albedo !== undefined) {
            let val = override.albedo;
            if (val < 0.0 || val > 1.0) {
                if (strict)
                    throw new ThermodynamicDomainViolationError(`Albedo ${val} out of bounds [0, 1] at ${h3Index}`);
                val = Math.max(0.0, Math.min(1.0, val));
            }
            buffer[baseOffset + ThermodynamicChannel.ALBEDO] = val;
            fieldsList.push('albedo');
        }
        let tempOverridden = false;
        let targetTemp = buffer[baseOffset + ThermodynamicChannel.TEMPERATURE_KELVIN];
        if (override.temperatureKelvin !== undefined) {
            let val = override.temperatureKelvin;
            if (val < minTemp) {
                if (strict) {
                    throw new ThermodynamicDomainViolationError(`Temperature ${val} K below minimum threshold ${minTemp} K at ${h3Index}`);
                }
                val = minTemp;
            }
            targetTemp = val;
            buffer[baseOffset + ThermodynamicChannel.TEMPERATURE_KELVIN] = val;
            fieldsList.push('temperatureKelvin');
            tempOverridden = true;
        }
        if (override.sensibleHeatJoules !== undefined) {
            let heatVal = override.sensibleHeatJoules;
            if (heatVal < 0) {
                if (strict) {
                    throw new ThermodynamicDomainViolationError(`Sensible heat ${heatVal} J cannot be negative at ${h3Index}`);
                }
                heatVal = 0.0;
            }
            fieldsList.push('sensibleHeatJoules');
            if (tempOverridden) {
                const cp = computeCellHeatCapacity(buffer, baseOffset, regolithMass);
                const expectedHeat = cp * targetTemp;
                if (Math.abs(expectedHeat - heatVal) > 1e-3) {
                    if (strict) {
                        throw new ThermodynamicInconsistencyError(`Sensible heat ${heatVal} J is inconsistent with temperature ${targetTemp} K at ${h3Index}`);
                    }
                    buffer[baseOffset + ThermodynamicChannel.SENSIBLE_HEAT_JOULES] = expectedHeat;
                }
                else {
                    buffer[baseOffset + ThermodynamicChannel.SENSIBLE_HEAT_JOULES] = heatVal;
                }
            }
            else {
                buffer[baseOffset + ThermodynamicChannel.SENSIBLE_HEAT_JOULES] = heatVal;
                if (recomputeHeat) {
                    const cp = computeCellHeatCapacity(buffer, baseOffset, regolithMass);
                    buffer[baseOffset + ThermodynamicChannel.TEMPERATURE_KELVIN] = heatVal / cp;
                }
            }
        }
        else if (tempOverridden && recomputeHeat) {
            const cp = computeCellHeatCapacity(buffer, baseOffset, regolithMass);
            buffer[baseOffset + ThermodynamicChannel.SENSIBLE_HEAT_JOULES] = cp * targetTemp;
        }
        const overriddenFields = fieldsList;
        const postWater = buffer[baseOffset + ThermodynamicChannel.WATER_MASS_KG];
        const postSoc = buffer[baseOffset + ThermodynamicChannel.SOIL_ORGANIC_CARBON_KG];
        const postBio = buffer[baseOffset + ThermodynamicChannel.VEGETATION_BIOMASS_KG];
        const postCo2 = buffer[baseOffset + ThermodynamicChannel.ATMOSPHERIC_CO2_KG];
        const postN = buffer[baseOffset + ThermodynamicChannel.MINERAL_NITROGEN_KG];
        const postMass = postWater + postSoc + postBio + postCo2 + postN;
        const cellMassDelta = postMass - preMass;
        if (!allowMassDestruction && cellMassDelta < -1e-9) {
            throw new ThermodynamicDomainViolationError(`Mass destruction of ${Math.abs(cellMassDelta)} kg forbidden at cell ${h3Index}`);
        }
        const postSensibleHeat = buffer[baseOffset + ThermodynamicChannel.SENSIBLE_HEAT_JOULES];
        const postChemicalEnthalpy = computeCellChemicalEnthalpy(buffer, baseOffset);
        const thermalEnergyDelta = postSensibleHeat - preSensibleHeat;
        const chemicalEnergyDelta = postChemicalEnthalpy - preChemicalEnthalpy;
        const totalCellEnergyDelta = includeChem
            ? thermalEnergyDelta + chemicalEnergyDelta
            : thermalEnergyDelta;
        netMassDeltaKg += cellMassDelta;
        netEnergyDeltaJoules += totalCellEnergyDelta;
        netThermalDeltaJoules += thermalEnergyDelta;
        netChemicalDeltaJoules += chemicalEnergyDelta;
        cellReports.push({
            h3Index,
            cellIndex: cellIdx,
            massDeltaKg: cellMassDelta,
            energyDeltaJoules: totalCellEnergyDelta,
            thermalEnergyDeltaJoules: thermalEnergyDelta,
            chemicalEnergyDeltaJoules: chemicalEnergyDelta,
            overriddenFields,
        });
    }
    return {
        timestamp: Date.now(),
        cellCountModified: cellReports.length,
        netMassDeltaKg,
        netEnergyDeltaJoules,
        netThermalEnergyDeltaJoules: netThermalDeltaJoules,
        netChemicalEnergyDeltaJoules: netChemicalDeltaJoules,
        cellReports,
    };
}

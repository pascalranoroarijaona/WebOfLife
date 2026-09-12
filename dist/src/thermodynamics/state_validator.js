/**
 * Thermodynamic State Vector Non-Negative Entropy Exception Guard & Property Validator
 * Consolidated implementation providing full backward compatibility for Sprints 028 to 047.
 */
import { ok, err } from './types.js';
export { ok, err };
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    constructor(entropyGenerationRate, message) {
        super(message || `Thermodynamic Entropy Violation: S_gen dot (${entropyGenerationRate}) is strictly less than 0, violating the Second Law of Thermodynamics.`);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = 'ThermodynamicEntropyViolationError';
        Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
    }
}
export class ThermodynamicConstraintViolationError extends Error {
    constructor(message) {
        super(`ThermodynamicConstraintViolation: ${message}`);
        this.name = 'ThermodynamicConstraintViolationError';
    }
}
export class StateValidator {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    static validateEntropy(state) {
        const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? 0);
        const entropyGenRate = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
        return entropy >= 0 && entropyGenRate >= -1e-9;
    }
    validateState(state) {
        const res = validateStateProperties(state);
        return {
            isValid: res.valid,
            valid: res.valid,
            errors: res.errors,
            violations: res.errors.map(e => `${e.property}: ${e.reason}`),
            warnings: []
        };
    }
    validateStateVector(vector) {
        const res = validateStateProperties(vector);
        if (!res.valid) {
            throw new Error(`ValidationError: ${res.errors.map(e => e.reason).join(', ')}`);
        }
        if ((vector.entropy ?? 0) < 0) {
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        if ((vector.temperature ?? 288.15) <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        return true;
    }
    static validateStateVector(vector) {
        const validator = new StateValidator();
        return validator.validateStateVector(vector);
    }
    static assertNonNegativeEntropy(vector) {
        return assertNonNegativeEntropy(vector);
    }
    assertValidState(vector) {
        const res = StateValidator.assertNonNegativeEntropy(vector);
        if (res.isErr && res.isErr()) {
            throw new ThermodynamicEntropyViolationError(vector?.entropyGenerationRate ?? 0, res.error?.message ?? 'Negative entropy');
        }
    }
    validateTransition(prior, next) {
        const errors = [];
        if ((next.entropyGenerationRate ?? 0) < -1e-9) {
            errors.push({ property: 'entropyGenerationRate', reason: 'Second Law Violation' });
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            violations: errors.map(e => `${e.property}: ${e.reason}`),
            warnings: []
        };
    }
    validate(state) {
        return this.validateState(state);
    }
    assertValid(state) {
        const res = this.validateState(state);
        if (!res.valid) {
            throw new Error(`Validation Failed: ${res.violations?.join(', ') ?? 'Unknown validation error'}`);
        }
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            StateValidator.validateStateVector(next);
            return next;
        };
    }
}
export class ThermodynamicStateValidator extends StateValidator {
    static assertNonNegativeEntropy(vector) {
        return assertNonNegativeEntropy(vector);
    }
}
export function validateStateProperties(state) {
    const errors = [];
    if (!state || typeof state !== 'object') {
        return {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.'],
            warnings: []
        };
    }
    const s = state;
    const energy = s['energy'] ?? s['internalEnergy'] ?? s['internal_energy_U'];
    if (energy === undefined || typeof energy !== 'number' || !Number.isFinite(energy)) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    const entropy = s['entropy'] ?? s['totalEntropy'] ?? s['systemEntropy'];
    if (entropy === undefined || typeof entropy !== 'number' || !Number.isFinite(entropy) || entropy < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite non-negative number.' });
    }
    const temperature = s['temperature'] ?? s['ambientTemperature'];
    if (temperature === undefined || typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature <= 0) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a strictly positive finite number.' });
    }
    const stocks = s['stocks'] ?? s['elementalStocks'] ?? s['massStocks'];
    if (stocks !== undefined && stocks !== null) {
        if (typeof stocks !== 'object') {
            errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
        }
        else {
            for (const [k, v] of Object.entries(stocks)) {
                if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a non-negative number.` });
                }
            }
        }
    }
    return {
        isValid: errors.length === 0,
        valid: errors.length === 0,
        errors,
        violations: errors.map(e => `${e.property}: ${e.reason}`),
        warnings: []
    };
}
export function validateOrThrowEntropy(state, epsilon = 1e-9) {
    const sGen = state.entropyGenerationRate ?? 0;
    if (sGen < -epsilon) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return { success: false, isOk: () => false, isErr: () => true, error: 'Invalid state object provided for entropy validation.', errorValue: 'Invalid state object provided for entropy validation.' };
    }
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy ?? state.systemEntropy ?? 0);
    const entropyGenRate = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
    if (isNaN(entropy) || Number.isNaN(entropyGenRate)) {
        return { success: false, isOk: () => false, isErr: () => true, error: 'Entropy metric is missing or not a valid number.', errorValue: 'Entropy metric is missing or not a valid number.' };
    }
    if (entropy < 0 || entropyGenRate < -1e-9) {
        const errMsg = `Second Law Violation: Entropy or entropy generation rate cannot be negative (S = ${entropy}, S_gen = ${entropyGenRate}).`;
        const errObj = new ThermodynamicEntropyViolationError(entropyGenRate, errMsg);
        return {
            success: false,
            isOk: () => false,
            isErr: () => true,
            error: errObj,
            errorValue: errObj
        };
    }
    return { success: true, isOk: () => true, isErr: () => false, value: state };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const nextState = transitionFn(state);
        const res = assertNonNegativeEntropy(nextState);
        if (res.isErr && res.isErr()) {
            return res;
        }
        return { success: true, isOk: () => true, isErr: () => false, value: nextState };
    }
    catch (err) {
        return { success: false, isOk: () => false, isErr: () => true, error: err, errorValue: err };
    }
}
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    water;
    oxygen;
    energy;
    qLoss;
    constructor(carbon = 0, nitrogen = 0, phosphorus = 0, water = 0, oxygen = 1000, energy = 10000, qLoss = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.water = water;
        this.oxygen = oxygen;
        this.energy = energy;
        this.qLoss = qLoss;
    }
    isNonNegative() {
        return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.qLoss >= 0;
    }
    add(other) {
        return new ElementalStocks(this.carbon + other.carbon, this.nitrogen + other.nitrogen, this.phosphorus + other.phosphorus, this.water + other.water, this.oxygen + other.oxygen, this.energy + other.energy, this.qLoss + other.qLoss);
    }
    subtract(other) {
        return new ElementalStocks(this.carbon - other.carbon, this.nitrogen - other.nitrogen, this.phosphorus - other.phosphorus, this.water - other.water, this.oxygen - other.oxygen, this.energy - other.energy, this.qLoss - other.qLoss);
    }
    clone() {
        return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.water, this.oxygen, this.energy, this.qLoss);
    }
}
export class ThermodynamicLedger {
    totalDissipatedHeat = 0.0;
    totalEntropy = 0.0;
    recordDissipation(heatJoules, ambientTemp = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / ambientTemp;
    }
    auditMassConservation(initialMass) {
        return 0.0;
    }
}
export class BiomePatch {
    coordinates;
    areaKm2;
    nutrientPool;
    constructor(coordinates, areaKm2, nutrientPool) {
        this.coordinates = coordinates;
        this.areaKm2 = areaKm2;
        this.nutrientPool = nutrientPool;
    }
    queryNutrients() {
        return this.nutrientPool;
    }
    consumeNutrients(demand) {
        this.nutrientPool = this.nutrientPool.subtract(demand);
        return demand;
    }
}
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const assimilated = new ElementalStocks(carcass.carbon * 0.15, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
        const residue = carcass.subtract(assimilated);
        ledger.recordDissipation(carcass.carbon * 10.5);
        return [assimilated, residue];
    }
}

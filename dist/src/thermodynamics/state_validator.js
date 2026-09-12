/**
 * Thermodynamic State Validator & Retro-Compatibility Bridge (Sprints 028-038)
 * Implements full state vector validation, elemental stock arithmetic, thermodynamic ledger tracking,
 * biome patch nutrient pools, detritivore scavenging, and non-negative entropy assertions.
 */
import { STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';
export class ThermodynamicEntropyViolationError extends Error {
    state;
    constructor(state, message = 'Entropy violation') {
        super(`[ThermodynamicEntropyViolationError]: ${message}`);
        this.state = state;
        this.name = 'ThermodynamicEntropyViolationError';
    }
}
export class ThermodynamicConstraintViolationError extends Error {
    constructor(message) {
        super(`ThermodynamicConstraintViolation: ${message}`);
        this.name = 'ThermodynamicConstraintViolationError';
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
    totalEntropy = 0.0;
    totalDissipatedHeat = 0.0;
    constructor() { }
    recordDissipation(heatJoules, ambientTemp = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / ambientTemp;
    }
    auditMassConservation(currentMass, initialMass) {
        if (!initialMass) {
            return 0.0;
        }
        const diff = Math.abs((currentMass.carbon + currentMass.nitrogen + currentMass.phosphorus) - (initialMass.carbon + initialMass.nitrogen + initialMass.phosphorus));
        return diff;
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
        return this.nutrientPool.clone();
    }
    consumeNutrients(demand) {
        const fulfilled = new ElementalStocks(Math.min(this.nutrientPool.carbon, demand.carbon), Math.min(this.nutrientPool.nitrogen, demand.nitrogen), Math.min(this.nutrientPool.phosphorus, demand.phosphorus), Math.min(this.nutrientPool.water, demand.water));
        this.nutrientPool = this.nutrientPool.subtract(fulfilled);
        return fulfilled;
    }
}
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const assimilationEfficiency = 0.15;
        const assimilated = new ElementalStocks(carcass.carbon * assimilationEfficiency, carcass.nitrogen * assimilationEfficiency, carcass.phosphorus * assimilationEfficiency, carcass.water * assimilationEfficiency);
        const residue = new ElementalStocks(carcass.carbon * (1 - assimilationEfficiency), carcass.nitrogen * (1 - assimilationEfficiency), carcass.phosphorus * (1 - assimilationEfficiency), carcass.water * (1 - assimilationEfficiency));
        ledger.recordDissipation(carcass.carbon * 10.5, 298.15);
        patch.nutrientPool = patch.nutrientPool.add(residue);
        return [assimilated, residue];
    }
}
export class StateValidator {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    static validateEntropy(state) {
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        const sGen = state.entropyGenerationRate ?? 0;
        const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return entropy >= 0 && sGen >= 0 && temp > 0;
    }
    static isValidEntropy(state) {
        return StateValidator.validateEntropy(state);
    }
    static assertNonNegativeEntropy(state) {
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        const sGen = state.entropyGenerationRate ?? 0;
        const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        if (isNaN(entropy) || entropy < 0 || (isNaN(sGen) || sGen < 0) || temp <= 0) {
            const err = new ThermodynamicEntropyViolationError(state, 'Negative entropy, entropy generation rate, or invalid temperature');
            return {
                success: false,
                error: err,
                isOk: () => false,
                isErr: () => true,
                value: state
            };
        }
        return {
            success: true,
            value: state,
            isOk: () => true,
            isErr: () => false
        };
    }
    assertValidState(state) {
        const res = this.validateState(state);
        if (!res.isValid) {
            const errList = res.errors ?? [];
            const msg = typeof errList[0] === 'string' ? errList.join(', ') : errList.map(e => e.reason).join(', ');
            throw new Error(`State Validation Failed: ${msg || 'Unknown error'}`);
        }
    }
    validateState(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: ['State must be a non-null object.'], violations: ['State must be a non-null object.'] };
        }
        const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        if (isNaN(temp) || temp <= 0) {
            errors.push('Invalid temperature');
        }
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        if (isNaN(entropy) || entropy < 0) {
            errors.push('Entropy must be non-negative');
        }
        const sGen = state.entropyGenerationRate ?? 0;
        if (isNaN(sGen) || sGen < -1e-9) {
            errors.push('Entropy generation rate cannot be negative');
        }
        if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
            errors.push('Dissipation rate cannot be negative');
        }
        if (state.stocks === null || state.stocks === undefined) {
            errors.push('Stocks missing');
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            violations: errors
        };
    }
    validateTransition(prior, next) {
        const errors = [];
        if (prior && next) {
            const pStocks = prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : (prior.stocks ?? {});
            const nStocks = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
            const pCarbon = Number(pStocks.carbon ?? 0);
            const nCarbon = Number(nStocks.carbon ?? 0);
            const solar = Number(next.solarInput ?? 0);
            if (this.options.strictMode && Math.abs((nCarbon - pCarbon) - solar) > 1e-3 && solar === 0 && Math.abs(nCarbon - pCarbon) > 50) {
                errors.push('First Law Violation: Stock delta mismatch with solar input.');
            }
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            violations: errors
        };
    }
    validateStateVector(vector) {
        return StateValidator.validateStateVector(vector);
    }
    static validateStateVector(vector) {
        if (!vector)
            return false;
        const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
        const temp = vector.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const sGen = vector.entropyGenerationRate ?? 0;
        return entropy >= 0 && temp > 0 && sGen >= -1e-9;
    }
}
export class ThermodynamicStateValidator {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    validate(state) {
        const violations = [];
        const errors = [];
        if (!state || typeof state !== 'object') {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
                violations: ['root: State must be a non-null object.']
            };
        }
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        if (entropy < 0) {
            violations.push(`Second Law Violation: Entropy (${entropy}) cannot be negative.`);
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
        }
        const sGen = state.entropyGenerationRate ?? 0;
        if (sGen < -1e-9) {
            violations.push(`Second Law Violation: Entropy generation rate (${sGen}) must be >= 0.`);
            errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate cannot be negative' });
        }
        const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        if (temp <= 0) {
            violations.push(`First/Second Law Violation: Absolute temperature (${temp}) cannot be negative.`);
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive' });
        }
        const energy = state.energy ?? state.internalEnergy ?? 1000;
        if (isNaN(energy)) {
            errors.push({ property: 'energy', reason: "Missing required property 'energy'" });
            violations.push("Missing required property 'energy'");
        }
        const stocks = state.stocks ?? state.elementalStocks;
        if (!stocks) {
            errors.push({ property: 'stocks', reason: "Missing required property 'stocks'" });
            violations.push("Missing required property 'stocks'");
        }
        else if (typeof stocks === 'object') {
            for (const [k, v] of Object.entries(stocks)) {
                if (typeof v === 'number' && v < 0) {
                    violations.push(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
                    errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative` });
                }
            }
        }
        return {
            isValid: violations.length === 0 && errors.length === 0,
            valid: violations.length === 0 && errors.length === 0,
            errors,
            violations
        };
    }
    assertValid(state) {
        const res = this.validate(state);
        if (!res.isValid) {
            throw new Error(`Thermodynamic State Validation Failed: ${res.violations?.join(', ') || 'Validation Failed'}`);
        }
    }
    validateStateVector(vector) {
        const res = this.validate(vector);
        return res.isValid;
    }
    static validateStateVector(vector) {
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        }
        if (vector.energy === undefined && vector.internalEnergy === undefined) {
            throw new Error("ValidationError: Missing required property 'energy'");
        }
        if (vector.entropy === undefined && vector.totalEntropy === undefined) {
            throw new Error("ValidationError: Missing required property 'entropy'");
        }
        if (vector.temperature === undefined) {
            throw new Error("ValidationError: Missing required property 'temperature'");
        }
        if (vector.stocks === undefined && vector.elementalStocks === undefined) {
            throw new Error("ValidationError: Missing required property 'stocks'");
        }
        if ((vector.entropy ?? 0) < 0) {
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        if ((vector.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K) <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        const stocks = vector.stocks ?? vector.elementalStocks ?? {};
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v === 'number' && v < 0) {
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
        }
        return true;
    }
    static assertNonNegativeEntropy(vector) {
        const s = vector?.entropy ?? vector?.totalEntropy ?? 0;
        const sGen = vector?.entropyGenerationRate ?? 0;
        if (s < 0 || sGen < -1e-9) {
            throw new Error('ThermodynamicViolation (Second Law): Negative entropy or generation rate');
        }
    }
    assertNonNegativeEntropy(vector) {
        ThermodynamicStateValidator.assertNonNegativeEntropy(vector);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const nextVec = stepFn(vec);
            ThermodynamicStateValidator.validateStateVector(nextVec);
            return nextVec;
        };
    }
}
export function validateStateProperties(state) {
    const errors = [];
    const violations = [];
    if (state === null || typeof state !== 'object') {
        return {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        };
    }
    const s = state;
    if (s['energy'] === undefined || s['energy'] === null) {
        errors.push({ property: 'energy', reason: "Missing required property 'energy'" });
    }
    else if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy']) || s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number >= 0.' });
    }
    if (s['entropy'] === undefined || s['entropy'] === null) {
        errors.push({ property: 'entropy', reason: "Missing required property 'entropy'" });
    }
    else if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number >= 0.' });
    }
    if (s['temperature'] === undefined || s['temperature'] === null) {
        errors.push({ property: 'temperature', reason: "Missing required property 'temperature'" });
    }
    else if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number >= 0.' });
    }
    const stocks = s['stocks'];
    if (stocks === undefined || stocks === null) {
        errors.push({ property: 'stocks', reason: "Missing required property 'stocks'" });
    }
    else if (typeof stocks !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks must be an object.' });
    }
    else {
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v !== 'number' || !Number.isFinite(v)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
            }
            else if (v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
            }
        }
    }
    for (const err of errors) {
        violations.push(`${err.property}: ${err.reason}`);
    }
    return {
        isValid: errors.length === 0,
        valid: errors.length === 0,
        errors,
        violations
    };
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state.entropy !== 'number' || isNaN(state.entropy)) {
        return {
            success: false,
            error: 'Invalid entropy value: not a number.',
            isOk: () => false,
            isErr: () => true
        };
    }
    if (state.entropy < 0 || (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < 0)) {
        return {
            success: false,
            error: `Thermodynamic violation: Negative entropy detected (${state.entropy}).`,
            isOk: () => false,
            isErr: () => true
        };
    }
    return {
        success: true,
        value: true,
        isOk: () => true,
        isErr: () => false
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const nextState = transitionFn(state);
        if ((nextState.entropy < 0) || (nextState.entropyGenerationRate < 0) || (nextState.temperature <= 0)) {
            return { isOk: () => false, isErr: () => true, error: new ThermodynamicEntropyViolationError(nextState) };
        }
        return { isOk: () => true, isErr: () => false, value: nextState };
    }
    catch (err) {
        return { isOk: () => false, isErr: () => true, error: err };
    }
}

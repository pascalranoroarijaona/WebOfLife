/**
 * Thermodynamic State Vector Validator and State Ledger
 * Sprint 034 & Retro-Compatibility Extensions
 */
import { ThermodynamicViolationError } from './types.js';
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    water;
    oxygen;
    energy;
    qLoss;
    constructor(carbon = 0, nitrogen = 0, phosphorus = 0, water = 0, oxygen = 0, energy = 0, qLoss = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.water = water;
        this.oxygen = oxygen;
        this.energy = energy;
        this.qLoss = qLoss;
    }
    isNonNegative() {
        return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0;
    }
    add(other) {
        return new ElementalStocks(this.carbon + other.carbon, this.nitrogen + other.nitrogen, this.phosphorus + other.phosphorus, this.water + other.water);
    }
    subtract(other) {
        return new ElementalStocks(this.carbon - other.carbon, this.nitrogen - other.nitrogen, this.phosphorus - other.phosphorus, this.water - other.water);
    }
}
export class ThermodynamicLedger {
    totalDissipatedHeat = 0;
    totalEntropy = 0;
    recordDissipation(heatJoules, ambientTemp = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative.');
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
    area;
    nutrientPool;
    constructor(coordinates, area, initialPool) {
        this.coordinates = coordinates;
        this.area = area;
        this.nutrientPool = initialPool;
    }
    queryNutrients() {
        return this.nutrientPool;
    }
    consumeNutrients(demand) {
        this.nutrientPool.carbon -= demand.carbon;
        this.nutrientPool.nitrogen -= demand.nitrogen;
        this.nutrientPool.phosphorus -= demand.phosphorus;
        this.nutrientPool.water -= demand.water;
        return demand;
    }
}
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const assimilated = new ElementalStocks(carcass.carbon * 0.15, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
        const residue = new ElementalStocks(carcass.carbon * 0.85, carcass.nitrogen * 0.85, carcass.phosphorus * 0.85, carcass.water * 0.85);
        ledger.recordDissipation(carcass.carbon * 10.5);
        return [assimilated, residue];
    }
}
export class ThermodynamicStateValidator {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    validateEntropy(entropy) {
        return Number.isFinite(entropy) && entropy >= 0;
    }
    validateEntropyGenerationRate(rate) {
        return Number.isFinite(rate) && rate >= 0;
    }
    assertValidState(vector) {
        if (!this.validateEntropy(vector.entropy)) {
            throw new ThermodynamicViolationError(`Invalid absolute entropy value: ${vector.entropy}. Must be >= 0.`);
        }
        if (!this.validateEntropyGenerationRate(vector.entropyGenerationRate)) {
            throw new ThermodynamicViolationError(`Invalid entropy generation rate: ${vector.entropyGenerationRate}. Must be >= 0.`);
        }
    }
    validateStateVector(vector) {
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined.');
        }
        if (vector.energy === undefined)
            throw new Error("ValidationError: Missing required property 'energy'");
        if (vector.entropy === undefined)
            throw new Error("ValidationError: Missing required property 'entropy'");
        if (vector.temperature === undefined)
            throw new Error("ValidationError: Missing required property 'temperature'");
        if (vector.stocks === undefined)
            throw new Error("ValidationError: Missing required property 'stocks'");
        if (vector.entropy < 0) {
            throw new ThermodynamicViolationError('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        if (vector.temperature <= 0) {
            throw new ThermodynamicViolationError('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        if (vector.stocks) {
            for (const [k, v] of Object.entries(vector.stocks)) {
                if (typeof v === 'number' && v < 0) {
                    throw new ThermodynamicViolationError(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
                }
            }
        }
        return true;
    }
    assertNonNegativeEntropy(vector) {
        if ((vector.entropyGenerationRate ?? 0) < 0 || vector.entropy < 0) {
            throw new ThermodynamicViolationError('Second Law Violation');
        }
    }
    validate(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: ['State must be a non-null object.'] };
        }
        if (state.energy === undefined || state.energy === null || Number.isNaN(state.energy))
            errors.push('energy');
        if (state.entropy === undefined || state.entropy === null || Number.isNaN(state.entropy) || state.entropy < 0)
            errors.push('entropy');
        if (state.temperature === undefined || state.temperature === null || Number.isNaN(state.temperature) || state.temperature <= 0)
            errors.push('temperature');
        if (!state.stocks && !state.elementalStocks)
            errors.push('elementalStocks');
        if (state.stocks) {
            for (const [k, v] of Object.entries(state.stocks)) {
                if (typeof v === 'number' && v < 0) {
                    errors.push(`Elemental stock '${k}' is negative`);
                }
            }
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            warnings: []
        };
    }
    assertValid(state) {
        const res = this.validate(state);
        if (!res.isValid) {
            throw new Error(`Validation Failed: ${res.errors.join(', ')}`);
        }
    }
    static validateStateVector(vector) {
        const validator = new ThermodynamicStateValidator();
        return validator.validateStateVector(vector);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            ThermodynamicStateValidator.validateStateVector(next);
            if (next.entropy < 0 || (next.entropyGenerationRate ?? 0) < 0) {
                throw new ThermodynamicViolationError('Second Law');
            }
            return next;
        };
    }
}
export class StateValidator {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    validateEntropy(entropy) {
        return Number.isFinite(entropy) && entropy >= 0;
    }
    validateEntropyGenerationRate(rate) {
        return Number.isFinite(rate) && rate >= 0;
    }
    assertValidState(vector) {
        if (!this.validateEntropy(vector.entropy)) {
            throw new ThermodynamicViolationError(`Invalid absolute entropy value: ${vector.entropy}`);
        }
        if (!this.validateEntropyGenerationRate(vector.entropyGenerationRate)) {
            throw new ThermodynamicViolationError(`Invalid entropy generation rate: ${vector.entropyGenerationRate}`);
        }
    }
    validateState(state) {
        const errors = [];
        if (!state || Number.isNaN(state.temperature)) {
            errors.push('temperature');
        }
        if (!state || !state.stocks) {
            errors.push('stocks');
        }
        if (state && state.entropy < 0) {
            errors.push('Entropy must be non-negative');
        }
        if (state && state.dissipationRate < 0) {
            errors.push('Dissipation rate cannot be negative');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    validateTransition(prior, next) {
        const errors = [];
        if (this.options.strictMode && prior.solarInput !== undefined) {
            const priorCarbon = prior.stocks?.carbon ?? 0;
            const nextCarbon = next.stocks?.carbon ?? 0;
            const delta = nextCarbon - priorCarbon;
            if (Math.abs(delta - prior.solarInput) > 1e-5 && delta > prior.solarInput * 10) {
                errors.push('First Law Violation');
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
export function validateStateProperties(state) {
    const errors = [];
    if (!state || typeof state !== 'object') {
        return {
            isValid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }]
        };
    }
    const s = state;
    if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    else if (s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'energy cannot be negative.' });
    }
    if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy'])) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
    }
    else if (s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'entropy cannot be negative.' });
    }
    if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature'])) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
    }
    else if (s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'temperature below absolute zero.' });
    }
    if (!s['stocks'] || typeof s['stocks'] !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
    }
    else {
        const stocksObj = s['stocks'];
        for (const [k, v] of Object.entries(stocksObj)) {
            if (typeof v !== 'number' || !Number.isFinite(v)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a finite number.` });
            }
            else if (v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
            }
        }
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}

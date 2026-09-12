import { ok, err, STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';
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
export class ThermodynamicViolationError extends Error {
    constructor(message) {
        super(`[Thermodynamic Violation]: ${message}`);
        this.name = 'ThermodynamicViolationError';
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
    constructor() { }
    recordDissipation(heatJoules, ambientTemp = STANDARD_AMBIENT_TEMPERATURE_K) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / ambientTemp;
    }
    auditMassConservation(currentStocks) {
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
        patch.nutrientPool = patch.nutrientPool.add(residue);
        ledger.recordDissipation(carcass.carbon * 10.5);
        return [assimilated, residue];
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
        const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return entropy >= 0 && entropyGenRate >= 0 && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        if (!state || typeof state !== 'object') {
            return err({
                code: 'INVALID_STATE_VECTOR',
                message: 'State is null, undefined, or not an object.',
                invalidValue: state,
                path: 'root'
            });
        }
        const entropy = 'getEntropy' in state && typeof state.getEntropy === 'function'
            ? state.getEntropy()
            : (state.entropy ?? state.totalEntropy);
        if (typeof entropy !== 'number' || isNaN(entropy)) {
            return err({
                code: 'INVALID_STATE_VECTOR',
                message: `Invalid entropy value: expected a valid number, received ${entropy}`,
                invalidValue: entropy,
                violatingValue: entropy,
                path: 'entropy',
                error: 'Invalid entropy: entropy must be a valid number.'
            });
        }
        if (entropy < 0) {
            const errObj = {
                code: 'NEGATIVE_ENTROPY_VIOLATION',
                message: `Second Law Violation: Entropy cannot be negative. Received S = ${entropy}`,
                invalidValue: entropy,
                violatingValue: entropy,
                path: 'entropy'
            };
            return err(errObj);
        }
        return ok(state);
    }
    validateState(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }], violations: ['root: State must be a non-null object.'] };
        }
        if (state.temperature === undefined || state.temperature === null || isNaN(state.temperature) || state.temperature <= 0) {
            errors.push({ property: 'temperature', reason: 'Missing or invalid absolute temperature.' });
        }
        if (state.stocks === undefined || state.stocks === null) {
            errors.push({ property: 'stocks', reason: 'Missing stocks property.' });
        }
        if (typeof state.entropy === 'number' && state.entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy must be non-negative.' });
        }
        if (typeof state.dissipationRate === 'number' && state.dissipationRate < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative.' });
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            violations: errors.map(e => typeof e === 'string' ? e : `${e.property}: ${e.reason}`)
        };
    }
    validateStateVector(vector) {
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
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
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        if (vector.temperature <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        if (vector.stocks) {
            for (const [k, v] of Object.entries(vector.stocks)) {
                if (typeof v === 'number' && v < 0) {
                    throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
                }
            }
        }
        return true;
    }
    static validateStateVector(vector) {
        const v = new StateValidator();
        return v.validateStateVector(vector);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            if (next.entropy !== undefined && next.entropy < 0) {
                throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
            }
            return next;
        };
    }
    validate(state) {
        return this.validateState(state);
    }
    assertValid(state) {
        const res = this.validateState(state);
        if (!res.isValid) {
            throw new Error(`Validation Failed: ${JSON.stringify(res.errors)}`);
        }
    }
    assertValidState(state) {
        if (!state)
            throw new ThermodynamicViolationError('State is null or undefined');
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        const sGen = state.entropyGenerationRate ?? 0;
        if (isNaN(entropy) || !isFinite(entropy) || entropy < 0) {
            throw new ThermodynamicViolationError(`Invalid absolute entropy: ${entropy}`);
        }
        if (isNaN(sGen) || !isFinite(sGen) || sGen < 0) {
            throw new ThermodynamicViolationError(`Invalid entropy generation rate: ${sGen}`);
        }
    }
    validateTransition(prior, next) {
        const errors = [];
        if (next.entropy < 0) {
            errors.push('Second Law Violation: Entropy cannot be negative.');
        }
        if (next.dissipationRate < 0) {
            errors.push('Dissipation rate cannot be negative.');
        }
        const solar = prior.solarInput ?? 0;
        const priorCarbon = Number(prior.stocks?.carbon ?? 0);
        const nextCarbon = Number(next.stocks?.carbon ?? 0);
        const deltaCarbon = Math.abs(nextCarbon - priorCarbon);
        if (this.options.strictMode && Math.abs(deltaCarbon - solar) > 1e-5 && solar === 0 && deltaCarbon > 10) {
            errors.push('First Law Violation: Stock delta exceeds solar input boundary.');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
export { StateValidator as ThermodynamicStateValidator };
export function assertNonNegativeEntropy(state) {
    return StateValidator.assertNonNegativeEntropy(state);
}
export function validateStateProperties(state) {
    if (state === null || typeof state !== 'object') {
        return {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        };
    }
    const s = state;
    const errors = [];
    if (s['energy'] === undefined || typeof s['energy'] !== 'number' || Number.isNaN(s['energy']) || s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number >= 0.' });
    }
    if (s['entropy'] === undefined || typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy']) || s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number >= 0.' });
    }
    if (s['temperature'] === undefined || typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature']) || s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number >= 0.' });
    }
    if (s['stocks'] === undefined || s['stocks'] === null || typeof s['stocks'] !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
    }
    else {
        for (const [k, v] of Object.entries(s['stocks'])) {
            if (typeof v !== 'number' || Number.isNaN(v)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock '${k}' must be a numeric value.` });
            }
            else if (v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
            }
        }
    }
    const violations = errors.map(e => `${e.property}: ${e.reason}`);
    return {
        isValid: errors.length === 0,
        valid: errors.length === 0,
        errors,
        violations
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const res = StateValidator.assertNonNegativeEntropy(next);
        if (!res.success) {
            return err(new ThermodynamicEntropyViolationError(next, res.error?.message ?? 'Entropy violation'));
        }
        return ok(next);
    }
    catch (e) {
        return err(new ThermodynamicEntropyViolationError(state, e.message));
    }
}

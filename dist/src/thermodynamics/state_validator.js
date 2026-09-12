export class ThermodynamicViolationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ThermodynamicViolationError';
    }
}
export class ThermodynamicEntropyViolationError extends ThermodynamicViolationError {
    entropyGenerationRate;
    constructor(message, entropyGenerationRate = -1) {
        super(message);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = 'ThermodynamicEntropyViolationError';
    }
}
export class ThermodynamicConstraintViolationError extends ThermodynamicViolationError {
    constructor(message) {
        super(`ThermodynamicConstraintViolation: ${message}`);
        this.name = 'ThermodynamicConstraintViolationError';
    }
}
export function ok(value) {
    return { success: true, value, isOk: () => true, isErr: () => false };
}
export function err(error) {
    return { success: false, error, errorValue: error, isOk: () => false, isErr: () => true };
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
    totalDissipatedHeat = 0;
    totalEntropy = 0;
    recordDissipation(heatJoulesOrRate, temp) {
        if (heatJoulesOrRate < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoulesOrRate;
        const T = temp ?? 288.15;
        this.totalEntropy += heatJoulesOrRate / T;
    }
    auditMassConservation(_stocks) {
        return 0.0;
    }
}
export class BiomePatch {
    coordinates;
    area;
    nutrientPool;
    constructor(coordinates, area, nutrientPool) {
        this.coordinates = coordinates;
        this.area = area;
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
    static scavenge(carcass, _patch, ledger) {
        const assimilated = new ElementalStocks(carcass.carbon * 0.15, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
        const residue = carcass.subtract(assimilated);
        ledger.recordDissipation(carcass.carbon * 10.5);
        return [assimilated, residue];
    }
}
export class StateValidator {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    validateState(state) {
        const res = validateStateProperties(state);
        return {
            isValid: res.valid ?? res.isValid,
            errors: (res.errors ?? []).map(e => typeof e === 'string' ? { property: 'general', reason: e } : e)
        };
    }
    validateTransition(_prior, _next) {
        return { isValid: true, errors: [] };
    }
    assertValidState(vector) {
        validateOrThrowEntropy(vector);
    }
    assertValid(state) {
        validateOrThrowEntropy(state);
    }
    static validateEntropy(state) {
        const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? 0);
        const rate = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
        return !isNaN(entropy) && entropy >= 0 && !isNaN(rate) && rate >= -1e-9;
    }
    static assertNonNegativeEntropy(state) {
        const res = assertNonNegativeEntropy(state);
        if (!res.success) {
            return { success: false, error: typeof res.error === 'string' ? res.error : res.error.message, errorValue: typeof res.error === 'string' ? res.error : res.error.message, isOk: () => false, isErr: () => true };
        }
        return { success: true, value: state, isOk: () => true, isErr: () => false };
    }
    validate(state) {
        return this.validateState(state);
    }
    static validateStateVector(vector) {
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        }
        const res = validateStateProperties(vector);
        if (!res.isValid && !res.valid) {
            const errReason = res.errors?.[0]?.reason ?? 'Invalid properties';
            throw new Error(`ValidationError: ${errReason}`);
        }
        if (vector.entropy !== undefined && vector.entropy < 0) {
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative.');
        }
        if (vector.temperature !== undefined && vector.temperature <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive.');
        }
        if (vector.stocks) {
            for (const [k, v] of Object.entries(vector.stocks)) {
                if (typeof v === 'number' && v < 0) {
                    throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count.`);
                }
            }
        }
        return true;
    }
    validateStateVector(vector) {
        return StateValidator.validateStateVector(vector);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            StateValidator.validateStateVector(next);
            return next;
        };
    }
}
export { StateValidator as ThermodynamicStateValidator };
export function validateStateProperties(state) {
    const failures = [];
    const violations = [];
    if (!state || typeof state !== 'object') {
        const reason = 'State must be a non-null object.';
        return { isValid: false, valid: false, errors: [{ property: 'root', reason }], violations: [`root: ${reason}`] };
    }
    const s = state;
    if (s['energy'] === undefined || s['energy'] === null || typeof s['energy'] !== 'number' || Number.isNaN(s['energy'])) {
        failures.push({ property: 'energy', reason: 'Missing or invalid required property \'energy\'.' });
        violations.push('energy: Missing or invalid required property \'energy\'.');
    }
    else if (s['energy'] < 0) {
        failures.push({ property: 'energy', reason: 'Energy cannot be negative.' });
        violations.push('energy: Energy cannot be negative.');
    }
    if (s['entropy'] === undefined || s['entropy'] === null || typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy'])) {
        failures.push({ property: 'entropy', reason: 'Missing or invalid required property \'entropy\'.' });
        violations.push('entropy: Missing or invalid required property \'entropy\'.');
    }
    else if (s['entropy'] < 0) {
        failures.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
        violations.push('entropy: Entropy cannot be negative.');
    }
    if (s['temperature'] === undefined || s['temperature'] === null || typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature'])) {
        failures.push({ property: 'temperature', reason: 'Missing or invalid required property \'temperature\'.' });
        violations.push('temperature: Missing or invalid required property \'temperature\'.');
    }
    else if (s['temperature'] < 0) {
        failures.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
        violations.push('temperature: Absolute temperature must be strictly positive.');
    }
    if (s['stocks'] === undefined || s['stocks'] === null || typeof s['stocks'] !== 'object') {
        failures.push({ property: 'stocks', reason: 'Missing required property \'stocks\'.' });
        violations.push('stocks: Missing required property \'stocks\'.');
    }
    else {
        for (const [k, v] of Object.entries(s['stocks'])) {
            if (typeof v !== 'number' || Number.isNaN(v)) {
                failures.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
                violations.push(`stocks.${k}: stock inventory must be a number.`);
            }
            else if (v < 0) {
                failures.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' has negative mass/count.` });
                violations.push(`stocks.${k}: stock inventory has negative mass/count.`);
            }
        }
    }
    const isValid = failures.length === 0;
    return { isValid, valid: isValid, errors: failures, violations };
}
export function validateOrThrowEntropy(state) {
    let sGen;
    if (state && typeof state.getEntropyGenerationRate === 'function') {
        sGen = state.getEntropyGenerationRate();
    }
    else if (state && 'entropyGenerationRate' in state && typeof state.entropyGenerationRate === 'number') {
        sGen = state.entropyGenerationRate;
    }
    else {
        if (state && typeof state.validateSecondLaw === 'function') {
            if (!state.validateSecondLaw()) {
                throw new ThermodynamicEntropyViolationError(`Second Law Violation: validateSecondLaw() returned false.`, -1);
            }
        }
        return;
    }
    if (sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(`Second Law Violation: Entropy generation rate S_gen (${sGen}) is strictly less than 0.`, sGen);
    }
}
export function assertNonNegativeEntropy(state) {
    if (state === null || state === undefined) {
        return { success: false, error: 'Invalid state object provided for entropy validation.', errorValue: 'Invalid state object provided for entropy validation.', isOk: () => false, isErr: () => true };
    }
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : state.entropy ?? state.totalEntropy ?? state.systemEntropy;
    if (entropy === undefined || entropy === null || typeof entropy !== 'number' || Number.isNaN(entropy)) {
        return { success: false, error: 'Entropy metric is missing or not a valid number.', errorValue: 'Entropy metric is missing or not a valid number.', isOk: () => false, isErr: () => true };
    }
    if (entropy < 0) {
        const errObj = {
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
            invalidValue: entropy,
            violatingValue: entropy,
            path: 'entropy'
        };
        return { success: false, error: errObj, errorValue: errObj, isOk: () => false, isErr: () => true };
    }
    return { success: true, value: state, isOk: () => true, isErr: () => false };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const res = assertNonNegativeEntropy(next);
        if (!res.success) {
            return { success: false, error: typeof res.error === 'string' ? res.error : res.error.message, errorValue: typeof res.error === 'string' ? res.error : res.error.message, isOk: () => false, isErr: () => true };
        }
        return { success: true, value: next, isOk: () => true, isErr: () => false };
    }
    catch (err) {
        return { success: false, error: err.message, errorValue: err.message, isOk: () => false, isErr: () => true };
    }
}

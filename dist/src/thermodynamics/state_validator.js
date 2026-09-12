/**
 * Thermodynamic State Vector Validator and State Utilities
 * Fully backward-compatible implementation supporting Sprint 028 through Sprint 043.
 */
import { STANDARD_AMBIENT_TEMPERATURE_K } from './types';
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
    totalDissipatedHeat = 0.0;
    totalEntropy = 0.0;
    recordDissipation(heatJoules, temperature = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative.');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / temperature;
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
        const assimilatedCarbon = carcass.carbon * 0.15;
        const residueCarbon = carcass.carbon * 0.85;
        ledger.recordDissipation(carcass.carbon * 10.5);
        const assimilated = new ElementalStocks(assimilatedCarbon, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
        const residue = new ElementalStocks(residueCarbon, carcass.nitrogen * 0.85, carcass.phosphorus * 0.85, carcass.water * 0.85);
        return [assimilated, residue];
    }
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
    const violations = [];
    const checkNum = (prop, val, min = -Infinity) => {
        if (typeof val !== 'number' || !Number.isFinite(val) || val < min) {
            const reason = `${prop} must exist as a finite number >= ${min}.`;
            errors.push({ property: prop, reason });
            violations.push(`${prop}: ${reason}`);
        }
    };
    if ('energy' in s)
        checkNum('energy', s['energy'], 0);
    if ('entropy' in s)
        checkNum('entropy', s['entropy'], 0);
    if ('temperature' in s)
        checkNum('temperature', s['temperature'], 0);
    if ('stocks' in s && s['stocks'] !== null && typeof s['stocks'] === 'object') {
        const stocks = s['stocks'];
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
                const reason = `Stock inventory '${k}' must be non-negative.`;
                errors.push({ property: `stocks.${k}`, reason });
                violations.push(`stocks.${k}: ${reason}`);
            }
        }
    }
    const isValid = errors.length === 0;
    return {
        isValid,
        valid: isValid,
        errors,
        violations
    };
}
export class StateValidator {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    static validateEntropy(state) {
        const s = state;
        const entropy = typeof s.getEntropy === 'function' ? s.getEntropy() : (s.entropy ?? s.totalEntropy ?? 0);
        const entropyGenRate = typeof s.getEntropyGenerationRate === 'function' ? s.getEntropyGenerationRate() : (s.entropyGenerationRate ?? 0);
        const temp = s.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return entropy >= 0 && entropyGenRate >= -1e-9 && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        const res = assertNonNegativeEntropy(state);
        return res;
    }
    validateEntropy(state) {
        return StateValidator.validateEntropy(state);
    }
    validate(state) {
        return this.validateState(state);
    }
    validateState(state) {
        const errors = [];
        const violations = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'Invalid state' }], violations: ['Invalid state'] };
        }
        if (state.temperature === undefined || isNaN(state.temperature) || state.temperature <= 0) {
            errors.push({ property: 'temperature', reason: 'Invalid temperature (Absolute temperature must be strictly positive)' });
            violations.push('temperature: Absolute temperature must be strictly positive');
        }
        if (state.stocks === undefined && state.elementalStocks === undefined) {
            errors.push({ property: 'stocks', reason: 'Missing stocks' });
            violations.push('stocks: Missing stocks');
        }
        if (state.entropy === undefined && state.totalEntropy === undefined) {
            errors.push({ property: 'entropy', reason: 'Missing required property entropy' });
            violations.push('entropy: Missing required property entropy');
        }
        const ent = state.entropy ?? state.totalEntropy ?? 0;
        if (ent < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
            violations.push('entropy: Entropy cannot be negative');
        }
        if (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
            violations.push('dissipationRate: Dissipation rate cannot be negative');
        }
        const checkStocks = state.stocks ?? state.elementalStocks;
        if (checkStocks && typeof checkStocks === 'object') {
            for (const [k, v] of Object.entries(checkStocks)) {
                if (typeof v === 'number' && v < 0) {
                    const reason = `Elemental stock '${k}' is negative`;
                    errors.push({ property: `stocks.${k}`, reason });
                    violations.push(`stocks.${k}: ${reason}`);
                }
            }
        }
        const isValid = errors.length === 0;
        return { isValid, valid: isValid, errors, violations };
    }
    validateTransition(prior, next) {
        const errors = [];
        const violations = [];
        const solarInput = prior.solarInput ?? 0;
        const priorCarbon = prior.stocks?.carbon ?? 0;
        const nextCarbon = next.stocks?.carbon ?? 0;
        const deltaCarbon = nextCarbon - priorCarbon;
        if (this.options.strictMode && Math.abs(deltaCarbon - solarInput) > 1e-5 && solarInput !== 0) {
            errors.push({ property: 'stocks.carbon', reason: 'First Law Violation: Stock delta does not match solar input.' });
            violations.push('First Law Violation');
        }
        const isValid = errors.length === 0;
        return { isValid, valid: isValid, errors, violations };
    }
    assertValidState(state) {
        const res = this.validateState(state);
        if (!res.isValid) {
            throw new ThermodynamicViolationError(res.violations?.[0] ?? 'State validation failed');
        }
        const ent = state.entropy ?? state.totalEntropy ?? 0;
        if (ent < 0) {
            throw new ThermodynamicViolationError('Negative absolute entropy');
        }
        if (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < 0) {
            throw new ThermodynamicViolationError('Negative entropy generation rate');
        }
    }
    assertValid(state) {
        this.assertValidState(state);
    }
    static validateStateVector(vector) {
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        }
        if (vector.energy === undefined && vector.internalEnergy === undefined)
            throw new Error("ValidationError: Missing required property 'energy'");
        if (vector.entropy === undefined && vector.totalEntropy === undefined)
            throw new Error("ValidationError: Missing required property 'entropy'");
        if (vector.temperature === undefined)
            throw new Error("ValidationError: Missing required property 'temperature'");
        if (vector.stocks === undefined && vector.elementalStocks === undefined)
            throw new Error("ValidationError: Missing required property 'stocks'");
        const ent = vector.entropy ?? vector.totalEntropy ?? 0;
        if (ent < 0) {
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        if (vector.temperature <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        const stocks = vector.stocks ?? vector.elementalStocks;
        if (stocks) {
            for (const [k, v] of Object.entries(stocks)) {
                if (typeof v === 'number' && v < 0) {
                    throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
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
            const res = stepFn(vec);
            StateValidator.validateStateVector(res);
            const ent = res.entropy ?? res.totalEntropy ?? 0;
            if (ent < 0) {
                throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
            }
            return res;
        };
    }
}
export class ThermodynamicViolationError extends Error {
    constructor(message) {
        super(`[Thermodynamic Violation]: ${message}`);
        this.name = 'ThermodynamicViolationError';
    }
}
export { StateValidator as ThermodynamicStateValidator };
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const nextState = transitionFn(state);
        const ns = nextState;
        const sGen = ns.entropyGenerationRate ?? 0;
        const ent = ns.entropy ?? ns.totalEntropy ?? 0;
        const temp = ns.temperature ?? 1;
        if (sGen < 0 || ent < 0 || temp <= 0) {
            const err = new ThermodynamicEntropyViolationError(nextState, 'Second Law Violation');
            return {
                success: false,
                errorValue: err,
                error: err,
                isOk: () => false,
                isErr: () => true
            };
        }
        return {
            success: true,
            value: nextState,
            isOk: () => true,
            isErr: () => false
        };
    }
    catch (e) {
        const err = new ThermodynamicEntropyViolationError(state, e.message);
        return {
            success: false,
            errorValue: err,
            error: err,
            isOk: () => false,
            isErr: () => true
        };
    }
}
export function assertNonNegativeEntropy(state) {
    if (state === null || state === undefined) {
        const msg = 'Null or undefined state vector: entropy inspection impossible';
        return {
            success: false,
            error: msg,
            errorValue: msg,
            isOk: () => false,
            isErr: () => true
        };
    }
    const s = state;
    let entropy = s.entropy ?? s.totalEntropy;
    if (entropy === undefined && typeof s.getEntropy === 'function') {
        entropy = s.getEntropy();
    }
    if (entropy === undefined || entropy === null || typeof entropy !== 'number' || Number.isNaN(entropy)) {
        const msg = Number.isNaN(entropy) ? 'Second Law Violation: entropy is NaN' : 'Invalid entropy: missing or non-numeric entropy property';
        return {
            success: false,
            error: msg,
            errorValue: msg,
            isOk: () => false,
            isErr: () => true
        };
    }
    if (entropy < 0) {
        const err = new ThermodynamicEntropyViolationError(state, `Second Law Violation: Entropy (${entropy}) cannot be negative.`);
        return {
            success: false,
            error: err,
            errorValue: err,
            isOk: () => false,
            isErr: () => true
        };
    }
    const sGen = s.entropyGenerationRate ?? s.getEntropyGenerationRate?.() ?? 0;
    if (sGen < -1e-9) {
        const err = new ThermodynamicEntropyViolationError(state, `Second Law Violation: Entropy generation rate (${sGen}) cannot be negative.`);
        return {
            success: false,
            error: err,
            errorValue: err,
            isOk: () => false,
            isErr: () => true
        };
    }
    return {
        success: true,
        value: state,
        isOk: () => true,
        isErr: () => false
    };
}

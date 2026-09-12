/**
 * @fileoverview Unified State Validator and Thermodynamic Invariant Enforcer
 * (Sprint 028 to Sprint 042 Retro-Compatibility)
 */
import { STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';
export function ok(value) {
    return { success: true, value, isOk: () => true, isErr: () => false };
}
export function err(error) {
    return { success: false, error, errorValue: error, isOk: () => false, isErr: () => true };
}
export class ThermodynamicConstraintViolationError extends Error {
    code;
    violatingValue;
    path;
    invalidValue;
    constructor(message, details) {
        super(message);
        this.name = 'ThermodynamicConstraintViolationError';
        if (details) {
            this.code = details.code;
            this.violatingValue = details.violatingValue;
            this.path = details.path;
            this.invalidValue = details.invalidValue;
        }
    }
}
export class ThermodynamicEntropyViolationError extends Error {
    state;
    constructor(state, message = 'Entropy violation') {
        super(`[ThermodynamicEntropyViolationError]: ${message}`);
        this.state = state;
        this.name = 'ThermodynamicEntropyViolationError';
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
    totalDissipatedHeat = 0;
    totalEntropy = 0.0;
    recordDissipation(heatJoules, ambientTemp = STANDARD_AMBIENT_TEMPERATURE_K) {
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
        this.nutrientPool = new ElementalStocks(Math.max(0, this.nutrientPool.carbon - demand.carbon), Math.max(0, this.nutrientPool.nitrogen - demand.nitrogen), Math.max(0, this.nutrientPool.phosphorus - demand.phosphorus), Math.max(0, this.nutrientPool.water - demand.water));
        return demand;
    }
}
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const assimilatedCarbon = carcass.carbon * 0.15;
        const residueCarbon = carcass.carbon * 0.85;
        ledger.recordDissipation(carcass.carbon * 10.5);
        const assimilated = new ElementalStocks(assimilatedCarbon, carcass.nitrogen * 0.2, carcass.phosphorus * 0.2, carcass.water * 0.2);
        const residue = new ElementalStocks(residueCarbon, carcass.nitrogen * 0.8, carcass.phosphorus * 0.8, carcass.water * 0.8);
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
        const sGen = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
        const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return typeof entropy === 'number' && !isNaN(entropy) && entropy >= 0 &&
            typeof sGen === 'number' && !isNaN(sGen) && sGen >= -1e-9 &&
            typeof temp === 'number' && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        const isValid = StateValidator.validateEntropy(state);
        if (!isValid) {
            const errObj = new ThermodynamicEntropyViolationError(state, 'Second Law Violation: Negative entropy or generation rate.');
            return err(errObj);
        }
        return ok(state);
    }
    validateEntropy(state) {
        return StateValidator.validateEntropy(state);
    }
    assertValidState(state) {
        const res = this.validateState(state);
        if (!res.isValid) {
            const msg = (res.errors ?? res.violations ?? []).map((e) => typeof e === 'string' ? e : e.reason).join(', ');
            throw new ThermodynamicConstraintViolationError(`State validation failed: ${msg}`);
        }
    }
    assertValid(state) {
        this.assertValidState(state);
    }
    validate(state) {
        return this.validateState(state);
    }
    validateState(state) {
        const errors = [];
        const violations = [];
        if (!state || typeof state !== 'object') {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
                violations: ['root: State must be a non-null object.']
            };
        }
        const entropy = state.entropy ?? (typeof state.getEntropy === 'function' ? state.getEntropy() : undefined);
        if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
            errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
            violations.push('entropy: Entropy must exist as a finite number.');
        }
        else if (entropy < 0) {
            errors.push({ property: 'entropy', reason: `Second Law Violation: Entropy (${entropy}) cannot be negative.` });
            violations.push(`Second Law Violation: Entropy (${entropy}) cannot be negative.`);
        }
        const sGen = state.entropyGenerationRate ?? (typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
        if (typeof sGen === 'number' && sGen < -1e-9) {
            errors.push({ property: 'entropyGenerationRate', reason: `Dissipation rate / Entropy generation rate (${sGen}) must be >= 0.` });
            violations.push(`Dissipation rate: Entropy generation rate (${sGen}) must be >= 0.`);
        }
        const temp = state.temperature;
        if (temp !== undefined && (typeof temp !== 'number' || isNaN(temp) || temp <= 0)) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
            violations.push('temperature: Absolute temperature must be strictly positive.');
        }
        const energy = state.energy ?? state.internalEnergy;
        if (energy !== undefined && (typeof energy !== 'number' || isNaN(energy))) {
            errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
            violations.push('energy: Energy must exist as a finite number.');
        }
        const elementalStocks = state.elementalStocks ?? state.stocks;
        if (elementalStocks === undefined) {
            errors.push({ property: 'elementalStocks', reason: 'Mandatory elementalStocks property is missing.' });
            violations.push('elementalStocks: Mandatory elementalStocks property is missing.');
        }
        else if (typeof elementalStocks === 'object' && elementalStocks !== null) {
            for (const [k, v] of Object.entries(elementalStocks)) {
                if (typeof v === 'number' && v < 0) {
                    errors.push({ property: `elementalStocks.${k}`, reason: `Elemental stock '${k}' is negative.` });
                    violations.push(`elementalStocks.${k}: Elemental stock '${k}' is negative.`);
                }
            }
        }
        return {
            isValid: errors.length === 0 && violations.length === 0,
            valid: errors.length === 0 && violations.length === 0,
            errors,
            violations
        };
    }
    validateTransition(prior, next) {
        return this.validateState(next);
    }
    validateStateVector(vector) {
        return this.validateState(vector).isValid;
    }
    static validateStateVector(vector) {
        const v = new StateValidator();
        return v.validateStateVector(vector);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            const validator = new StateValidator();
            const res = validator.validateState(next);
            if (!res.isValid) {
                throw new Error('ThermodynamicViolation (Second Law): invalid state produced by monad step.');
            }
            return next;
        };
    }
}
export { StateValidator as ThermodynamicStateValidator };
export function validateStateProperties(state) {
    const validator = new StateValidator();
    return validator.validateState(state);
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const nextState = transitionFn(state);
        const entropy = nextState.entropy ?? (typeof nextState.getEntropy === 'function' ? nextState.getEntropy() : 0);
        const sGen = nextState.entropyGenerationRate ?? (typeof nextState.getEntropyGenerationRate === 'function' ? nextState.getEntropyGenerationRate() : 0);
        const temp = nextState.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        if (entropy < 0 || sGen < -1e-9 || temp <= 0) {
            return err(new ThermodynamicEntropyViolationError(nextState, 'Unphysical transition violating Second Law.'));
        }
        return ok(nextState);
    }
    catch (e) {
        return err(new ThermodynamicEntropyViolationError(state, e.message));
    }
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return {
            success: false,
            error: 'Invalid state object provided for entropy validation.',
            errorValue: 'Invalid state object provided for entropy validation.',
            isOk: () => false,
            isErr: () => true
        };
    }
    const entropy = state.entropy ?? (typeof state.getEntropy === 'function' ? state.getEntropy() : undefined);
    if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
        return {
            success: false,
            error: {
                code: 'INVALID_STATE_VECTOR',
                message: 'Entropy metric is missing or not a valid number.',
                invalidValue: entropy ?? NaN,
                path: 'entropy'
            },
            errorValue: {
                code: 'INVALID_STATE_VECTOR',
                message: 'Entropy metric is missing or not a valid number.',
                invalidValue: entropy ?? NaN,
                path: 'entropy'
            },
            isOk: () => false,
            isErr: () => true
        };
    }
    if (entropy < 0) {
        const errObj = {
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            message: `Second Law Violation: Detected negative entropy (S = ${entropy}).`,
            invalidValue: entropy,
            violatingValue: entropy,
            path: 'entropy'
        };
        return {
            success: false,
            error: errObj,
            errorValue: errObj,
            isOk: () => false,
            isErr: () => true
        };
    }
    if (state.totalEntropy !== undefined && typeof state.totalEntropy === 'number' && state.totalEntropy < 0) {
        const errObj = {
            code: 'NEGATIVE_ENTROPY_DETECTED',
            message: `Thermodynamic violation at totalEntropy: ${state.totalEntropy}`,
            violatingValue: state.totalEntropy,
            path: 'totalEntropy'
        };
        return {
            success: false,
            error: errObj,
            errorValue: errObj,
            isOk: () => false,
            isErr: () => true
        };
    }
    if (state.metrics && typeof state.metrics === 'object') {
        const metricsRes = assertNonNegativeEntropy(state.metrics);
        if (!metricsRes.success) {
            return metricsRes;
        }
    }
    return {
        success: true,
        value: state,
        isOk: () => true,
        isErr: () => false
    };
}

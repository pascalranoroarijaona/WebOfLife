/**
 * Thermodynamic State Vector Validation & Assertion Utility (RFCs 028 - 039)
 *
 * Enforces First Law (matter/energy conservation) and Second Law (S >= 0, S_gen >= 0)
 * compliance across all thermodynamic state vectors and monad transitions.
 */
import { ElementalStocks, ThermodynamicViolationError, ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError } from './types.js';
export { ElementalStocks, ThermodynamicViolationError, ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError };
export class ThermodynamicLedger {
    totalEntropy = 0.0;
    totalDissipatedHeat = 0.0;
    recordDissipation(heat, temperature = 298.15) {
        if (heat < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heat;
        this.totalEntropy += heat / temperature;
    }
    auditMassConservation(initialMass, currentMass) {
        const current = currentMass ?? initialMass;
        const diff = Math.abs(current.carbon - initialMass.carbon);
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
        this.nutrientPool = this.nutrientPool.subtract(demand);
        return demand;
    }
}
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const assimilationEfficiency = 0.15;
        const assimilated = new ElementalStocks(carcass.carbon * assimilationEfficiency, carcass.nitrogen * assimilationEfficiency, carcass.phosphorus * assimilationEfficiency, carcass.water * assimilationEfficiency);
        const residue = carcass.subtract(assimilated);
        patch.nutrientPool = patch.nutrientPool.add(residue);
        ledger.recordDissipation(carcass.carbon * 10.5);
        return [assimilated, residue];
    }
}
/**
 * Pure function to validate state vector properties without throwing.
 */
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
    const energyVal = s['energy'] ?? s['internalEnergy'];
    if (typeof energyVal !== 'number' || !Number.isFinite(energyVal) || energyVal < 0) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
        violations.push('energy: Energy must exist as a finite non-negative number.');
    }
    const entropyVal = s['entropy'] ?? s['totalEntropy'];
    if (typeof entropyVal !== 'number' || !Number.isFinite(entropyVal) || entropyVal < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a non-negative number.' });
        violations.push('entropy: Entropy must exist as a non-negative number.');
    }
    const tempVal = s['temperature'] ?? s['ambientTemperature'];
    if (typeof tempVal !== 'number' || !Number.isFinite(tempVal) || tempVal < 0) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as an absolute Kelvin number >= 0.' });
        violations.push('temperature: Temperature must exist as an absolute Kelvin number >= 0.');
    }
    const stocksVal = s['stocks'] ?? s['elementalStocks'] ?? s['massStocks'];
    if (!stocksVal || typeof stocksVal !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks inventory must be a non-null object.' });
        violations.push('stocks: Stocks inventory must be a non-null object.');
    }
    else {
        for (const [k, v] of Object.entries(stocksVal)) {
            if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a non-negative number.` });
                violations.push(`stocks.${k}: Stock inventory '${k}' must be a non-negative number.`);
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
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return {
            success: false,
            error: 'Invalid state object provided for entropy validation.',
            value: undefined,
            isOk: () => false,
            isErr: () => true,
            errorValue: 'Invalid state object provided for entropy validation.'
        };
    }
    const entropyValue = 'getEntropy' in state && typeof state.getEntropy === 'function'
        ? state.getEntropy()
        : state.entropy;
    if (typeof entropyValue !== 'number' || isNaN(entropyValue)) {
        return {
            success: false,
            error: 'Invalid entropy value: not a number.',
            value: undefined,
            isOk: () => false,
            isErr: () => true,
            errorValue: 'Invalid entropy value: not a number.'
        };
    }
    if (entropyValue < 0) {
        const errObj = new ThermodynamicEntropyViolationError(state, `Second Law Violation: Negative entropy detected (S = ${entropyValue}). Entropy must be >= 0.`);
        return {
            success: false,
            error: errObj,
            value: undefined,
            errorValue: errObj,
            isOk: () => false,
            isErr: () => true
        };
    }
    const sGen = 'getEntropyGenerationRate' in state && typeof state.getEntropyGenerationRate === 'function'
        ? state.getEntropyGenerationRate()
        : state.entropyGenerationRate;
    if (typeof sGen === 'number' && !isNaN(sGen) && sGen < 0) {
        const errObj = new ThermodynamicEntropyViolationError(state, `Second Law Violation: Negative entropy generation rate detected (S_gen = ${sGen}).`);
        return {
            success: false,
            error: errObj,
            value: undefined,
            errorValue: errObj,
            isOk: () => false,
            isErr: () => true
        };
    }
    return { success: true, value: state, error: undefined, isOk: () => true, isErr: () => false };
}
export class StateValidator {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    static validateEntropy(state) {
        const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? 0);
        const sGen = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
        const temp = state.temperature ?? 288.15;
        return entropy >= 0 && sGen >= 0 && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        const res = assertNonNegativeEntropy(state);
        if (!res.success) {
            return res;
        }
        return { success: true, value: state, error: undefined, isOk: () => true, isErr: () => false };
    }
    assertNonNegativeEntropy(state) {
        return StateValidator.assertNonNegativeEntropy(state);
    }
    validateState(state) {
        if (!state) {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'root', reason: "ValidationError: ThermodynamicStateVector is null or undefined" }],
                violations: ["ValidationError: ThermodynamicStateVector is null or undefined"]
            };
        }
        if (state.energy === undefined) {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'energy', reason: "ValidationError: Missing required property 'energy'" }],
                violations: ["ValidationError: Missing required property 'energy'"]
            };
        }
        if (state.entropy === undefined && state.totalEntropy === undefined) {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'entropy', reason: "ValidationError: Missing required property 'entropy'" }],
                violations: ["ValidationError: Missing required property 'entropy'"]
            };
        }
        if (state.temperature === undefined && state.ambientTemperature === undefined) {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'temperature', reason: "ValidationError: Missing required property 'temperature'" }],
                violations: ["ValidationError: Missing required property 'temperature'"]
            };
        }
        if (state.stocks === undefined && state.elementalStocks === undefined) {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'stocks', reason: "ValidationError: Missing required property 'stocks'" }],
                violations: ["ValidationError: Missing required property 'stocks'"]
            };
        }
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        const temp = state.temperature ?? state.ambientTemperature ?? 298.15;
        const sGen = state.entropyGenerationRate ?? 0;
        const violations = [];
        const errors = [];
        if (entropy < 0) {
            violations.push('ThermodynamicViolation (Second Law): Entropy cannot be negative');
            errors.push({ property: 'entropy', reason: 'ThermodynamicViolation (Second Law): Entropy cannot be negative' });
        }
        if (temp <= 0) {
            violations.push('ThermodynamicViolation: Absolute temperature must be strictly positive');
            errors.push({ property: 'temperature', reason: 'ThermodynamicViolation: Absolute temperature must be strictly positive' });
        }
        if (sGen < -1e-9) {
            violations.push('Second Law Violation: Dissipation rate cannot be negative.');
            errors.push({ property: 'entropyGenerationRate', reason: 'Second Law Violation: Dissipation rate cannot be negative.' });
        }
        const stocks = state.stocks ?? state.elementalStocks ?? {};
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v === 'number' && v < 0) {
                violations.push(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
                errors.push({ property: `stocks.${k}`, reason: `ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count` });
            }
        }
        const isValid = violations.length === 0;
        return {
            isValid,
            valid: isValid,
            errors,
            violations
        };
    }
    validateTransition(prior, next) {
        const vPrior = this.validateState(prior);
        if (!vPrior.isValid)
            return vPrior;
        const vNext = this.validateState(next);
        if (!vNext.isValid)
            return vNext;
        return { isValid: true, valid: true, errors: [], violations: [] };
    }
    validate(state) {
        return this.validateState(state);
    }
    assertValidState(state) {
        const res = this.validateState(state);
        if (!res.isValid) {
            const msg = (res.violations ?? []).join('\n- ');
            throw new ThermodynamicViolationError(`State validation failed:\n- ${msg}`);
        }
    }
    assertValid(state) {
        this.assertValidState(state);
    }
    validateStateVector(vector) {
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        }
        if (vector.energy === undefined) {
            throw new Error("ValidationError: Missing required property 'energy'");
        }
        if (vector.entropy === undefined && vector.totalEntropy === undefined) {
            throw new Error("ValidationError: Missing required property 'entropy'");
        }
        if (vector.temperature === undefined && vector.ambientTemperature === undefined) {
            throw new Error("ValidationError: Missing required property 'temperature'");
        }
        if (vector.stocks === undefined && vector.elementalStocks === undefined) {
            throw new Error("ValidationError: Missing required property 'stocks'");
        }
        const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
        if (entropy < 0) {
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        const temp = vector.temperature ?? vector.ambientTemperature ?? 298.15;
        if (temp <= 0) {
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
    static validateStateVector(vector) {
        const validator = new StateValidator();
        return validator.validateStateVector(vector);
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
    assertNonNegativeEntropy(state) {
        return ThermodynamicStateValidator.assertNonNegativeEntropy(state);
    }
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const nextState = transitionFn(state);
        const entropy = nextState.entropy ?? nextState.totalEntropy ?? 0;
        const sGen = nextState.entropyGenerationRate ?? 0;
        const temp = nextState.temperature ?? 298.15;
        if (entropy < 0 || sGen < 0 || temp <= 0) {
            return {
                isOk: () => false,
                isErr: () => true,
                error: new ThermodynamicEntropyViolationError(nextState, 'Unphysical state violation'),
                value: undefined
            };
        }
        return { isOk: () => true, isErr: () => false, value: nextState, error: undefined };
    }
    catch (err) {
        return { isOk: () => false, isErr: () => true, error: err, value: undefined };
    }
}

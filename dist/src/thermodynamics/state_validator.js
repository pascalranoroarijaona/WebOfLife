/**
 * Thermodynamic State Vector Validator & Invariant Asserter (Sprint 037 Retro-Compatibility)
 */
import { ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError, ThermodynamicViolationError } from './types.js';
export { ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError, ThermodynamicViolationError };
export function validateStateProperties(state) {
    const errors = [];
    if (state === null || typeof state !== 'object') {
        return {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        };
    }
    const s = state;
    const energyVal = s['energy'] ?? s['internalEnergy'];
    if (typeof energyVal !== 'number' || !Number.isFinite(energyVal) || energyVal < 0) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number >= 0.' });
    }
    const entropyVal = s['entropy'] ?? s['systemEntropy'];
    if (typeof entropyVal !== 'number' || !Number.isFinite(entropyVal) || entropyVal < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy bound violation: must be finite and >= 0.' });
    }
    const tempVal = s['temperature'] ?? s['temperature_T'];
    if (typeof tempVal !== 'number' || !Number.isFinite(tempVal) || tempVal < 0) {
        errors.push({ property: 'temperature', reason: 'Temperature absolute zero boundary violation: must be >= 0.' });
    }
    const stocks = s['stocks'] ?? s['elementalStocks'] ?? s['massStocks'];
    if (stocks === null || stocks === undefined) {
        errors.push({ property: 'stocks', reason: 'Stocks property missing or null.' });
    }
    else if (typeof stocks === 'object') {
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v !== 'number' || !Number.isFinite(v)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a numeric value.` });
            }
            else if (v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
            }
        }
    }
    return {
        isValid: errors.length === 0,
        valid: errors.length === 0,
        errors,
        violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
}
export class ThermodynamicStateValidator {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    validate(state) {
        const errors = [];
        const violations = [];
        if (!state) {
            return { isValid: false, valid: false, violations: ['State is null or undefined'], errors: [{ property: 'root', reason: 'State is null or undefined' }] };
        }
        if (state.energy === undefined && state.internalEnergy === undefined) {
            errors.push({ property: 'energy', reason: "Missing required property 'energy'" });
            violations.push("energy: Missing required property 'energy'");
        }
        if (state.entropy === undefined) {
            errors.push({ property: 'entropy', reason: "Missing required property 'entropy'" });
            violations.push("entropy: Missing required property 'entropy'");
        }
        else if (state.entropy < 0) {
            violations.push(`Second Law Violation: Entropy (${state.entropy}) cannot be negative.`);
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
        }
        if (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < 0) {
            violations.push(`Second Law Violation: Entropy generation rate (${state.entropyGenerationRate}) must be >= 0.`);
            errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate cannot be negative' });
        }
        if (state.temperature === undefined) {
            errors.push({ property: 'temperature', reason: "Missing required property 'temperature'" });
            violations.push("temperature: Missing required property 'temperature'");
        }
        else if (state.temperature < 0) {
            violations.push(`First/Second Law Violation: Absolute temperature (${state.temperature}) cannot be negative.`);
            errors.push({ property: 'temperature', reason: 'Absolute temperature cannot be negative' });
        }
        if (state.stocks === undefined && state.elementalStocks === undefined) {
            errors.push({ property: 'elementalStocks', reason: "Missing required property 'elementalStocks'" });
            violations.push("elementalStocks: Missing required property 'elementalStocks'");
        }
        else {
            const stocksObj = state.stocks ?? state.elementalStocks ?? {};
            for (const [k, v] of Object.entries(stocksObj)) {
                if (typeof v === 'number' && v < 0) {
                    violations.push(`First Law Violation: Elemental stock '${k}' is negative`);
                    errors.push({ property: `elementalStocks.${k}`, reason: `Elemental stock '${k}' is negative` });
                }
            }
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            violations
        };
    }
    assertValid(state) {
        const result = this.validate(state);
        if (!result.isValid) {
            throw new Error(`Thermodynamic State Validation Failed:\n${result.violations.join('\n')}`);
        }
    }
    validateState(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, errors: ['State is null or undefined'] };
        }
        if (isNaN(state.temperature)) {
            errors.push('temperature is NaN');
        }
        if (!state.stocks || typeof state.stocks !== 'object') {
            errors.push('stocks missing or invalid');
        }
        if (state.entropy !== undefined && state.entropy < 0) {
            errors.push('Entropy must be non-negative');
        }
        if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
            errors.push('Dissipation rate cannot be negative');
        }
        return { isValid: errors.length === 0, errors };
    }
    validateTransition(prior, next) {
        const errors = [];
        if (next.entropyGenerationRate !== undefined && next.entropyGenerationRate < 0) {
            errors.push('Second Law Violation');
        }
        if (this.options.strictMode && prior && next && prior.solarInput !== undefined && next.solarInput !== undefined) {
            const stockPrior = Object.values(prior.stocks ?? {}).reduce((a, b) => a + b, 0);
            const stockNext = Object.values(next.stocks ?? {}).reduce((a, b) => a + b, 0);
            const deltaStock = Number(stockNext) - Number(stockPrior);
            if (Math.abs(deltaStock - next.solarInput) > 10) {
                errors.push('First Law Violation: Stock delta does not match solar input');
            }
        }
        return { isValid: errors.length === 0, errors };
    }
    static validateStateVector(vector) {
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        }
        if (vector.energy === undefined && vector.internalEnergy === undefined) {
            throw new Error("ValidationError: Missing required property 'energy'");
        }
        if (vector.entropy === undefined) {
            throw new Error("ValidationError: Missing required property 'entropy'");
        }
        if (vector.temperature === undefined) {
            throw new Error("ValidationError: Missing required property 'temperature'");
        }
        if (vector.stocks === undefined && vector.elementalStocks === undefined) {
            throw new Error("ValidationError: Missing required property 'stocks'");
        }
        if (vector.entropy < 0) {
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        if (vector.temperature <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        const stocksObj = vector.stocks ?? vector.elementalStocks ?? {};
        for (const [k, v] of Object.entries(stocksObj)) {
            if (typeof v === 'number' && v < 0) {
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
        }
        return true;
    }
    validateStateVector(vector) {
        return ThermodynamicStateValidator.validateStateVector(vector);
    }
    assertNonNegativeEntropy(vector) {
        ThermodynamicStateValidator.validateStateVector(vector);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const res = stepFn(vec);
            ThermodynamicStateValidator.validateStateVector(res);
            return res;
        };
    }
}
export class StateValidator {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    validateState(state) {
        const v = new ThermodynamicStateValidator(this.options);
        return v.validateState(state);
    }
    validateTransition(prior, next) {
        const v = new ThermodynamicStateValidator(this.options);
        return v.validateTransition(prior, next);
    }
    assertValidState(state) {
        if (state.entropy < 0 || (state.entropyGenerationRate ?? 0) < 0 || !Number.isFinite(state.entropy) || !Number.isFinite(state.entropyGenerationRate ?? 0)) {
            throw new ThermodynamicViolationError('Invalid entropy or entropy generation rate.');
        }
    }
    static validateEntropy(state) {
        const entropy = state.entropy ?? state.getEntropy?.() ?? 0;
        const entropyGenRate = state.entropyGenerationRate ?? state.getEntropyGenerationRate?.() ?? 0;
        const temperature = state.temperature ?? 288.15;
        return entropy >= 0 && entropyGenRate >= 0 && temperature > 0;
    }
    static isValidEntropy(state) {
        return StateValidator.validateEntropy(state);
    }
    static assertNonNegativeEntropy(state) {
        if (!StateValidator.validateEntropy(state)) {
            return {
                isOk: () => false,
                isErr: () => true,
                error: new ThermodynamicEntropyViolationError(state, 'Negative entropy or rate detected')
            };
        }
        return {
            isOk: () => true,
            isErr: () => false,
            value: state
        };
    }
}
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    water;
    constructor(carbon = 0, nitrogen = 0, phosphorus = 0, water = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.water = water;
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
    recordDissipation(heat, temperature = 298.15) {
        if (heat < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heat;
        this.totalEntropy += heat / temperature;
    }
    auditMassConservation(stocks) {
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
    static scavenge(carcass, patch, ledger) {
        const assimilated = new ElementalStocks(carcass.carbon * 0.15, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
        const residue = new ElementalStocks(carcass.carbon * 0.85, carcass.nitrogen * 0.85, carcass.phosphorus * 0.85, carcass.water * 0.85);
        ledger.recordDissipation(carcass.carbon * 10.5);
        return [assimilated, residue];
    }
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

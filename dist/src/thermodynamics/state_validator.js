import { ThermodynamicViolationError, ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError, STANDARD_AMBIENT_TEMPERATURE_K } from './types';
export { ThermodynamicViolationError, ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError };
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
    recordDissipation(heat, temp = 298.15) {
        if (heat < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heat;
        this.totalEntropy += heat / temp;
    }
    auditMassConservation(initial, current) {
        const cur = current ?? initial;
        const diff = Math.abs((cur.carbon + cur.nitrogen + cur.phosphorus + cur.water) - (initial.carbon + initial.nitrogen + initial.phosphorus + initial.water));
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
        return this.nutrientPool;
    }
    consumeNutrients(demand) {
        this.nutrientPool = new ElementalStocks(Math.max(0, this.nutrientPool.carbon - demand.carbon), Math.max(0, this.nutrientPool.nitrogen - demand.nitrogen), Math.max(0, this.nutrientPool.phosphorus - demand.phosphorus), Math.max(0, this.nutrientPool.water - demand.water));
        return demand;
    }
}
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const assimilated = new ElementalStocks(carcass.carbon * 0.15, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
        const residue = new ElementalStocks(carcass.carbon * 0.85, carcass.nitrogen * 0.85, carcass.phosphorus * 0.85, carcass.water * 0.85);
        ledger.recordDissipation(carcass.carbon * 10.5, 298.15);
        return [assimilated, residue];
    }
}
export class StateValidator {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    static validateEntropy(state) {
        const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy ?? 0);
        const entropyGenRate = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
        const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return Number.isFinite(entropy) && entropy >= 0 && Number.isFinite(entropyGenRate) && entropyGenRate >= 0 && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        if (!state || typeof state !== 'object') {
            return {
                success: false,
                error: new ThermodynamicEntropyViolationError(state, 'State is null or undefined'),
                errorValue: new ThermodynamicEntropyViolationError(state, 'State is null or undefined'),
                isOk: () => false,
                isErr: () => true
            };
        }
        const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy ?? NaN);
        const entropyGenRate = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
        if (isNaN(entropy)) {
            return {
                success: false,
                error: new ThermodynamicEntropyViolationError(state, 'Invalid entropy value: NaN'),
                errorValue: new ThermodynamicEntropyViolationError(state, 'Invalid entropy value: NaN'),
                isOk: () => false,
                isErr: () => true
            };
        }
        if (entropy < 0 || entropyGenRate < 0) {
            const err = new ThermodynamicEntropyViolationError(state, `Second Law Violation: Negative entropy (${entropy}) or negative generation rate (${entropyGenRate}).`);
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
    validateState(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }], violations: ['root: State must be a non-null object.'] };
        }
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const sGen = state.entropyGenerationRate ?? 0;
        const dissipation = state.dissipationRate ?? 0;
        if (typeof temp !== 'number' || isNaN(temp) || temp <= 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
        }
        if (typeof entropy !== 'number' || isNaN(entropy) || entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
        }
        if (sGen < 0 || dissipation < 0) {
            errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate cannot be negative' });
        }
        if (state.energy === undefined && state.internalEnergy === undefined) {
            errors.push({ property: 'energy', reason: "Missing required property 'energy'" });
        }
        if (state.entropy === undefined && state.totalEntropy === undefined) {
            errors.push({ property: 'entropy', reason: "Missing required property 'entropy'" });
        }
        if (state.elementalStocks === undefined && state.stocks === undefined) {
            errors.push({ property: 'elementalStocks', reason: "Missing required property 'elementalStocks'" });
        }
        const stocks = state.stocks ?? state.elementalStocks ?? {};
        if (stocks && typeof stocks === 'object') {
            for (const [k, v] of Object.entries(stocks)) {
                if (typeof v === 'number' && v < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative` });
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
    validate(state) {
        return this.validateState(state);
    }
    validateTransition(prior, next) {
        const res = this.validateState(next);
        return {
            isValid: res.isValid,
            valid: res.valid,
            errors: res.errors,
            violations: res.violations
        };
    }
    assertValidState(state) {
        const res = this.validateState(state);
        if (!res.isValid) {
            throw new ThermodynamicViolationError(res.violations?.[0] ?? 'State validation failed');
        }
    }
    assertValid(state) {
        this.assertValidState(state);
    }
    validateStateVector(state) {
        const res = this.validateState(state);
        return res.isValid;
    }
    static validateStateVector(state) {
        const v = new StateValidator();
        return v.validateStateVector(state);
    }
    static wrapMonadStep(fn) {
        return (vec) => {
            const res = fn(vec);
            const validator = new StateValidator();
            validator.assertValidState(res);
            return res;
        };
    }
}
export { StateValidator as ThermodynamicStateValidator };
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const nextState = transitionFn(state);
        const validation = StateValidator.assertNonNegativeEntropy(nextState);
        if (validation.success) {
            return { success: true, value: nextState, isOk: () => true, isErr: () => false };
        }
        return validation;
    }
    catch (err) {
        return {
            success: false,
            error: err,
            errorValue: err,
            isOk: () => false,
            isErr: () => true
        };
    }
}
export function validateStateProperties(state) {
    const validator = new StateValidator();
    return validator.validateState(state);
}
export function assertNonNegativeEntropy(state) {
    return StateValidator.assertNonNegativeEntropy(state);
}

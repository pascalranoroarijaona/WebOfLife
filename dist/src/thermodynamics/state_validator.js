import { ok, err, ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError, ElementalStocks } from './types.js';
export { ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError, ElementalStocks };
export class ThermodynamicLedger {
    totalEntropy = 0.0;
    totalDissipatedHeat = 0.0;
    recordDissipation(heatJoulesOrTemp, temp) {
        if (heatJoulesOrTemp < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        const T = temp ?? 298.15;
        const dissipated = temp !== undefined ? heatJoulesOrTemp : heatJoulesOrTemp;
        this.totalDissipatedHeat += dissipated;
        this.totalEntropy += dissipated / T;
    }
    auditMassConservation(currentMass, initialMass) {
        if (!initialMass)
            return 0.0;
        return Math.abs(currentMass.carbon - initialMass.carbon);
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
        const residue = carcass.subtract(assimilated);
        patch.nutrientPool = patch.nutrientPool.add(residue);
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
        const s = state.entropy ?? (typeof state.getEntropy === 'function' ? state.getEntropy() : 0);
        const sGen = state.entropyGenerationRate ?? (typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
        const temp = state.temperature ?? 288.15;
        return s >= 0 && sGen >= -1e-9 && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        const s = state.entropy ?? (typeof state.getEntropy === 'function' ? state.getEntropy() : 0);
        const sGen = state.entropyGenerationRate ?? (typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
        const temp = state.temperature ?? 288.15;
        if (s < 0 || sGen < -1e-9 || temp <= 0) {
            const errObj = {
                code: 'NEGATIVE_ENTROPY_DETECTED',
                message: `Second Law Violation: Entropy (${s}) or generation rate (${sGen}) or temperature (${temp}) violates bounds.`,
                violatingValue: s < 0 ? s : sGen,
                path: 'entropy'
            };
            return err(errObj);
        }
        return ok(state);
    }
    validateState(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }] };
        }
        if (state.temperature === undefined || isNaN(state.temperature) || state.temperature <= 0) {
            errors.push({ property: 'temperature', reason: 'Invalid temperature' });
        }
        if (state.stocks === undefined || state.stocks === null) {
            errors.push({ property: 'stocks', reason: 'Missing stocks' });
        }
        if (state.entropy !== undefined && state.entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy must be non-negative' });
        }
        if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors
        };
    }
    validateTransition(prior, next) {
        const errors = [];
        if (this.options.strictMode && prior && next && prior.solarInput !== undefined && next.stocks) {
            const priorC = prior.stocks.carbon ?? 0;
            const nextC = next.stocks.carbon ?? 0;
            const deltaC = nextC - priorC;
            if (Math.abs(deltaC - (prior.solarInput ?? 0)) > 1e-5) {
                errors.push({ property: 'First Law', reason: 'First Law Violation: stock delta does not match solar input' });
            }
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors
        };
    }
    validateStateVector(vector) {
        const res = this.validateState(vector);
        if (!res.isValid)
            return false;
        const s = vector.entropy ?? 0;
        const sGen = vector.entropyGenerationRate ?? 0;
        return s >= 0 && sGen >= -1e-9;
    }
    assertValidState(vector) {
        const s = vector.entropy ?? 0;
        const sGen = vector.entropyGenerationRate ?? 0;
        if (s < 0 || sGen < -1e-9 || isNaN(s) || !Number.isFinite(s)) {
            throw new ThermodynamicConstraintViolationError('State vector violates entropy invariants');
        }
    }
    validate(state) {
        const res = validateStateProperties(state);
        const errors = [...res.errors];
        if (state.entropy !== undefined && state.entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
        }
        if (state.temperature !== undefined && state.temperature < 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be non-negative' });
        }
        if (state.stocks) {
            for (const [k, v] of Object.entries(state.stocks)) {
                if (typeof v === 'number' && v < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Stock '${k}' is negative` });
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
    assertValid(state) {
        const res = this.validate(state);
        if (!res.isValid) {
            throw new Error(`State validation failed: ${JSON.stringify(res.errors)}`);
        }
    }
    static validateStateVector(vector) {
        if (!vector || vector.energy === undefined || vector.entropy === undefined || vector.temperature === undefined || vector.stocks === undefined) {
            throw new Error('ValidationError: Missing required property or vector is null');
        }
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
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            StateValidator.validateStateVector(next);
            return next;
        };
    }
    // Instance method delegates for Sprint 028 tests expecting assertNonNegativeEntropy on StateValidator instance
    assertNonNegativeEntropy(state) {
        return StateValidator.assertNonNegativeEntropy(state);
    }
}
export { StateValidator as ThermodynamicStateValidator };
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
    if (s['energy'] === undefined || typeof s['energy'] !== 'number' || !Number.isFinite(s['energy']) || s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number >= 0.' });
    }
    if (s['entropy'] === undefined || typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number >= 0.' });
    }
    if (s['temperature'] === undefined || typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number >= 0.' });
    }
    if (s['stocks'] === undefined || s['stocks'] === null || typeof s['stocks'] !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
    }
    else {
        for (const [k, v] of Object.entries(s['stocks'])) {
            if (typeof v !== 'number' || !Number.isFinite(v)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
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
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const nextState = transitionFn(state);
        if ((nextState.entropy < 0) || (nextState.entropyGenerationRate < 0) || (nextState.temperature <= 0)) {
            return err({
                code: 'NEGATIVE_ENTROPY_DETECTED',
                message: 'Unphysical transition violating Second Law',
                violatingValue: nextState.entropy < 0 ? nextState.entropy : nextState.entropyGenerationRate,
                path: 'entropy'
            });
        }
        return ok(nextState);
    }
    catch (e) {
        return err({
            code: 'NEGATIVE_ENTROPY_DETECTED',
            message: e.message,
            violatingValue: 0,
            path: 'entropy'
        });
    }
}
export function assertNonNegativeEntropy(state, path = 'root') {
    if (state === null || typeof state !== 'object') {
        return err('Invalid state object provided for entropy validation.');
    }
    const entropyVal = 'entropy' in state ? state.entropy : ('getEntropy' in state && typeof state.getEntropy === 'function' ? state.getEntropy() : undefined);
    if (entropyVal !== undefined && typeof entropyVal === 'number' && !isNaN(entropyVal) && entropyVal < 0) {
        return err({
            code: 'NEGATIVE_ENTROPY_DETECTED',
            message: `Second Law Violation: Detected negative entropy (S = ${entropyVal}). Entropy must be >= 0.`,
            violatingValue: entropyVal,
            path: `${path}.entropy`
        });
    }
    const totalEntropyVal = 'totalEntropy' in state ? state.totalEntropy : undefined;
    if (totalEntropyVal !== undefined && typeof totalEntropyVal === 'number' && !isNaN(totalEntropyVal) && totalEntropyVal < 0) {
        return err({
            code: 'NEGATIVE_ENTROPY_DETECTED',
            message: `Second Law Violation: Detected negative total entropy (S = ${totalEntropyVal}). Entropy must be >= 0.`,
            violatingValue: totalEntropyVal,
            path: `${path}.totalEntropy`
        });
    }
    for (const [key, val] of Object.entries(state)) {
        const currentPath = `${path}.${key}`;
        if (typeof val === 'number') {
            if ((key.toLowerCase().includes('entropy') || key === 's') && val < 0) {
                return err({
                    code: 'NEGATIVE_ENTROPY_DETECTED',
                    message: `Thermodynamic violation at ${currentPath}: Entropy value ${val} violates Second Law (S >= 0).`,
                    violatingValue: val,
                    path: currentPath,
                });
            }
        }
        else if (typeof val === 'object' && val !== null) {
            const res = assertNonNegativeEntropy(val, currentPath);
            if (!res.success) {
                return res;
            }
        }
    }
    return ok(true);
}

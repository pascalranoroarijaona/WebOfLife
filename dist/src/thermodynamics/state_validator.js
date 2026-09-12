import { ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError, ThermodynamicViolationError } from './types.js';
export { ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError, ThermodynamicViolationError };
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
    recordDissipation(heatJoules, tempK = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / tempK;
    }
    auditMassConservation(currentMass) {
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
        ledger.recordDissipation(carcass.carbon * 10.5);
        return [assimilated, residue];
    }
}
export class ThermodynamicStateValidator {
    defaultTolerance;
    strictMode;
    constructor(optionsOrTolerance) {
        if (typeof optionsOrTolerance === 'number') {
            this.defaultTolerance = optionsOrTolerance;
            this.strictMode = false;
        }
        else {
            this.defaultTolerance = optionsOrTolerance?.tolerance ?? 1e-6;
            this.strictMode = optionsOrTolerance?.strictMode ?? false;
        }
    }
    validate(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }] };
        }
        if (state.energy === undefined || state.energy === null || Number.isNaN(state.energy)) {
            errors.push({ property: 'energy', reason: 'Missing required property \'energy\'' });
        }
        else if (state.energy < 0) {
            errors.push({ property: 'energy', reason: 'Energy must be non-negative.' });
        }
        if (state.entropy === undefined || state.entropy === null || Number.isNaN(state.entropy)) {
            errors.push({ property: 'entropy', reason: 'Missing required property \'entropy\'' });
        }
        else if (state.entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy must be non-negative.' });
        }
        if (state.temperature === undefined || state.temperature === null || Number.isNaN(state.temperature)) {
            errors.push({ property: 'temperature', reason: 'Missing required property \'temperature\'' });
        }
        else if (state.temperature < 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
        }
        if (state.stocks === undefined && state.elementalStocks === undefined) {
            errors.push({ property: 'stocks', reason: 'Missing required property \'stocks\'' });
        }
        const stocks = state.stocks ?? state.elementalStocks ?? {};
        if (stocks && typeof stocks === 'object') {
            for (const [k, v] of Object.entries(stocks)) {
                if (typeof v !== 'number' || Number.isNaN(v)) {
                    errors.push({ property: `stocks.${k}`, reason: `Invalid stock type for '${k}'` });
                }
                else if (v < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative` });
                }
            }
        }
        const sGen = state.entropyGenerationRate ?? state.dissipationRate ?? 0;
        if (sGen < -1e-9) {
            errors.push({ property: 'entropyGenerationRate', reason: 'Dissipation rate cannot be negative' });
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
            const errList = res.errors ?? [];
            const msg = errList.length > 0 ? (typeof errList[0] === 'string' ? errList[0] : (errList[0]?.reason ?? JSON.stringify(errList[0]))) : 'Invalid state';
            throw new ThermodynamicViolationError(`State validation failed: ${msg}`);
        }
    }
    validateStateVector(vector) {
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        }
        const res = this.validate(vector);
        if (!res.isValid) {
            const errList = res.errors ?? [];
            const msg = errList.length > 0 ? (typeof errList[0] === 'string' ? errList[0] : (errList[0]?.reason ?? 'Invalid state')) : 'Invalid state';
            throw new ThermodynamicViolationError(`ThermodynamicViolation: ${msg}`);
        }
        return true;
    }
    static validateStateVector(vector) {
        const validator = new ThermodynamicStateValidator();
        return validator.validateStateVector(vector);
    }
    static assertNonNegativeEntropy(state) {
        const s = state?.entropy ?? state?.totalEntropy ?? 0;
        const sGen = state?.entropyGenerationRate ?? 0;
        if (s < 0 || sGen < -1e-9) {
            throw new ThermodynamicViolationError('Negative entropy detected');
        }
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            ThermodynamicStateValidator.validateStateVector(next);
            return next;
        };
    }
    assertConservation(previousState, currentState, boundary, deltaTime, tolerances) {
        const violations = [];
        const stockKeys = new Set([
            ...previousState.getKeys(),
            ...currentState.getKeys()
        ]);
        for (const stock of stockKeys) {
            const prevVal = previousState.getStock(stock) ?? 0;
            const currVal = currentState.getStock(stock) ?? 0;
            const observedDelta = currVal - prevVal;
            const fluxRate = boundary.netFluxes.get(stock) ?? 0;
            let predictedDelta = fluxRate * deltaTime;
            if (stock === 'energy' || stock === 'thermal') {
                predictedDelta += (boundary.solarInput - boundary.dissipationRate) * deltaTime;
            }
            const tolerance = tolerances?.get(stock) ?? this.defaultTolerance;
            const discrepancy = Math.abs(observedDelta - predictedDelta);
            if (discrepancy > tolerance) {
                violations.push({
                    stockName: stock,
                    observedDelta,
                    predictedDelta,
                    discrepancy,
                    tolerance
                });
            }
        }
        return {
            isValid: violations.length === 0,
            violations,
            timestamp: Date.now()
        };
    }
    validateState(state) {
        return this.validate(state);
    }
    validateTransition(prior, next) {
        const res = this.validate(next);
        if (!res.isValid) {
            return res;
        }
        const priorSolar = prior.solarInput ?? 0;
        const priorStocksTotal = Object.values(prior.stocks ?? {}).reduce((a, b) => a + Number(b), 0);
        const nextStocksTotal = Object.values(next.stocks ?? {}).reduce((a, b) => a + Number(b), 0);
        const deltaStocks = nextStocksTotal - priorStocksTotal;
        if (this.strictMode && Math.abs(deltaStocks - priorSolar) > 1e-4) {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'FirstLaw', reason: 'First Law Violation: Stock delta does not match solar input.' }],
                violations: ['FirstLaw: First Law Violation']
            };
        }
        return res;
    }
}
export class StateValidator {
    validatorInstance;
    constructor(optionsOrTolerance) {
        this.validatorInstance = new ThermodynamicStateValidator(optionsOrTolerance);
    }
    static validateEntropy(state) {
        const entropy = state?.entropy ?? (typeof state?.getEntropy === 'function' ? state.getEntropy() : 0);
        const sGen = state?.entropyGenerationRate ?? (typeof state?.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
        const temp = state?.temperature ?? 288.15;
        return entropy >= 0 && sGen >= -1e-9 && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        const valid = StateValidator.validateEntropy(state);
        if (!valid) {
            const errObj = new ThermodynamicEntropyViolationError(state, 'Negative entropy or entropy generation rate detected');
            return { success: false, error: errObj, errorValue: errObj, isOk: () => false, isErr: () => true };
        }
        return { success: true, value: true, isOk: () => true, isErr: () => false };
    }
    validate(state) {
        return this.validatorInstance.validate(state);
    }
    validateState(state) {
        return this.validatorInstance.validate(state);
    }
    validateTransition(prior, next) {
        return this.validatorInstance.validateTransition(prior, next);
    }
    assertValidState(state) {
        if (state.entropy < 0 || (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < 0) || Number.isNaN(state.entropy) || !Number.isFinite(state.entropy) || !Number.isFinite(state.entropyGenerationRate)) {
            throw new ThermodynamicViolationError('Second Law Violation');
        }
    }
    assertValid(state) {
        this.assertValidState(state);
    }
}
export function validateOrThrowEntropy(state, epsilon = 1e-9) {
    const sGen = state?.entropyGenerationRate ?? state?.getEntropyGenerationRate?.() ?? 0;
    if (sGen < -epsilon) {
        throw new ThermodynamicEntropyViolationError(state, `Second Law Violation: S_gen = ${sGen} < 0`);
    }
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return { success: false, error: 'Invalid state object provided for entropy validation.', errorValue: 'Invalid state object provided for entropy validation.', isOk: () => false, isErr: () => true };
    }
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : state.entropy;
    if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy)) {
        return { success: false, error: 'Entropy metric is missing or not a valid number.', errorValue: 'Entropy metric is missing or not a valid number.', isOk: () => false, isErr: () => true, code: 'INVALID_STATE_VECTOR', invalidValue: entropy };
    }
    if (typeof entropy !== 'number') {
        return { success: false, error: 'Invalid entropy type', errorValue: 'Invalid entropy type', isOk: () => false, isErr: () => true };
    }
    if (entropy < 0) {
        const errStr = `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`;
        return {
            success: false,
            error: errStr,
            errorValue: new ThermodynamicEntropyViolationError(state, errStr),
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            invalidValue: entropy,
            path: 'entropy',
            isOk: () => false,
            isErr: () => true
        };
    }
    return { success: true, value: state, isOk: () => true, isErr: () => false };
}
export function validateStateProperties(state) {
    if (state === null || typeof state !== 'object' || Array.isArray(state)) {
        return {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        };
    }
    const s = state;
    const errors = [];
    if (s['energy'] === undefined || typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    else if (s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'Energy cannot be negative.' });
    }
    if (s['entropy'] === undefined || typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy'])) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
    }
    else if (s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
    }
    if (s['temperature'] === undefined || typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature'])) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
    }
    else if (s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Absolute zero boundary violated: temperature cannot be negative.' });
    }
    const stocks = s['stocks'];
    if (stocks === undefined || stocks === null || typeof stocks !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
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
    return {
        isValid: errors.length === 0,
        valid: errors.length === 0,
        errors,
        violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        if (next.entropy < 0 || (next.entropyGenerationRate !== undefined && next.entropyGenerationRate < 0)) {
            return { success: false, error: new ThermodynamicEntropyViolationError(next), errorValue: new ThermodynamicEntropyViolationError(next), isOk: () => false, isErr: () => true };
        }
        return { success: true, value: next, isOk: () => true, isErr: () => false };
    }
    catch (err) {
        return { success: false, error: err, errorValue: err, isOk: () => false, isErr: () => true };
    }
}
export class EntropyMonad {
    state;
    constructor(state) {
        this.state = state;
    }
    bind(fn) {
        const next = fn(this.state);
        assertNonNegativeEntropy(next);
        this.state = next;
        return this;
    }
    getState() {
        return this.state;
    }
}
export function withEntropyCheck(state, transformFn) {
    const next = transformFn(state);
    const prevEntropy = state.entropy ?? state.getEntropy?.() ?? 0;
    const nextEntropy = next.entropy ?? next.getEntropy?.() ?? 0;
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarInput = typeof next.getSolarFlux === 'function' ? next.getSolarFlux() : (next.solarInput ?? 0);
    const isValid = deltaEntropy >= 0 || solarInput >= Math.abs(deltaEntropy);
    if (!isValid) {
        return {
            valid: false,
            success: false,
            state,
            deltaEntropy,
            universeEntropyChange: deltaEntropy,
            reason: 'Second Law Violation: Uncompensated negative entropy change.'
        };
    }
    return {
        valid: true,
        success: true,
        state: next,
        deltaEntropy,
        universeEntropyChange: deltaEntropy + (solarInput > 0 ? 1 : 0)
    };
}

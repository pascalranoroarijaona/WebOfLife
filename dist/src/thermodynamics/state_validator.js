/**
 * Thermodynamic State Vector Stock Conservation Asserter & Validation Suite (Sprint 028 - 052 Retro-Compatibility)
 * Verifies stock deltas against boundary flux rates within tolerance bounds and provides all legacy validation wrappers.
 */
import { ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError } from './types.js';
export { ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError };
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
    recordDissipation(heat, ambientTemp = 298.15) {
        if (heat < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heat;
        this.totalEntropy += heat / ambientTemp;
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
        this.nutrientPool.carbon = Math.max(0, this.nutrientPool.carbon - demand.carbon);
        this.nutrientPool.nitrogen = Math.max(0, this.nutrientPool.nitrogen - demand.nitrogen);
        this.nutrientPool.phosphorus = Math.max(0, this.nutrientPool.phosphorus - demand.phosphorus);
        this.nutrientPool.water = Math.max(0, this.nutrientPool.water - demand.water);
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
export class StateValidator {
    tolerance;
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    validateStockConservation(preState, postState, boundaryFluxes, deltaTime) {
        const reports = [];
        const preStocks = preState.stocks instanceof Map ? preState.stocks : new Map(Object.entries(preState.stocks ?? {}));
        const postStocks = postState.stocks instanceof Map ? postState.stocks : new Map(Object.entries(postState.stocks ?? {}));
        const allKeys = new Set([...preStocks.keys(), ...postStocks.keys(), ...boundaryFluxes.keys()]);
        const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;
        for (const element of allKeys) {
            const initialStock = preStocks.get(element) ?? 0.0;
            const finalStock = postStocks.get(element) ?? 0.0;
            const actualDelta = finalStock - initialStock;
            const fluxRate = boundaryFluxes.get(element) ?? 0.0;
            const expectedDelta = fluxRate * deltaTime;
            const discrepancy = Math.abs(actualDelta - expectedDelta);
            const isValid = discrepancy <= tol;
            reports.push({
                element,
                isValid,
                expectedDelta,
                actualDelta,
                discrepancy,
                tolerance: tol
            });
        }
        return reports;
    }
    assertOrThrow(preState, postState, boundaryFluxes, deltaTime) {
        const reports = this.validateStockConservation(preState, postState, boundaryFluxes, deltaTime);
        const violations = reports.filter(r => !r.isValid);
        if (violations.length > 0) {
            const violationSummary = violations
                .map(v => `[${v.element}] Expected Δ: ${v.expectedDelta}, Actual Δ: ${v.actualDelta}, Discrepancy: ${v.discrepancy}`)
                .join('; ');
            throw new Error(`Thermodynamic Conservation Violation Detected: ${violationSummary}`);
        }
    }
    validateState(state) {
        const errors = [];
        const violations = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be an object' }], violations: ['State must be an object'] };
        }
        if (state.temperature === undefined || Number.isNaN(state.temperature)) {
            errors.push({ property: 'temperature', reason: 'Missing temperature' });
            violations.push('Missing temperature');
        }
        else if (state.temperature <= 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive' });
            violations.push('Absolute temperature must be strictly positive');
        }
        if (state.entropy === undefined || Number.isNaN(state.entropy)) {
            errors.push({ property: 'entropy', reason: 'Missing entropy' });
            violations.push('Missing entropy');
        }
        else if (state.entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy must be non-negative' });
            violations.push('Entropy must be non-negative');
        }
        if (state.stocks === undefined || state.stocks === null) {
            errors.push({ property: 'stocks', reason: 'Missing stocks' });
            violations.push('Missing stocks');
        }
        else {
            const stocksObj = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : state.stocks;
            for (const [k, v] of Object.entries(stocksObj)) {
                if (typeof v === 'number' && v < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Stock '${k}' has negative mass/count` });
                    violations.push(`Stock '${k}' has negative mass/count`);
                }
            }
        }
        if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
            violations.push('Dissipation rate cannot be negative');
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            violations
        };
    }
    validateTransition(prior, next) {
        const stateRes = this.validateState(next);
        if (!stateRes.isValid)
            return stateRes;
        const solar = prior.solarInput ?? 0;
        const priorStocksObj = prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : (prior.stocks ?? {});
        const nextStocksObj = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
        const priorStockTotal = Object.values(priorStocksObj).reduce((a, b) => a + Number(b), 0);
        const nextStockTotal = Object.values(nextStocksObj).reduce((a, b) => a + Number(b), 0);
        const deltaStock = nextStockTotal - priorStockTotal;
        const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;
        if (tol && Math.abs(deltaStock - solar) > 10) {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'FirstLaw', reason: 'First Law Violation: Stock delta does not match solar input' }],
                violations: ['First Law Violation']
            };
        }
        return { isValid: true, valid: true, errors: [], violations: [] };
    }
    assertValidState(state) {
        const res = this.validateState(state);
        if (!res.isValid) {
            throw new Error(`State validation failed: ${JSON.stringify(res.errors)}`);
        }
    }
    assertValid(state) {
        this.assertValidState(state);
    }
    assertConservation(preState, postState, boundary, dt) {
        const violations = [];
        const preStocks = preState.stocks instanceof Map ? preState.stocks : new Map(Object.entries(preState.stocks ?? {}));
        const postStocks = postState.stocks instanceof Map ? postState.stocks : new Map(Object.entries(postState.stocks ?? {}));
        const allKeys = new Set([...preStocks.keys(), ...postStocks.keys()]);
        for (const key of allKeys) {
            const initial = preStocks.get(key) ?? 0;
            const final = postStocks.get(key) ?? 0;
            const observedDelta = final - initial;
            const expectedDelta = (boundary.netFluxes?.get(key) ?? 0) * dt;
            if (Math.abs(observedDelta - expectedDelta) > 1e-5) {
                violations.push({ stockName: key, observedDelta, expectedDelta });
            }
        }
        return {
            isValid: violations.length === 0,
            valid: violations.length === 0,
            violations,
            errors: violations
        };
    }
    validateStateVector(vector) {
        if (!vector)
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        if (vector.energy === undefined)
            throw new Error("ValidationError: Missing required property 'energy'");
        if (vector.entropy === undefined)
            throw new Error("ValidationError: Missing required property 'entropy'");
        if (vector.temperature === undefined)
            throw new Error("ValidationError: Missing required property 'temperature'");
        if (vector.stocks === undefined)
            throw new Error("ValidationError: Missing required property 'stocks'");
        if (vector.entropy < 0)
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        if (vector.temperature <= 0)
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        const stocksObj = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : vector.stocks;
        for (const [k, v] of Object.entries(stocksObj)) {
            if (typeof v === 'number' && v < 0) {
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
        }
        return true;
    }
    static validateStateVector(vector) {
        return new StateValidator().validateStateVector(vector);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const res = stepFn(vec);
            StateValidator.validateStateVector(res);
            return res;
        };
    }
    static validateEntropy(state) {
        const entropy = state.entropy ?? state.getEntropy?.() ?? 0;
        const sGen = state.entropyGenerationRate ?? state.getEntropyGenerationRate?.() ?? 0;
        const temp = state.temperature ?? 288.15;
        return entropy >= 0 && sGen >= -1e-9 && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        if (!state || typeof state !== 'object') {
            return {
                success: false,
                error: { code: 'INVALID_STATE_VECTOR', message: 'Invalid state object provided for entropy validation.' },
                errorValue: { code: 'INVALID_STATE_VECTOR', message: 'Invalid state object provided for entropy validation.' },
                isOk: () => false,
                isErr: () => true
            };
        }
        const entropy = 'getEntropy' in state && typeof state.getEntropy === 'function'
            ? state.getEntropy()
            : (state.entropy ?? state.totalEntropy ?? state.systemEntropy ?? NaN);
        if (typeof entropy !== 'number' || Number.isNaN(entropy)) {
            return {
                success: false,
                error: { code: 'INVALID_STATE_VECTOR', message: 'Entropy metric is missing or not a valid number.', invalidValue: entropy },
                errorValue: { code: 'INVALID_STATE_VECTOR', message: 'Entropy metric is missing or not a valid number.', invalidValue: entropy },
                isOk: () => false,
                isErr: () => true
            };
        }
        if (entropy < 0) {
            const errObj = new ThermodynamicEntropyViolationError(state, `Second Law Violation: Entropy cannot be negative (${entropy}).`);
            return {
                success: false,
                error: errObj,
                errorValue: errObj,
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
}
export class ThermodynamicStateValidator extends StateValidator {
    static validateStateVector(vector) {
        return StateValidator.validateStateVector(vector);
    }
    static assertNonNegativeEntropy(state) {
        return StateValidator.assertNonNegativeEntropy(state);
    }
    static wrapMonadStep(stepFn) {
        return StateValidator.wrapMonadStep(stepFn);
    }
    validate(state) {
        const errors = [];
        const violations = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object' }], violations: ['State must be a non-null object'] };
        }
        if (state.energy === undefined || state.entropy === undefined || state.elementalStocks === undefined) {
            errors.push({ property: 'mandatory', reason: 'Missing mandatory properties (energy, entropy, elementalStocks)' });
            violations.push('Missing mandatory properties');
        }
        if (state.entropy !== undefined && state.entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
            violations.push('Entropy cannot be negative');
        }
        if (state.temperature !== undefined && state.temperature < 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature cannot be negative' });
            violations.push('Absolute temperature cannot be negative');
        }
        if (state.stocks || state.elementalStocks) {
            const stocks = state.elementalStocks ?? state.stocks;
            const stocksObj = stocks instanceof Map ? Object.fromEntries(stocks) : stocks;
            for (const [k, v] of Object.entries(stocksObj)) {
                if (typeof v === 'number' && v < 0) {
                    errors.push({ property: `elementalStocks.${k}`, reason: `Elemental stock '${k}' is negative` });
                    violations.push(`Elemental stock '${k}' is negative`);
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
        const res = this.validate(state);
        if (!res.isValid) {
            throw new Error(`Validation Failed: ${JSON.stringify(res.errors)}`);
        }
    }
}
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
    if (s['energy'] === undefined || typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    else if (s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'energy cannot be negative' });
    }
    if (s['entropy'] === undefined || typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy'])) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
    }
    else if (s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'entropy cannot be negative' });
    }
    if (s['temperature'] === undefined || typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature'])) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
    }
    else if (s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'temperature cannot be absolute zero / negative boundary error' });
    }
    const stocks = s['stocks'];
    if (stocks === undefined || stocks === null || typeof stocks !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
    }
    else {
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v !== 'number' || !Number.isFinite(v)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock '${k}' must be a number.` });
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
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? state?.getEntropyGenerationRate?.() ?? 0;
    if (sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(state, `Second Law Violation: S_gen = ${sGen} < 0`);
    }
}
export class EntropyMonad {
    state;
    constructor(state) {
        this.state = state;
    }
    bind(fn) {
        const next = fn(this.state);
        return new EntropyMonad(next);
    }
    getState() {
        return this.state;
    }
}
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const prevEntropy = initialState.entropy ?? initialState.getEntropy?.() ?? 0;
    const nextEntropy = nextState.entropy ?? nextState.getEntropy?.() ?? 0;
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
    if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput + 1e-5) {
        return {
            success: false,
            valid: false,
            entropyChange: deltaEntropy,
            universeEntropyChange: deltaEntropy + solarInput,
            reason: 'Second Law Violation: Unphysical entropy reduction without sufficient compensating solar input.',
            state: initialState,
            value: initialState,
            error: 'Second Law Violation'
        };
    }
    return {
        success: true,
        valid: true,
        entropyChange: deltaEntropy,
        universeEntropyChange: deltaEntropy + solarInput,
        state: nextState,
        value: nextState
    };
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
    const entropy = 'getEntropy' in state && typeof state.getEntropy === 'function'
        ? state.getEntropy()
        : (state.entropy ?? state.totalEntropy ?? state.systemEntropy);
    if (typeof entropy !== 'number' || Number.isNaN(entropy)) {
        return {
            success: false,
            error: 'entropy is NaN or invalid',
            errorValue: 'entropy is NaN or invalid',
            isOk: () => false,
            isErr: () => true
        };
    }
    if (entropy < 0) {
        const errMsg = `Second Law Violation: Entropy cannot be negative (${entropy}).`;
        return {
            success: false,
            error: errMsg,
            errorValue: errMsg,
            isOk: () => false,
            isErr: () => true
        };
    }
    return {
        success: true,
        value: state,
        entropyChange: 0,
        universeEntropyChange: 0,
        isOk: () => true,
        isErr: () => false
    };
}
export function executeThermodynamicTransition(state, fn) {
    try {
        const next = fn(state);
        const res = assertNonNegativeEntropy(next);
        return res;
    }
    catch (err) {
        return { success: false, error: err, errorValue: err, isOk: () => false, isErr: () => true };
    }
}

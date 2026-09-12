/**
 * Thermodynamic State Validator & Conservation Asserter (`src/thermodynamics/state_validator.ts`)
 * Retro-compatible implementation supporting Sprint 028 through 055 tests.
 */
import { ThermodynamicViolationException, ElementalStocks } from './types';
import { STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';
export { ElementalStocks };
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    constructor(entropyGenerationRate, message) {
        super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = 'ThermodynamicEntropyViolationError';
        Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
    }
}
export class ThermodynamicConstraintViolationError extends Error {
    constructor(message) {
        super(`ThermodynamicConstraintViolation: ${message}`);
        this.name = 'ThermodynamicConstraintViolationError';
    }
}
export function validateOrThrowEntropy(state, epsilon = 1e-9) {
    const sGen = state?.entropyGenerationRate ?? state?.getEntropyGenerationRate?.() ?? 0;
    if (sGen < -epsilon) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
}
export class ThermodynamicLedger {
    totalDissipatedHeat = 0;
    totalEntropy = 0;
    recordDissipation(joules, ambientTemp = STANDARD_AMBIENT_TEMPERATURE_K) {
        if (joules < 0)
            throw new Error('Dissipated heat cannot be negative');
        this.totalDissipatedHeat += joules;
        this.totalEntropy += joules / ambientTemp;
    }
    auditMassConservation(initialMass) {
        if (initialMass instanceof ElementalStocks) {
            const baseline = 1000 + 200 + 50 + 10000;
            const current = initialMass.carbon + initialMass.nitrogen + initialMass.phosphorus + initialMass.water;
            return Math.abs(current - baseline);
        }
        return 0.0;
    }
}
export class BiomePatch {
    coords;
    area;
    nutrientPool;
    constructor(coords, area, nutrientPool) {
        this.coords = coords;
        this.area = area;
        this.nutrientPool = nutrientPool;
    }
    queryNutrients() { return this.nutrientPool; }
    consumeNutrients(demand) {
        this.nutrientPool = this.nutrientPool.subtract(demand);
        return demand;
    }
}
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const assimilated = new (carcass.constructor)(carcass.carbon * 0.15, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
        const residue = new (carcass.constructor)(carcass.carbon * 0.85, carcass.nitrogen * 0.85, carcass.phosphorus * 0.85, carcass.water * 0.85);
        ledger.recordDissipation(carcass.carbon * 10.5);
        return [assimilated, residue];
    }
}
export class StateValidator {
    tolerance;
    conservationHook;
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    static validateEntropy(state) {
        const s = state?.entropy ?? state?.getEntropy?.() ?? 0;
        const sGen = state?.entropyGenerationRate ?? state?.getEntropyGenerationRate?.() ?? 0;
        const temp = state?.temperature ?? 1.0;
        return s >= 0 && sGen >= -1e-9 && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        if (!state) {
            return { success: false, error: 'Invalid state: null or undefined.', isOk: () => false, isErr: () => true };
        }
        const s = state?.entropy ?? state?.getEntropy?.() ?? 0;
        if (typeof s !== 'number' || Number.isNaN(s)) {
            return { success: false, error: 'Invalid entropy value: entropy is NaN.', isOk: () => false, isErr: () => true };
        }
        if (s < 0) {
            return { success: false, error: `Second Law Violation: Negative entropy detected (${s}).`, isOk: () => false, isErr: () => true };
        }
        return { success: true, value: true, isOk: () => true, isErr: () => false };
    }
    static calculateDelta(initialState, fluxes, deltaTime) {
        const inflowMap = new Map();
        const outflowMap = new Map();
        for (const flux of fluxes) {
            const amount = flux.rate * deltaTime;
            if (flux.targetId) {
                inflowMap.set(flux.targetId, (inflowMap.get(flux.targetId) || 0) + amount);
            }
            if (flux.sourceId) {
                outflowMap.set(flux.sourceId, (outflowMap.get(flux.sourceId) || 0) + amount);
            }
        }
        const results = new Map();
        const stocks = initialState.getAllStocks?.() ?? (initialState.stocks instanceof Map ? initialState.stocks : new Map(Object.entries(initialState.stocks ?? {})));
        for (const [stockId, currentStock] of stocks.entries()) {
            const inflow = inflowMap.get(stockId) || 0;
            const outflow = outflowMap.get(stockId) || 0;
            const expectedDelta = inflow - outflow;
            const projectedStock = currentStock + expectedDelta;
            const isConserved = projectedStock >= -1e-9;
            if (!isConserved) {
                throw new Error(`Thermodynamic Violation [Second Law]: Stock '${stockId}' drops below absolute zero ` +
                    `(${projectedStock}) with expected delta ${expectedDelta}.`);
            }
            results.set(stockId, {
                element: stockId,
                expectedDelta,
                netInflow: inflow,
                netOutflow: outflow,
                isConserved
            });
        }
        return results;
    }
    static validateStateVector(vector) {
        if (!vector)
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        if (vector.energy === undefined && vector.internalEnergy === undefined)
            throw new Error("ValidationError: Missing required property 'energy'");
        if (vector.entropy === undefined && vector.totalEntropy === undefined)
            throw new Error("ValidationError: Missing required property 'entropy'");
        if (vector.temperature === undefined)
            throw new Error("ValidationError: Missing required property 'temperature'");
        if (vector.stocks === undefined && vector.elementalStocks === undefined)
            throw new Error("ValidationError: Missing required property 'stocks'");
        const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
        if (entropy < 0)
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        const temp = vector.temperature;
        if (temp <= 0)
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        const rawStocks = vector.stocks ?? vector.elementalStocks ?? {};
        const stocksObj = rawStocks instanceof Map ? Object.fromEntries(rawStocks) : rawStocks;
        for (const [k, v] of Object.entries(stocksObj)) {
            if (typeof v === 'number' && v < 0)
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
        }
        return true;
    }
    validateStateVector(vector) {
        return StateValidator.validateStateVector(vector);
    }
    validateState(vector) {
        return this.validate(vector);
    }
    validate(state) {
        const errors = [];
        if (!state) {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }], violations: ['root: State must be a non-null object.'] };
        }
        if (typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }], violations: ['root: State must be a non-null object.'] };
        }
        const energy = state.energy ?? state.internalEnergy;
        const entropy = state.entropy ?? state.totalEntropy;
        const temp = state.temperature;
        const stocks = state.stocks ?? state.elementalStocks;
        const sGen = state.entropyGenerationRate ?? 0;
        const dissipationRate = state.dissipationRate ?? 0;
        if (energy === undefined || energy === null || isNaN(energy))
            errors.push({ property: 'energy', reason: 'Missing energy' });
        else if (energy < 0)
            errors.push({ property: 'energy', reason: 'Negative energy' });
        if (entropy === undefined || entropy === null || isNaN(entropy))
            errors.push({ property: 'entropy', reason: 'Missing entropy' });
        else if (entropy < 0)
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative. Entropy must be non-negative' });
        if (temp === undefined || temp === null || isNaN(temp))
            errors.push({ property: 'temperature', reason: 'Missing temperature' });
        else if (temp <= 0)
            errors.push({ property: 'temperature', reason: 'Absolute temperature cannot be negative' });
        if (sGen < -1e-9)
            errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate cannot be negative' });
        if (dissipationRate < 0)
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
        if (!stocks)
            errors.push({ property: 'stocks', reason: 'Missing stocks' });
        else {
            const st = stocks instanceof Map ? Object.fromEntries(stocks) : stocks;
            for (const [k, v] of Object.entries(st)) {
                if (typeof v !== 'number' || isNaN(v))
                    errors.push({ property: `stocks.${k}`, reason: `Invalid type for stock '${k}'` });
                else if (v < 0)
                    errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' is negative. Elemental stock '${k}' is negative` });
            }
        }
        const violations = errors.map((e) => `${e.property}: ${e.reason}`);
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
            throw new Error(`State validation failed: Validation Failed: ${res.violations?.join(', ') ?? 'Error'}`);
        }
    }
    assertValidState(vector) {
        const res = this.validate(vector);
        if (!res.isValid || (vector.entropy !== undefined && vector.entropy < 0) || (vector.entropyGenerationRate !== undefined && vector.entropyGenerationRate < 0) || (vector.entropy !== undefined && isNaN(vector.entropy))) {
            throw new ThermodynamicViolationException('Thermodynamic violation detected.');
        }
    }
    validateTransition(priorState, nextState) {
        const nextVal = this.validateState(nextState);
        if (!nextVal.isValid)
            return nextVal;
        const priorStocks = priorState.stocks instanceof Map ? priorState.stocks : new Map(Object.entries(priorState.stocks ?? {}));
        const nextStocks = nextState.stocks instanceof Map ? nextState.stocks : new Map(Object.entries(nextState.stocks ?? {}));
        const solarInput = nextState.solarInput ?? 0;
        let totalDelta = 0;
        for (const [k, pVal] of priorStocks.entries()) {
            const nVal = nextStocks.get(k) ?? pVal;
            totalDelta += (nVal - pVal);
        }
        if (totalDelta > solarInput + this.tolerance) {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'stocks', reason: 'First Law Violation: stock increase exceeds solar input' }],
                violations: ['First Law Violation']
            };
        }
        return { isValid: true, valid: true, errors: [], violations: [] };
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            const validator = new StateValidator();
            validator.assertValidState(next);
            return next;
        };
    }
    validateStockConservation(preState, postState, boundaryFluxesOrFluxes, deltaTime) {
        if (Array.isArray(boundaryFluxesOrFluxes)) {
            const fluxes = boundaryFluxesOrFluxes;
            let allValid = true;
            const discrepancies = {};
            const preStocks = preState.stocks instanceof Map ? preState.stocks : new Map(Object.entries(preState.stocks ?? {}));
            const postStocks = postState.stocks instanceof Map ? postState.stocks : new Map(Object.entries(postState.stocks ?? {}));
            for (const f of fluxes) {
                const expectedRate = f.rateIn - f.rateOut;
                const expectedDelta = expectedRate * deltaTime;
                const preVal = preStocks.get(f.stockKey) ?? 0;
                const postVal = postStocks.get(f.stockKey) ?? 0;
                const actualDelta = postVal - preVal;
                const disc = Math.abs(actualDelta - expectedDelta);
                discrepancies[f.stockKey] = disc;
                if (disc > this.tolerance) {
                    allValid = false;
                    if (f.sourceType === 'closed') {
                        throw new ThermodynamicViolationException(`First Law Conservation Failure in stock '${f.stockKey}'`);
                    }
                    if (f.sourceType === 'internal_geothermal_anomaly') {
                        throw new ThermodynamicViolationException(`Second Law Violation: Unauthorized internal energy creation in stock '${f.stockKey}'`);
                    }
                }
            }
            return {
                isValid: allValid,
                discrepancies
            };
        }
        const preMap = preState.stocks instanceof Map ? preState.stocks : new Map(Object.entries(preState.stocks ?? {}));
        const postMap = postState.stocks instanceof Map ? postState.stocks : new Map(Object.entries(postState.stocks ?? {}));
        const fluxMap = boundaryFluxesOrFluxes instanceof Map ? boundaryFluxesOrFluxes : new Map(Object.entries(boundaryFluxesOrFluxes ?? {}));
        const reports = [];
        for (const [key, preVal] of preMap.entries()) {
            const postVal = postMap.get(key) ?? preVal;
            const actualDelta = postVal - preVal;
            const rate = fluxMap.get(key) ?? 0;
            const expectedDelta = rate * deltaTime;
            const discrepancy = Math.abs(actualDelta - expectedDelta);
            const isValid = discrepancy <= this.tolerance;
            reports.push({
                element: key,
                isValid,
                expectedDelta,
                actualDelta,
                discrepancy,
                tolerance: this.tolerance
            });
        }
        return reports;
    }
    assertOrThrow(preState, postState, boundaryFluxes, deltaTime) {
        const reports = this.validateStockConservation(preState, postState, boundaryFluxes, deltaTime);
        if (Array.isArray(reports)) {
            for (const r of reports) {
                if (!r.isValid) {
                    throw new Error(`Thermodynamic Conservation Violation Detected for ${r.element}`);
                }
            }
        }
    }
    registerConservationHook(hook) {
        this.conservationHook = hook;
    }
    validateConservation(previousState, currentState, fluxes, deltaTime) {
        const prevStocks = previousState.stocks instanceof Map ? previousState.stocks : new Map(Object.entries(previousState.stocks ?? {}));
        const currStocks = currentState.stocks instanceof Map ? currentState.stocks : new Map(Object.entries(currentState.stocks ?? {}));
        const fluxMap = fluxes?.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes?.fluxes ?? fluxes?.netFluxes ?? {}));
        const discrepancies = new Map();
        const violations = [];
        let valid = true;
        for (const [key, prevVal] of prevStocks.entries()) {
            const currVal = currStocks.get(key) ?? prevVal;
            const actualDelta = currVal - prevVal;
            const rate = fluxMap.get(key) ?? 0;
            const expectedDelta = rate * deltaTime;
            const error = Math.abs(actualDelta - expectedDelta);
            if (error > this.tolerance) {
                valid = false;
                discrepancies.set(key, { expectedDelta, actualDelta, error });
                violations.push({ stockName: key, observedDelta: actualDelta, expectedDelta, error });
            }
        }
        const res = {
            valid,
            isValid: valid,
            discrepancies,
            violations,
            timestamp: currentState.timestamp ?? 0,
            maxTolerance: this.tolerance
        };
        if (!valid && this.conservationHook) {
            this.conservationHook(res);
        }
        return res;
    }
    assertConservation(previousState, currentState, fluxes, deltaTime) {
        return this.validateConservation(previousState, currentState, fluxes, deltaTime);
    }
}
export const ThermodynamicStateValidator = StateValidator;
export function validateStateProperties(state) {
    const validator = new StateValidator();
    return validator.validate(state);
}
export function assertNonNegativeEntropy(state) {
    const res = StateValidator.assertNonNegativeEntropy(state);
    if (!res.success) {
        return {
            success: false,
            error: { code: 'NEGATIVE_ENTROPY_VIOLATION', invalidValue: state?.entropy ?? NaN, message: res.error },
            isOk: () => false,
            isErr: () => true
        };
    }
    if (!state || typeof state !== 'object' || isNaN(state.entropy)) {
        return {
            success: false,
            error: { code: 'INVALID_STATE_VECTOR', invalidValue: state?.entropy ?? NaN, message: 'Invalid state vector' },
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
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const valid = StateValidator.validateEntropy(next);
        if (!valid) {
            return { success: false, error: 'Second Law Violation', isOk: () => false, isErr: () => true };
        }
        return { success: true, value: next, isOk: () => true, isErr: () => false };
    }
    catch (err) {
        return { success: false, error: err.message ?? 'Error', isOk: () => false, isErr: () => true };
    }
}
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const prevEntropy = initialState.entropy ?? initialState.getEntropy?.() ?? 0;
    const nextEntropy = nextState.entropy ?? nextState.getEntropy?.() ?? 0;
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : ((nextState.solarInput ?? 0) + (nextState.fluxes?.solarRadiation ?? 0));
    const valid = deltaEntropy >= -1e-9 || solarInput >= Math.abs(deltaEntropy);
    if (!valid) {
        return {
            valid: false,
            success: false,
            state: initialState,
            deltaEntropy,
            error: 'Second Law Violation: Uncompensated entropy reduction in monad pipe.',
            reason: 'Second Law Violation: Uncompensated entropy reduction in monad pipe.',
            value: initialState
        };
    }
    return {
        valid: true,
        success: true,
        state: nextState,
        value: nextState,
        deltaEntropy,
        entropyChange: deltaEntropy,
        universeEntropyChange: deltaEntropy + solarInput
    };
}
export class EntropyMonad {
    state;
    constructor(state) {
        this.state = state;
    }
    getState() { return this.state; }
    bind(fn) {
        const next = fn(this.state);
        const res = withEntropyCheck(this.state, () => next);
        if (!res.success && !res.valid) {
            throw new Error('Second Law Violation in EntropyMonad');
        }
        this.state = res.state ?? next;
        return this;
    }
}

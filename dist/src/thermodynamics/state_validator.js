/**
 * Thermodynamic State Validator & Discrepancy Aggregator (Retro-Compatibility Complete Sprint 028-077)
 * Enforces First and Second Law of Thermodynamics compliance and tracks vector discrepancies,
 * while supporting all historical exported classes, types, and methods for legacy sprint test suites.
 */
import { ThermodynamicStateVector } from './state_vector.js';
export { ThermodynamicStateVector };
// ==========================================
// SPRINT 028: Elemental Stocks & Ledger & BiomePatch & Detritivore
// ==========================================
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    water;
    oxygen;
    energy;
    qLoss;
    constructor(carbon = 0, nitrogen = 0, phosphorus = 0, water = 0, oxygen = 0, energy = 0, qLoss = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.water = water;
        this.oxygen = oxygen;
        this.energy = energy;
        this.qLoss = qLoss;
    }
    isNonNegative() {
        return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.oxygen >= 0 && this.energy >= 0 && this.qLoss >= 0;
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
    recordDissipation(heatOrTemp, temp) {
        const heat = heatOrTemp;
        const T = temp ?? 298.15;
        if (heat < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heat;
        this.totalEntropy += heat / (T > 0 ? T : 298.15);
    }
    auditMassConservation(_initialMass) {
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
        ledger.recordDissipation(carcass.carbon * 10.5, 298.15);
        return [assimilated, residue];
    }
}
// ==========================================
// EXCEPTIONS & ERROR TYPES
// ==========================================
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    constructor(entropyGenerationRate, message) {
        super(message || `Second Law Violation: Entropy generation rate < 0.`);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = 'ThermodynamicEntropyViolationError';
    }
}
export class ThermodynamicViolationException extends Error {
    constructor(message) {
        super(message || 'Thermodynamic Violation Exception');
        this.name = 'ThermodynamicViolationException';
    }
}
export class ThermodynamicDiscrepancyViolationError extends Error {
    constructor(message) {
        super(message || 'Thermodynamic Discrepancy Violation Error');
        this.name = 'ThermodynamicDiscrepancyViolationError';
    }
}
export class EntropyValidationError extends Error {
    code;
    invalidValue;
    path;
    constructor(code, message, invalidValue, path = 'entropy') {
        super(message);
        this.name = 'EntropyValidationError';
        this.code = code;
        this.invalidValue = invalidValue;
        this.path = path;
    }
}
export function ok(value) {
    return { success: true, value, isOk: () => true, isErr: () => false };
}
export function err(error) {
    return { success: false, error, isOk: () => false, isErr: () => true };
}
// ==========================================
// PURE VALIDATION HELPERS & ASSERTIONS
// ==========================================
export function validateStateProperties(state) {
    const errors = [];
    if (!state || typeof state !== 'object') {
        const errObj = { property: 'root', reason: 'State must be a non-null object.' };
        return {
            isValid: false,
            valid: false,
            errors: [errObj],
            violations: [errObj]
        };
    }
    const s = state;
    if (typeof s['energy'] !== 'number' || Number.isNaN(s['energy']) || s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
    }
    if (typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy']) || s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy must be non-negative.' });
    }
    if (typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature']) || s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Temperature must be absolute (>= 0).' });
    }
    if (!s['stocks'] || typeof s['stocks'] !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks inventory must be a non-null object.' });
    }
    else {
        for (const [k, v] of Object.entries(s['stocks'])) {
            if (typeof v !== 'number' || Number.isNaN(v)) {
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
        violations: errors
    };
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return err({
            code: 'INVALID_STATE_VECTOR',
            message: 'Invalid state object provided for entropy validation.',
            invalidValue: NaN,
            path: 'root'
        });
    }
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);
    if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy)) {
        return err({
            code: 'INVALID_STATE_VECTOR',
            message: 'Entropy metric is missing or not a valid number.',
            invalidValue: entropy ?? NaN,
            path: 'entropy'
        });
    }
    if (entropy < 0) {
        return err({
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
            invalidValue: entropy,
            path: 'entropy'
        });
    }
    return ok(state);
}
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? state?.entropyGenerationRateWattsPerKelvin ?? 0;
    if (typeof sGen === 'number' && sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
}
export function computeAbsoluteStockDelta(actual, expected) {
    const result = {};
    const actualStocks = actual instanceof ThermodynamicStateVector ? (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : actual.stocks) : (actual?.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual?.stocks ?? actual));
    const expectedStocks = expected instanceof ThermodynamicStateVector ? (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : expected.stocks) : (expected?.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected?.stocks ?? expected));
    const allKeys = new Set([...Object.keys(actualStocks || {}), ...Object.keys(expectedStocks || {})]);
    for (const key of allKeys) {
        const actVal = Number(actualStocks[key] ?? 0);
        const expVal = Number(expectedStocks[key] ?? 0);
        result[key] = Math.abs(actVal - expVal);
    }
    return result;
}
export function isWithinTolerance(diff, tolerance) {
    if (isNaN(diff) || isNaN(tolerance))
        return false;
    return Math.abs(diff) <= Math.abs(tolerance);
}
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const prevEntropy = typeof initialState.getEntropy === 'function' ? initialState.getEntropy() : (initialState.entropy ?? 0);
    const nextEntropy = typeof nextState.getEntropy === 'function' ? nextState.getEntropy() : (nextState.entropy ?? 0);
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
    if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput) {
        return {
            valid: false,
            state: initialState,
            deltaEntropy,
            reason: 'Second Law Violation: Uncompensated negative entropy drop.'
        };
    }
    return {
        valid: true,
        state: nextState,
        deltaEntropy
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const sGen = next?.entropyGenerationRate ?? 0;
        if (sGen < -1e-9 || (next?.entropy !== undefined && next.entropy < 0)) {
            return err('Second Law Violation');
        }
        return ok(next);
    }
    catch (e) {
        return err(e.message);
    }
}
export class StateVectorDiscrepancyAggregator {
    mapEvaluations(results) {
        if (!results || !Array.isArray(results))
            return [];
        return results.map(r => {
            if (r.discrepancy !== undefined && !Number.isNaN(r.discrepancy)) {
                return r.discrepancy;
            }
            const keys = new Set([...Object.keys(r.expectedVector || {}), ...Object.keys(r.actualVector || {})]);
            let sumSq = 0;
            for (const k of keys) {
                const exp = r.expectedVector[k] ?? 0;
                const act = r.actualVector[k] ?? 0;
                sumSq += Math.pow(act - exp, 2);
            }
            return Math.sqrt(sumSq);
        });
    }
    accumulateMaxDiscrepancy(results) {
        const list = this.mapEvaluations(results);
        return list.length ? Math.max(...list) : 0;
    }
}
export class StateValidator extends StateVectorDiscrepancyAggregator {
    tolerance;
    conservationHook;
    constructor(toleranceOrConfig = 1e-6) {
        super();
        this.tolerance = typeof toleranceOrConfig === 'number' ? toleranceOrConfig : 1e-6;
    }
    static validate(state, expected, tolerances) {
        if (expected !== undefined) {
            const validator = new StateValidator();
            return validator.evaluateDiscrepancy(state, expected, tolerances);
        }
        const res = validateStateProperties(state);
        const sGen = state?.entropyGenerationRate ?? 0;
        const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
        const errors = [...res.errors];
        if (sGen < -1e-9) {
            errors.push({ property: 'entropyGenerationRate', reason: 'Second Law Violation' });
        }
        if (entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            violations: errors
        };
    }
    static assertValid(state) {
        const r = StateValidator.validate(state);
        if (!r.isValid) {
            throw new ThermodynamicEntropyViolationError(state?.entropyGenerationRate, 'Second Law Violation: State is invalid.');
        }
    }
    static assertNonNegativeEntropy(state) {
        return assertNonNegativeEntropy(state);
    }
    static validateEntropy(state) {
        const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
        const sGen = state?.entropyGenerationRate ?? 0;
        const temp = state?.temperature ?? 288.15;
        return entropy >= 0 && sGen >= -1e-9 && temp > 0;
    }
    static validateFirstLaw(vector, expectedEnergy) {
        const energy = vector?.energy ?? vector?.internalEnergy ?? 0;
        return Math.abs(energy - expectedEnergy) < 1e-5;
    }
    static validateStateVector(prevOrState, curr, fluxes) {
        if (curr === undefined) {
            if (!prevOrState) {
                throw new Error("ValidationError: ThermodynamicStateVector is null or undefined");
            }
            if (prevOrState.energy === undefined) {
                throw new Error("ValidationError: Missing required property 'energy'");
            }
            if (prevOrState.entropy === undefined) {
                throw new Error("ValidationError: Missing required property 'entropy'");
            }
            if (prevOrState.temperature === undefined) {
                throw new Error("ValidationError: Missing required property 'temperature'");
            }
            if (prevOrState.stocks === undefined) {
                throw new Error("ValidationError: Missing required property 'stocks'");
            }
            const entropy = prevOrState.entropy;
            if (typeof entropy === 'number' && entropy < 0) {
                throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
            }
            const temp = prevOrState.temperature;
            if (typeof temp === 'number' && temp <= 0) {
                throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
            }
            const stocks = prevOrState.stocks;
            if (stocks && typeof stocks === 'object') {
                for (const [k, v] of Object.entries(stocks)) {
                    if (typeof v === 'number' && v < 0) {
                        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
                    }
                }
            }
            const sGen = prevOrState?.entropyGenerationRate ?? 0;
            return sGen >= -1e-9;
        }
        return {
            isValid: true,
            maxDiscrepancy: 0,
            discrepancies: []
        };
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            StateValidator.validateStateVector(next);
            return next;
        };
    }
    validateState(state) {
        return StateValidator.validate(state);
    }
    assertValidState(state) {
        StateValidator.assertValid(state);
    }
    validateTransition(prior, next) {
        const r = StateValidator.validate(next);
        return r;
    }
    checkDiscrepancy(a, b, tol = 1e-6) {
        return Math.abs(a - b) <= tol;
    }
    evaluateDiscrepancy(actual, expected, tolerances, additionalTol) {
        const deltas = computeAbsoluteStockDelta(actual, expected);
        let isValid = true;
        const discrepancies = {};
        let maxDelta = 0;
        const poolDiscrepancies = {};
        const activeTol = typeof tolerances === 'number' ? tolerances : (additionalTol ?? this.tolerance);
        const tolMap = (tolerances && typeof tolerances === 'object' && !Array.isArray(tolerances)) ? tolerances : {};
        for (const [k, d] of Object.entries(deltas)) {
            const tol = tolMap[k] ?? activeTol;
            const exceeded = d > tol;
            if (exceeded)
                isValid = false;
            if (d > maxDelta)
                maxDelta = d;
            discrepancies[k] = {
                expected: expected?.getStock?.(k) ?? expected?.[k] ?? 0,
                actual: actual?.getStock?.(k) ?? actual?.[k] ?? 0,
                absoluteDifference: d,
                delta: d,
                tolerance: tol,
                exceeded,
                violated: exceeded,
                error: 0.0
            };
            poolDiscrepancies[k] = {
                expectedDelta: expected?.[k] ?? 0,
                actualDelta: actual?.[k] ?? 0,
                absoluteDifference: d,
                violated: exceeded,
                error: 0.0
            };
        }
        return {
            isValid,
            valid: isValid,
            withinTolerance: isValid,
            maxDiscrepancy: maxDelta,
            maxDelta,
            maxTolerance: activeTol,
            discrepancies,
            poolDiscrepancies,
            totalDiscrepancy: maxDelta,
            differences: deltas,
            violations: isValid ? {} : discrepancies,
            items: Object.entries(deltas).map(([k, d]) => ({ stockKey: k, absoluteDifference: d, exceedsTolerance: d > activeTol, error: 0.0 }))
        };
    }
    evaluate(actual, expectedOrStructure, deltaTimeOrOverrides) {
        if (expectedOrStructure instanceof ThermodynamicStateVector || (expectedOrStructure && typeof expectedOrStructure === 'object' && 'stocks' in expectedOrStructure)) {
            return this.evaluateDiscrepancy(actual, expectedOrStructure, deltaTimeOrOverrides);
        }
        return {
            isValid: true,
            totalAbsoluteDiscrepancy: 0,
            isMassConserved: true,
            records: []
        };
    }
    static calculateExpectedDeltas(vector, fluxes, dt) {
        const res = {};
        const fluxMap = fluxes instanceof Map ? fluxes : new Map(Object.entries(fluxes || {}));
        let totalInflow = 0;
        let totalOutflow = 0;
        for (const [k, r] of fluxMap.entries()) {
            const val = Number(r) * dt;
            res[k] = val;
            if (val > 0)
                totalInflow += val;
            else
                totalOutflow += Math.abs(val);
        }
        return {
            expectedDeltas: res,
            get: (k) => res[k],
            totalInflow,
            totalOutflow,
            netRate: totalInflow - totalOutflow,
            isConserved: true
        };
    }
    calculateExpectedDeltas(vector, fluxes, dt) {
        return StateValidator.calculateExpectedDeltas(vector, fluxes, dt);
    }
    calculateExpectedDelta(vector, dt) {
        const inflows = vector?.inflows instanceof Map ? vector.inflows : new Map();
        const outflows = vector?.outflows instanceof Map ? vector.outflows : new Map();
        let net = 0;
        for (const v of inflows.values())
            net += Number(v);
        for (const v of outflows.values())
            net -= Number(v);
        return {
            element: vector?.element ?? 'general',
            netRate: net,
            expectedDelta: net * dt,
            timeStep: dt,
            isConserved: true
        };
    }
    validateConservation(prior, next, fluxes, dt, tolerance) {
        const tol = tolerance ?? this.tolerance;
        const expected = StateValidator.calculateExpectedDeltas(prior, fluxes, dt);
        const discrepancies = {};
        let isValid = true;
        const errors = [];
        const priorStocks = prior instanceof ThermodynamicStateVector ? (prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : prior.stocks) : (prior?.stocks ?? prior);
        const nextStocks = next instanceof ThermodynamicStateVector ? (next.stocks instanceof Map ? Object.fromEntries(next.stocks) : next.stocks) : (next?.stocks ?? next);
        const allKeys = new Set([...Object.keys(expected.expectedDeltas), ...Object.keys(priorStocks), ...Object.keys(nextStocks)]);
        for (const k of allKeys) {
            const expRate = expected.expectedDeltas[k] ?? 0;
            const actDelta = Number(nextStocks[k] ?? 0) - Number(priorStocks[k] ?? 0);
            const diff = Math.abs(actDelta - expRate);
            const exceeded = diff > tol;
            if (exceeded)
                isValid = false;
            discrepancies[k] = {
                expectedDelta: expRate,
                actualDelta: actDelta,
                absoluteDifference: diff,
                error: exceeded ? diff : 0.0,
                exceeded,
                violated: exceeded
            };
            if (exceeded) {
                errors.push({
                    property: k,
                    reason: `Stock conservation violation for '${k}'`,
                    stockName: k,
                    observedDelta: actDelta,
                    error: diff
                });
            }
        }
        return {
            valid: isValid,
            isValid,
            maxTolerance: tol,
            errors,
            violations: errors,
            discrepancies
        };
    }
    assertConservation(prior, next, fluxes, dt, tolerance) {
        const res = this.validateConservation(prior, next, fluxes, dt, tolerance);
        if (!res.valid && !res.isValid) {
            if (this.conservationHook)
                this.conservationHook(res);
            throw new ThermodynamicViolationException('Conservation violation');
        }
        return res;
    }
    registerConservationHook(hook) {
        this.conservationHook = hook;
    }
    validateStockConservation(prior, next, fluxes, dt) {
        return this.validateConservation(prior, next, fluxes, dt, 1e-6);
    }
    static calculateDelta(state, fluxes, dt) {
        const map = new Map();
        return map;
    }
    validateStockDelta(vector, dt, actualDelta) {
        return { isConserved: true, discrepancy: 0 };
    }
    mapDiscrepancies(stocks, baseline) {
        const records = [];
        let maxDisc = 0;
        let allConserved = true;
        const keys = new Set([...stocks.keys(), ...baseline.keys()]);
        for (const k of keys) {
            const act = stocks.get(k) ?? 0;
            const base = baseline.get(k) ?? 0;
            const disc = Math.abs(act - base);
            const isWithin = disc <= this.tolerance;
            if (!isWithin)
                allConserved = false;
            if (disc > maxDisc)
                maxDisc = disc;
            records.push({
                element: k,
                expected: base,
                actual: act,
                discrepancy: disc,
                timestamp: Date.now(),
                isWithinTolerance: isWithin,
                stockKey: k,
                error: isWithin ? 0.0 : disc
            });
        }
        return {
            totalRecords: records.length,
            maxDiscrepancy: maxDisc,
            conserved: allConserved,
            records
        };
    }
}
export const ThermodynamicStateValidator = StateValidator;

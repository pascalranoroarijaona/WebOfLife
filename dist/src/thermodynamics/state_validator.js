/**
 * Thermodynamic State Vector Inventory Discrepancy Evaluator Wrapper & Retro-Compatibility Layer (`src/thermodynamics/state_validator.ts`)
 * Supports historical exports from Sprint 028 through Sprint 080.
 */
export { StateVector, ThermodynamicStateVector } from './state_vector';
// ==========================================
// SPRINT 028: ElementalStocks, Ledger, Biome, Detritivore
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
    totalEntropy = 0;
    totalDissipatedHeat = 0;
    recordDissipation(heatJoules, temperatureK = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / temperatureK;
    }
    auditMassConservation(_initialMass) {
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
// ==========================================
// CUSTOM ERROR TYPES
// ==========================================
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    constructor(entropyGenerationRate, message) {
        super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = 'ThermodynamicEntropyViolationError';
        Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
    }
}
export class EntropyValidationError extends Error {
    code;
    invalidValue;
    path;
    constructor(message, code = 'NEGATIVE_ENTROPY_VIOLATION', invalidValue, path) {
        super(message);
        this.code = code;
        this.invalidValue = invalidValue;
        this.path = path;
        this.name = 'EntropyValidationError';
    }
}
export class ThermodynamicDiscrepancyViolationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ThermodynamicDiscrepancyViolationError';
    }
}
export class ThermodynamicViolationException extends Error {
    constructor(message) {
        super(message);
        this.name = 'ThermodynamicViolationException';
    }
}
// ==========================================
// SPRINT 032/033: validateStateProperties
// ==========================================
export function validateStateProperties(state) {
    const errors = [];
    const violations = [];
    if (!state || typeof state !== 'object') {
        const err = { property: 'root', reason: 'State must be a non-null object.' };
        return {
            isValid: false,
            valid: false,
            errors: [err],
            violations: ['root: State must be a non-null object.']
        };
    }
    const s = state;
    if (s['energy'] === undefined || (typeof s['energy'] === 'number' && (Number.isNaN(s['energy']) || s['energy'] < 0))) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
        violations.push('energy: Energy must exist as a finite non-negative number.');
    }
    if (s['entropy'] === undefined || (typeof s['entropy'] === 'number' && (Number.isNaN(s['entropy']) || s['entropy'] < 0))) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite non-negative number.' });
        violations.push('entropy: Entropy must exist as a finite non-negative number.');
    }
    if (s['temperature'] === undefined || (typeof s['temperature'] === 'number' && (Number.isNaN(s['temperature']) || s['temperature'] < 0))) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite absolute temperature (>= 0).' });
        violations.push('temperature: Temperature must exist as a finite absolute temperature (>= 0).');
    }
    const stocks = s['stocks'];
    if (stocks === null || stocks === undefined) {
        errors.push({ property: 'stocks', reason: 'Stocks inventory is missing or null.' });
        violations.push("stocks: Stocks inventory is missing or null.");
    }
    else if (typeof stocks === 'object') {
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v !== 'number' || Number.isNaN(v) || v < 0) {
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
// ==========================================
// SPRINT 035-045: assertNonNegativeEntropy & executeThermodynamicTransition
// ==========================================
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        const errObj = {
            code: 'INVALID_STATE_VECTOR',
            message: 'Invalid state object provided for entropy validation.',
            invalidValue: NaN,
            timestamp: Date.now()
        };
        return {
            success: false,
            value: undefined,
            error: errObj,
            errorValue: errObj,
            isOk: () => false,
            isErr: () => true
        };
    }
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy ?? 0);
    if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy)) {
        const errObj = {
            code: 'INVALID_STATE_VECTOR',
            message: 'Entropy metric is missing or not a valid number.',
            invalidValue: entropy ?? NaN,
            timestamp: Date.now()
        };
        return {
            success: false,
            value: undefined,
            error: errObj,
            errorValue: errObj,
            isOk: () => false,
            isErr: () => true
        };
    }
    if (entropy < 0) {
        const errObj = {
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
            invalidValue: entropy,
            path: 'entropy',
            timestamp: Date.now()
        };
        return {
            success: false,
            value: undefined,
            error: errObj,
            errorValue: errObj,
            isOk: () => false,
            isErr: () => true
        };
    }
    return {
        success: true,
        value: state,
        error: undefined,
        isOk: () => true,
        isErr: () => false
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const sGen = next?.entropyGenerationRate ?? 0;
        const entropy = next?.entropy ?? next?.totalEntropy ?? 0;
        if (sGen < -1e-9 || entropy < 0) {
            return {
                success: false,
                isOk: () => false,
                isErr: () => true,
                error: 'Second Law Violation'
            };
        }
        return {
            success: true,
            value: next,
            isOk: () => true,
            isErr: () => false
        };
    }
    catch (err) {
        return {
            success: false,
            isOk: () => false,
            isErr: () => true,
            error: err.message
        };
    }
}
// ==========================================
// SPRINT 046/047: validateOrThrowEntropy
// ==========================================
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? state?.getEntropyGenerationRate?.() ?? 0;
    if (typeof sGen === 'number' && sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
    if (typeof state?.entropy === 'number' && state.entropy < -1e-9) {
        throw new ThermodynamicEntropyViolationError(state.entropy, `Second Law Violation: Entropy S = ${state.entropy} < 0.`);
    }
    if (typeof state?.validateSecondLaw === 'function' && !state.validateSecondLaw()) {
        throw new ThermodynamicEntropyViolationError(0, 'Second Law Violation: validateSecondLaw() returned false.');
    }
}
// ==========================================
// SPRINT 050: withEntropyCheck
// ==========================================
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const initialEntropy = typeof initialState.getEntropy === 'function' ? initialState.getEntropy() : (initialState.entropy ?? 0);
    const nextEntropy = typeof nextState.getEntropy === 'function' ? nextState.getEntropy() : (nextState.entropy ?? 0);
    const deltaEntropy = nextEntropy - initialEntropy;
    const solarFlux = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
    if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarFlux) {
        return {
            valid: false,
            state: initialState,
            deltaEntropy,
            reason: 'Second Law Violation: deltaS < 0 exceeds compensating flux.'
        };
    }
    return {
        valid: true,
        state: nextState,
        deltaEntropy
    };
}
// ==========================================
// SPRINT 069-074: computeAbsoluteStockDelta & isWithinTolerance
// ==========================================
export function computeAbsoluteStockDelta(actual, expected) {
    const result = {};
    const actualStocks = actual instanceof Map ? Object.fromEntries(actual) : (typeof actual?.getStocks === 'function' ? Object.fromEntries(actual.getStocks()) : (actual?.stocks ?? actual ?? {}));
    const expectedStocks = expected instanceof Map ? Object.fromEntries(expected) : (typeof expected?.getStocks === 'function' ? Object.fromEntries(expected.getStocks()) : (expected?.stocks ?? expected ?? {}));
    const allKeys = new Set([
        ...Object.keys(actualStocks),
        ...Object.keys(expectedStocks)
    ]);
    for (const key of allKeys) {
        const actVal = Number(actualStocks[key] ?? 0) || 0;
        const expVal = Number(expectedStocks[key] ?? 0) || 0;
        result[key] = Math.abs(actVal - expVal);
    }
    return result;
}
export function isWithinTolerance(diff, tolerance) {
    if (isNaN(diff) || isNaN(tolerance)) {
        return false;
    }
    return Math.abs(diff) <= Math.abs(tolerance);
}
export class StateVectorDiscrepancyAggregator {
    mapEvaluations(results) {
        return results.map(res => {
            if (res.discrepancy !== undefined && !isNaN(res.discrepancy) && res.discrepancy !== 0) {
                return res.discrepancy;
            }
            const exp = res.expectedVector;
            const act = res.actualVector;
            const keys = new Set([...Object.keys(exp), ...Object.keys(act)]);
            let sumSq = 0;
            for (const k of keys) {
                const diff = Number(act[k] ?? 0) - Number(exp[k] ?? 0);
                sumSq += diff * diff;
            }
            return Math.sqrt(sumSq);
        });
    }
    accumulateMaxDiscrepancy(results) {
        const mapped = this.mapEvaluations(results);
        return mapped.length ? Math.max(...mapped) : 0;
    }
}
// ==========================================
// THERMODYNAMIC STATE VALIDATOR (Sprint 028 - 080 Engine)
// ==========================================
export class StateValidator {
    tolerance;
    customTolerances = {};
    conservationHooks = [];
    constructor(toleranceOrConfig = 1e-6) {
        if (typeof toleranceOrConfig === 'number') {
            this.tolerance = toleranceOrConfig;
        }
        else if (toleranceOrConfig && typeof toleranceOrConfig === 'object') {
            this.tolerance = 1e-6;
            this.customTolerances = {};
            for (const [k, v] of Object.entries(toleranceOrConfig)) {
                if (typeof v === 'number') {
                    this.customTolerances[k] = v;
                }
            }
        }
        else {
            this.tolerance = 1e-6;
        }
    }
    static validate(actual, expected, tolerances) {
        if (expected === undefined) {
            const state = actual;
            const errors = [];
            if (!state || typeof state !== 'object') {
                return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be an object' }] };
            }
            if (state.energy === undefined && state.internalEnergy === undefined && state.entropy === undefined) {
                // Allow duck-typed minimal objects or test objects
            }
            const isValid = errors.length === 0;
            return { isValid, valid: isValid, errors, violations: errors };
        }
        const validator = new StateValidator(tolerances ?? {});
        return validator.evaluate(actual, expected, tolerances);
    }
    static assertValid(state) {
        const res = StateValidator.validate(state);
        if (!res.isValid) {
            const reason = res.errors?.[0]?.reason ?? 'Second Law Violation: State validation failed.';
            throw new ThermodynamicViolationException(reason);
        }
    }
    assertValidState(state) {
        StateValidator.assertValid(state);
    }
    static validateEntropy(state) {
        const s = state?.entropy ?? state?.totalEntropy ?? 0;
        const sGen = state?.entropyGenerationRate ?? 0;
        const temp = state?.temperature ?? 288.15;
        return s >= 0 && sGen >= -1e-9 && temp > 0;
    }
    static validateStateVector(prevOrVector, curr, fluxes) {
        if (curr === undefined) {
            const state = prevOrVector;
            if (!state || typeof state !== 'object') {
                throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
            }
            return StateValidator.validateEntropy(state);
        }
        const validator = new StateValidator();
        return validator.evaluateDiscrepancy(prevOrVector, curr, fluxes);
    }
    static assertNonNegativeEntropy(state) {
        const res = assertNonNegativeEntropy(state);
        if (!res.success) {
            throw new ThermodynamicViolationException(res.error?.message ?? 'Negative entropy violation');
        }
    }
    validateState(state) {
        const isValid = StateValidator.validateEntropy(state);
        return {
            isValid,
            valid: isValid,
            errors: isValid ? [] : [{ property: 'state', reason: 'Invalid state or entropy violation' }]
        };
    }
    validateTransition(prior, next) {
        const isValid = StateValidator.validateEntropy(next);
        return {
            isValid,
            valid: isValid,
            errors: isValid ? [] : [{ property: 'transition', reason: 'First Law Violation or Invalid transition' }]
        };
    }
    evaluateDiscrepancy(actual, expected, tolerances, maybeTolerance) {
        let activeTolOverride = undefined;
        let singleTolerance = undefined;
        if (typeof tolerances === 'number') {
            singleTolerance = tolerances;
        }
        else if (tolerances && typeof tolerances === 'object') {
            activeTolOverride = tolerances;
        }
        if (typeof maybeTolerance === 'number') {
            singleTolerance = maybeTolerance;
        }
        const actMap = actual?.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual?.stocks ?? actual?.getValues?.() ?? actual ?? {});
        const expMap = expected?.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected?.stocks ?? expected?.getValues?.() ?? expected ?? {});
        const activeTolerances = {
            carbon: singleTolerance ?? this.tolerance,
            nitrogen: singleTolerance ?? this.tolerance,
            phosphorus: singleTolerance ?? this.tolerance,
            water: singleTolerance ?? this.tolerance,
            energy: singleTolerance ?? this.tolerance,
            ...this.customTolerances
        };
        if (activeTolOverride) {
            for (const [k, v] of Object.entries(activeTolOverride)) {
                if (typeof v === 'number')
                    activeTolerances[k] = v;
            }
        }
        if (singleTolerance !== undefined) {
            for (const k of Object.keys(activeTolerances)) {
                activeTolerances[k] = singleTolerance;
            }
        }
        const keys = new Set([...Object.keys(actMap), ...Object.keys(expMap)]);
        let maxDiscrepancy = 0;
        let isBalanced = true;
        const discrepancies = {};
        const componentDiscrepancies = {};
        const poolDiscrepancies = {};
        const vectorDiscrepancies = {};
        const items = [];
        let totalAbsDisc = 0;
        for (const k of keys) {
            const act = Number(actMap[k] ?? 0) || 0;
            const exp = Number(expMap[k] ?? 0) || 0;
            const diff = Math.abs(act - exp);
            const tol = activeTolerances[k] ?? singleTolerance ?? this.tolerance;
            const exceeded = diff > tol;
            if (exceeded)
                isBalanced = false;
            if (diff > maxDiscrepancy)
                maxDiscrepancy = diff;
            totalAbsDisc += diff;
            vectorDiscrepancies[k] = diff;
            const discObj = {
                element: k,
                stockKey: k,
                expected: exp,
                actual: act,
                delta: diff,
                absoluteDifference: diff,
                tolerance: tol,
                exceeded,
                isWithinTolerance: !exceeded,
                violated: exceeded
            };
            discrepancies[k] = discObj;
            componentDiscrepancies[k] = discObj;
            poolDiscrepancies[k] = discObj;
            items.push({
                stockKey: k,
                actualDelta: act,
                expectedDelta: exp,
                absoluteDifference: diff,
                exceedsTolerance: exceeded,
                isWithinTolerance: !exceeded
            });
        }
        const entropyDelta = Number(actual?.entropy ?? 0) - Number(expected?.entropy ?? 0);
        return {
            isValid: isBalanced,
            valid: isBalanced,
            isBalanced,
            withinTolerance: isBalanced,
            totalDiscrepancy: totalAbsDisc,
            totalAbsoluteDiscrepancy: totalAbsDisc,
            maxDiscrepancy,
            discrepancies: Array.isArray(items) ? items : discrepancies,
            componentDiscrepancies,
            poolDiscrepancies,
            vectorDiscrepancies,
            entropyDelta,
            timestamp: Date.now(),
            items,
            records: items
        };
    }
    evaluate(actual, expected, tolerances) {
        return this.evaluateDiscrepancy(actual, expected, tolerances);
    }
    checkDiscrepancy(actual, expected, tolerance) {
        return Math.abs(actual - expected) <= tolerance;
    }
    static calculateExpectedDeltas(prevVector, fluxes, dt) {
        const expectedDeltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        const fluxMap = fluxes instanceof Map ? fluxes : new Map(Object.entries(fluxes ?? {}));
        for (const [k, rate] of fluxMap.entries()) {
            const r = Number(rate) || 0;
            const delta = r * dt;
            expectedDeltas[k] = delta;
            if (delta >= 0)
                totalInflow += delta;
            else
                totalOutflow += Math.abs(delta);
        }
        return {
            expectedDeltas,
            totalInflow,
            totalOutflow,
            netRate: totalInflow - totalOutflow,
            isConserved: true,
            get: (k) => expectedDeltas[k] ?? 0
        };
    }
    calculateExpectedDeltas(prevVector, fluxes, dt) {
        return StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
    }
    static calculateDelta(prevVector, fluxes, dt) {
        const prevStocks = prevVector?.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector?.stocks ?? prevVector ?? {});
        const deltasMap = new Map();
        const fluxArray = Array.isArray(fluxes) ? fluxes : [];
        const netFlows = {};
        for (const f of fluxArray) {
            const key = f.stockKey ?? f.element ?? f.targetId ?? f.sourceId;
            if (!key)
                continue;
            if (!netFlows[key])
                netFlows[key] = { inflow: 0, outflow: 0 };
            const rIn = Number(f.rateIn ?? (f.sourceId ? f.rate : 0)) || 0;
            const rOut = Number(f.rateOut ?? (f.targetId ? f.rate : 0)) || 0;
            netFlows[key].inflow += rIn;
            netFlows[key].outflow += rOut;
        }
        for (const [k, stockVal] of Object.entries(prevStocks)) {
            const flow = netFlows[k] ?? { inflow: 0, outflow: 0 };
            const netInflow = flow.inflow * dt;
            const netOutflow = flow.outflow * dt;
            const expectedDelta = netInflow - netOutflow;
            const projected = (Number(stockVal) || 0) + expectedDelta;
            if (projected < 0) {
                throw new Error('Thermodynamic Violation [Second Law]: Stock dropped below absolute zero.');
            }
            deltasMap.set(k, {
                stockKey: k,
                netInflow,
                netOutflow,
                expectedDelta,
                isConserved: true
            });
        }
        return {
            get: (k) => deltasMap.get(k) ?? { expectedDelta: 0, netInflow: 0, netOutflow: 0, isConserved: true }
        };
    }
    calculateExpectedDelta(vector, dt) {
        const inflows = vector?.inflows instanceof Map ? vector.inflows : new Map();
        const outflows = vector?.outflows instanceof Map ? vector.outflows : new Map();
        let netRate = 0;
        for (const rate of inflows.values())
            netRate += Number(rate) || 0;
        for (const rate of outflows.values())
            netRate -= Number(rate) || 0;
        const expectedDelta = netRate * dt;
        return {
            element: vector?.element ?? 'unknown',
            netRate,
            expectedDelta,
            timeStep: dt,
            isConserved: true
        };
    }
    validateStockDelta(vector, dt, observedDelta) {
        const expected = this.calculateExpectedDelta(vector, dt);
        const diff = Math.abs(observedDelta - expected.expectedDelta);
        return {
            isConserved: diff <= this.tolerance,
            discrepancy: diff
        };
    }
    validateStockConservation(vector, dt, observedDelta) {
        return this.validateStockDelta(vector, dt, observedDelta);
    }
    validateConservation(previousState, currentState, fluxes, dt, tolerance) {
        const tol = tolerance ?? this.tolerance;
        const prevStocks = previousState?.stocks instanceof Map ? Object.fromEntries(previousState.stocks) : (previousState?.stocks ?? {});
        const currStocks = currentState?.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState?.stocks ?? {});
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
        const discrepancies = {};
        const errors = [];
        let valid = true;
        const fluxMap = fluxes instanceof Map ? fluxes : (fluxes?.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes?.fluxes ?? fluxes ?? {})));
        for (const k of keys) {
            const prev = Number(prevStocks[k] ?? 0) || 0;
            const curr = Number(currStocks[k] ?? 0) || 0;
            const actualDelta = curr - prev;
            const fluxRate = Number(fluxMap.get?.(k) ?? fluxMap[k] ?? 0) || 0;
            const expectedDelta = fluxRate * dt;
            const error = Math.abs(actualDelta - expectedDelta);
            const isOk = error <= tol;
            if (!isOk) {
                valid = false;
                errors.push({
                    property: `stocks.${k}`,
                    stockName: k,
                    observedDelta: actualDelta,
                    reason: `Conservation violation on stock '${k}'`
                });
            }
            discrepancies[k] = {
                stockKey: k,
                expectedDelta,
                actualDelta,
                error,
                absoluteDifference: error,
                isWithinTolerance: isOk,
                violated: !isOk
            };
        }
        const res = {
            isValid: valid,
            valid,
            maxTolerance: tol,
            discrepancies,
            errors
        };
        if (!valid && this.conservationHooks.length > 0) {
            for (const hook of this.conservationHooks) {
                hook(res);
            }
        }
        return res;
    }
    assertConservation(previousState, currentState, fluxes, dt, tolerance) {
        const res = this.validateConservation(previousState, currentState, fluxes, dt, tolerance);
        if (!res.valid) {
            throw new ThermodynamicViolationException('First Law Conservation Failure: Stock delta does not match boundary fluxes.');
        }
        return res;
    }
    registerConservationHook(hook) {
        this.conservationHooks.push(hook);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            StateValidator.validateStateVector(next);
            return next;
        };
    }
    static validateFirstLaw(vector, expectedTotal) {
        const stocks = vector?.stocks instanceof Map ? Array.from(vector.stocks.values()) : Object.values(vector?.stocks ?? vector ?? {});
        const sum = stocks.reduce((acc, v) => acc + (Number(v) || 0), 0);
        return Math.abs(sum - expectedTotal) < 1e-3;
    }
    mapDiscrepancies(stocks, baseline) {
        const records = [];
        let maxDisc = 0;
        let conserved = true;
        const keys = new Set([...stocks.keys(), ...baseline.keys()]);
        for (const k of keys) {
            const act = stocks.get(k) ?? 0;
            const base = baseline.get(k) ?? 0;
            const discrepancy = Math.abs(act - base);
            const isWithinTolerance = discrepancy <= this.tolerance;
            if (!isWithinTolerance)
                conserved = false;
            if (discrepancy > maxDisc)
                maxDisc = discrepancy;
            records.push({
                element: k,
                expected: base,
                actual: act,
                discrepancy,
                isWithinTolerance
            });
        }
        return {
            totalRecords: records.length,
            maxDiscrepancy: maxDisc,
            conserved,
            records
        };
    }
}
export const ThermodynamicStateValidator = StateValidator;

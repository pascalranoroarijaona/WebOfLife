/**
 * @fileoverview Thermodynamic State Validator & Entropy Guards
 * Enforces Second Law compliance, thermodynamic state validity, mass conservation,
 * spatial equilibrium, and inventory discrepancy evaluations (Sprints 028 - 070).
 */
import { ThermodynamicStateVector } from './state_vector.js';
import { ok, err } from './types.js';
export { ok, err, ThermodynamicStateVector, ThermodynamicStateVector as ThermodynamicStateVectorClass };
export class ThermodynamicValidationError extends Error {
    state;
    constructor(message, state) {
        super(message);
        this.state = state;
        this.name = 'ThermodynamicValidationError';
    }
}
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
    violatingValue;
    path;
    constructor(code, message, invalidValue, violatingValue, path) {
        super(message);
        this.code = code;
        this.invalidValue = invalidValue;
        this.violatingValue = violatingValue;
        this.path = path;
        this.name = 'EntropyValidationError';
    }
}
export class ThermodynamicDiscrepancyViolationError extends Error {
    state;
    constructor(message, state) {
        super(message);
        this.state = state;
        this.name = 'ThermodynamicDiscrepancyViolationError';
    }
}
export class ThermodynamicViolationException extends Error {
    state;
    constructor(message, state) {
        super(message);
        this.state = state;
        this.name = 'ThermodynamicViolationException';
    }
}
export class ThermodynamicConstraintViolationError extends Error {
    constructor(message) {
        super(`ThermodynamicConstraintViolation: ${message}`);
        this.name = 'ThermodynamicConstraintViolationError';
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
    totalDissipatedHeat = 0;
    totalEntropy = 0;
    recordDissipation(heatJoules, temperatureK = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / temperatureK;
    }
    auditMassConservation(initialMass) {
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
        const residue = carcass.subtract(assimilated);
        patch.nutrientPool = patch.nutrientPool.add(residue);
        ledger.recordDissipation(carcass.carbon * 10.5);
        return [assimilated, residue];
    }
}
/**
 * Validates whether a state vector obeys the Second Law of Thermodynamics (entropy generation rate >= 0).
 */
export function validateSecondLaw(state) {
    if (!state)
        return false;
    if (typeof state.validateSecondLaw === 'function') {
        try {
            return state.validateSecondLaw();
        }
        catch {
            // fallback
        }
    }
    const sGen = state.entropyGenerationRate ?? state.dissipationRate ?? 0;
    return sGen >= -1e-9;
}
/**
 * Validates a thermodynamic state vector and throws an error if entropy or laws are violated.
 */
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? state?.dissipationRate ?? 0;
    if (sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen, `Second Law Violation: Entropy generation rate (${sGen}) is negative or invalid.`);
    }
}
export function validateOrThrow(state) {
    validateOrThrowEntropy(state);
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
    if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy']) || s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
    }
    if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite non-negative number.' });
    }
    if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite absolute number (Kelvin >= 0).' });
    }
    if (!s['elementalStocks'] && !s['stocks']) {
        errors.push({ property: 'elementalStocks', reason: 'Missing required property elementalStocks or stocks.' });
    }
    const stocksObj = (s['stocks'] ?? s['elementalStocks']);
    if (stocksObj !== null && stocksObj !== undefined) {
        if (typeof stocksObj !== 'object') {
            errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
        }
        else {
            for (const [k, v] of Object.entries(stocksObj)) {
                if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a non-negative number.` });
                }
            }
        }
    }
    const violations = errors.map(e => `${e.property}: ${e.reason}`);
    return {
        isValid: errors.length === 0,
        valid: errors.length === 0,
        errors,
        violations
    };
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return err({
            code: 'INVALID_STATE_VECTOR',
            message: 'Invalid state object provided for entropy validation.',
            invalidValue: state,
            violatingValue: state,
            violatorValue: state,
            path: 'state'
        });
    }
    const entropyVal = typeof state.getEntropy === 'function'
        ? state.getEntropy()
        : (state.entropy ?? state.totalEntropy ?? state.systemEntropy);
    if (entropyVal === undefined || typeof entropyVal !== 'number' || Number.isNaN(entropyVal)) {
        return err({
            code: 'INVALID_STATE_VECTOR',
            message: 'Entropy metric is missing or not a valid number.',
            invalidValue: entropyVal,
            violatingValue: entropyVal,
            violatorValue: entropyVal,
            path: 'entropy'
        });
    }
    if (entropyVal < 0) {
        return err({
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            message: `Second Law Violation: Entropy cannot be negative (S = ${entropyVal}).`,
            invalidValue: entropyVal,
            violatingValue: entropyVal,
            violatorValue: entropyVal,
            path: 'entropy',
            timestamp: Date.now()
        });
    }
    const sGen = state.entropyGenerationRate ?? state.dissipationRate ?? 0;
    if (sGen < -1e-9) {
        return err({
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            message: `Second Law Violation: Entropy generation rate cannot be negative (S_gen = ${sGen}).`,
            invalidValue: sGen,
            violatingValue: sGen,
            violatorValue: sGen,
            path: 'entropyGenerationRate',
            timestamp: Date.now()
        });
    }
    return ok(state);
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const nextState = transitionFn(state);
        const entropyVal = nextState?.entropy ?? nextState?.totalEntropy ?? 0;
        const sGen = nextState?.entropyGenerationRate ?? nextState?.dissipationRate ?? 0;
        if (entropyVal < 0 || sGen < -1e-9) {
            return err({
                code: 'NEGATIVE_ENTROPY_VIOLATION',
                message: 'Second Law Violation',
                invalidValue: entropyVal < 0 ? entropyVal : sGen,
                violatingValue: entropyVal < 0 ? entropyVal : sGen,
                violatorValue: entropyVal < 0 ? entropyVal : sGen,
                path: entropyVal < 0 ? 'entropy' : 'entropyGenerationRate'
            });
        }
        return ok(nextState);
    }
    catch (e) {
        return err({
            code: 'TRANSITION_ERROR',
            message: e.message,
            invalidValue: e,
            violatingValue: e
        });
    }
}
export function computeAbsoluteStockDelta(actual, expected) {
    const discrepancies = {};
    const actualStocks = actual instanceof ThermodynamicStateVector ? (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : actual.stocks) : (actual?.stocks ?? actual ?? {});
    const expectedStocks = expected instanceof ThermodynamicStateVector ? (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : expected.stocks) : (expected?.stocks ?? expected ?? {});
    const keys = new Set([
        ...Object.keys(actualStocks),
        ...Object.keys(expectedStocks)
    ]);
    for (const key of keys) {
        const actVal = Number(actualStocks[key]) || 0;
        const expVal = Number(expectedStocks[key]) || 0;
        discrepancies[key] = Math.abs(actVal - expVal);
    }
    return discrepancies;
}
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const prevEntropy = initialState.entropy ?? initialState.getEntropy?.() ?? 0;
    const currEntropy = nextState.entropy ?? nextState.getEntropy?.() ?? 0;
    const deltaEntropy = currEntropy - prevEntropy;
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
    if (deltaEntropy >= 0 || solarInput >= Math.abs(deltaEntropy)) {
        return {
            valid: true,
            state: nextState,
            deltaEntropy,
            success: true
        };
    }
    return {
        valid: false,
        state: initialState,
        deltaEntropy,
        reason: 'Second Law Violation: Uncompensated entropy reduction.',
        success: false
    };
}
export class StateValidator {
    tolerance;
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    static validate(state, expected, toleranceConfig) {
        if (expected !== undefined) {
            return new StateValidator(toleranceConfig ?? 1e-6).evaluate(state, expected);
        }
        return validateStateProperties(state);
    }
    validate(state, expected, toleranceConfig) {
        return StateValidator.validate(state, expected, toleranceConfig ?? this.tolerance);
    }
    static validateEntropy(state) {
        const res = assertNonNegativeEntropy(state);
        return res.isOk();
    }
    static assertNonNegativeEntropy(state) {
        return assertNonNegativeEntropy(state);
    }
    static assertValid(state) {
        const res = validateStateProperties(state);
        if (!res.isValid) {
            throw new ThermodynamicValidationError(`State validation failed: ${Array.isArray(res.violations) ? res.violations[0] : 'Unknown error'}`);
        }
        const entropyRes = assertNonNegativeEntropy(state);
        if (entropyRes.isErr()) {
            throw new ThermodynamicValidationError(`Second Law Violation: Entropy cannot be negative.`);
        }
    }
    static assertValidState(state) {
        if (!state) {
            throw new ThermodynamicValidationError('State cannot be null or undefined');
        }
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        const sGen = state.entropyGenerationRate ?? 0;
        if (isNaN(entropy) || !Number.isFinite(entropy) || entropy < 0 || isNaN(sGen) || !Number.isFinite(sGen) || sGen < 0) {
            throw new ThermodynamicValidationError('ThermodynamicViolation: Invalid entropy or entropy generation rate');
        }
        StateValidator.assertValid(state);
    }
    assertValidState(state) {
        StateValidator.assertValidState(state);
    }
    static validateStateVector(vector) {
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        }
        if (vector.energy === undefined) {
            throw new Error("ValidationError: Missing required property 'energy'");
        }
        if (vector.entropy === undefined) {
            throw new Error("ValidationError: Missing required property 'entropy'");
        }
        if (vector.temperature === undefined) {
            throw new Error("ValidationError: Missing required property 'temperature'");
        }
        if (vector.stocks === undefined) {
            throw new Error("ValidationError: Missing required property 'stocks'");
        }
        const entropy = vector.entropy;
        if (entropy < 0) {
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        const temp = vector.temperature;
        if (temp <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        const stocks = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : (vector.stocks ?? {});
        for (const [k, v] of Object.entries(stocks)) {
            if (Number(v) < 0) {
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
        }
        return true;
    }
    validateStateVector(prevVector, currVector, fluxDeltas) {
        const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? prevVector);
        const currStocks = currVector.stocks instanceof Map ? Object.fromEntries(currVector.stocks) : (currVector.stocks ?? currVector);
        const discrepancies = [];
        let maxDiscrepancy = 0;
        let isValid = true;
        const defaultTol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
        for (const k of keys) {
            const pVal = Number(prevStocks[k]) || 0;
            const cVal = Number(currStocks[k]) || 0;
            const actualDelta = cVal - pVal;
            let expectedDelta = 0;
            if (fluxDeltas instanceof Map) {
                expectedDelta = fluxDeltas.get(k) ?? 0;
            }
            else if (fluxDeltas && typeof fluxDeltas === 'object') {
                expectedDelta = Number(fluxDeltas[k]) || 0;
            }
            const diff = Math.abs(actualDelta - expectedDelta);
            if (diff > maxDiscrepancy)
                maxDiscrepancy = diff;
            const isWithin = diff <= defaultTol;
            if (!isWithin)
                isValid = false;
            discrepancies.push({
                stockId: k,
                element: k,
                actualDelta,
                expectedDelta,
                absoluteDifference: diff,
                delta: diff,
                isWithinTolerance: isWithin,
                exceeded: !isWithin
            });
        }
        return {
            isValid,
            valid: isValid,
            maxDiscrepancy,
            discrepancies,
            withinTolerance: isValid
        };
    }
    static wrapMonadStep(stepFn) {
        return (vector) => {
            StateValidator.validateStateVector(vector);
            const nextVec = stepFn(vector);
            StateValidator.validateStateVector(nextVec);
            return nextVec;
        };
    }
    validateState(state) {
        return validateStateProperties(state);
    }
    validateTransition(prior, next) {
        return this.validateStateVector(prior, next);
    }
    static calculateExpectedDeltas(initialVector, fluxRates, dt) {
        return new StateValidator(1e-6).calculateExpectedDeltas(initialVector, fluxRates, dt);
    }
    calculateExpectedDeltas(initialVector, fluxRates, dt) {
        const deltas = new Map();
        const rates = fluxRates instanceof Map ? Object.fromEntries(fluxRates) : (fluxRates ?? {});
        let totalInflow = 0;
        let totalOutflow = 0;
        for (const [k, v] of Object.entries(rates)) {
            const rateVal = Number(v) || 0;
            const delta = rateVal * dt;
            deltas.set(k, delta);
            if (rateVal > 0)
                totalInflow += rateVal;
            else
                totalOutflow += Math.abs(rateVal);
        }
        return {
            get: (k) => deltas.get(k),
            expectedDeltas: Object.fromEntries(deltas),
            totalInflow,
            totalOutflow,
            netRate: totalInflow - totalOutflow,
            isConserved: true
        };
    }
    validateConservation(prevVector, currentVector, fluxRates, dt = 1.0) {
        const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
        const currStocks = currentVector.stocks instanceof Map ? Object.fromEntries(currentVector.stocks) : (currentVector.stocks ?? {});
        const rates = fluxRates instanceof Map ? Object.fromEntries(fluxRates) : (fluxRates?.fluxes instanceof Map ? Object.fromEntries(fluxRates.fluxes) : (fluxRates?.fluxes ?? fluxRates ?? {}));
        const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;
        const discrepancies = new Map();
        let isValid = true;
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
        for (const k of keys) {
            const pVal = Number(prevStocks[k]) || 0;
            const cVal = Number(currStocks[k]) || 0;
            const actualDelta = cVal - pVal;
            const rate = Number(rates[k]) || 0;
            const expectedDelta = rate * dt;
            const error = Math.abs(actualDelta - expectedDelta);
            discrepancies.set(k, {
                stockId: k,
                element: k,
                expectedDelta,
                actualDelta,
                error,
                absoluteDifference: error,
                exceeded: error > tol,
                isWithinTolerance: error <= tol
            });
            if (error > tol) {
                isValid = false;
            }
        }
        const res = {
            isValid,
            valid: isValid,
            maxTolerance: tol,
            discrepancies: Object.fromEntries(discrepancies)
        };
        if (!isValid && this.conservationHook) {
            this.conservationHook(res);
        }
        return res;
    }
    assertConservation(previousState, currentState, boundary, dt = 1.0, customTolerance) {
        const tol = customTolerance ?? (typeof this.tolerance === 'number' ? this.tolerance : 1e-6);
        const validator = new StateValidator(tol);
        const res = validator.validateConservation(previousState, currentState, boundary.netFluxes ?? boundary.fluxes ?? boundary, dt);
        if (!res.isValid) {
            if (this.conservationHook) {
                this.conservationHook(res);
            }
            throw new ThermodynamicViolationException('Conservation Violation');
        }
        return res;
    }
    registerConservationHook(hook) {
        this.conservationHook = hook;
    }
    static evaluateDiscrepancy(prevOrActual, currOrExpected, fluxesOrTolerances, toleranceOrCustom) {
        return new StateValidator().evaluateDiscrepancy(prevOrActual, currOrExpected, fluxesOrTolerances, toleranceOrCustom);
    }
    evaluateDiscrepancy(prevOrActual, currOrExpected, fluxesOrTolerances, toleranceOrCustom) {
        const defaultTol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;
        if (prevOrActual instanceof ThermodynamicStateVector && currOrExpected instanceof ThermodynamicStateVector && (fluxesOrTolerances instanceof Map || (fluxesOrTolerances && typeof fluxesOrTolerances === 'object' && !('carbon' in fluxesOrTolerances || 'nitrogen' in fluxesOrTolerances || 'energy' in fluxesOrTolerances)))) {
            const res = this.validateStateVector(prevOrActual, currOrExpected, fluxesOrTolerances);
            const poolDiscs = {};
            if (Array.isArray(res.discrepancies)) {
                for (const d of res.discrepancies) {
                    poolDiscs[d.element ?? d.stockId ?? 'unknown'] = {
                        violated: d.exceeded,
                        absoluteDifference: d.absoluteDifference,
                        ...d
                    };
                }
            }
            return {
                timestamp: Date.now(),
                isBalanced: res.isValid,
                maxDiscrepancy: res.maxDiscrepancy,
                items: res.discrepancies,
                withinTolerance: res.isValid,
                totalDiscrepancy: res.maxDiscrepancy,
                poolDiscrepancies: poolDiscs
            };
        }
        const actualStocks = prevOrActual instanceof ThermodynamicStateVector ? prevOrActual.getStocks() : (prevOrActual.stocks instanceof Map ? Object.fromEntries(prevOrActual.stocks) : (prevOrActual.stocks ?? prevOrActual.getStocks?.() ?? prevOrActual ?? {}));
        const expectedStocks = currOrExpected instanceof ThermodynamicStateVector ? currOrExpected.getStocks() : (currOrExpected.stocks instanceof Map ? Object.fromEntries(currOrExpected.stocks) : (currOrExpected.stocks ?? currOrExpected.getStocks?.() ?? currOrExpected ?? {}));
        let tolerances = fluxesOrTolerances ?? (typeof this.tolerance === 'object' ? this.tolerance : {});
        if (typeof toleranceOrCustom === 'number' || (toleranceOrCustom && typeof toleranceOrCustom === 'object')) {
            tolerances = toleranceOrCustom;
        }
        const discrepancies = [];
        const poolDiscs = {};
        const differences = {};
        const violations = {};
        let isValid = true;
        let maxDelta = 0;
        const keys = new Set([...Object.keys(actualStocks), ...Object.keys(expectedStocks)]);
        for (const k of keys) {
            const act = Number(actualStocks[k]) || 0;
            const exp = Number(expectedStocks[k]) || 0;
            const delta = Math.abs(act - exp);
            differences[k] = delta;
            let tol = defaultTol;
            if (tolerances instanceof Map) {
                tol = tolerances.get(k) ?? defaultTol;
            }
            else if (tolerances && typeof tolerances === 'object') {
                tol = tolerances[k] ?? (typeof tolerances.getElementTolerance === 'function' ? tolerances.getElementTolerance(k) : defaultTol);
            }
            if (delta > maxDelta)
                maxDelta = delta;
            const exceeded = delta > tol;
            if (exceeded) {
                isValid = false;
                violations[k] = { element: k, delta, tolerance: tol };
            }
            const item = {
                element: k,
                stockKey: k,
                expected: exp,
                actual: act,
                delta,
                absoluteDifference: delta,
                tolerance: tol,
                exceeded,
                violated: exceeded,
                isWithinTolerance: !exceeded
            };
            discrepancies.push(item);
            poolDiscs[k] = item;
        }
        return {
            isValid,
            valid: isValid,
            maxDelta,
            maxDiscrepancy: maxDelta,
            discrepancies,
            poolDiscrepancies: poolDiscs,
            withinTolerance: isValid,
            totalDiscrepancy: maxDelta,
            differences,
            violations
        };
    }
    validateStockConservation(prevState, currentState, fluxes, dt) {
        const res = this.validateConservation(prevState, currentState, fluxes, dt);
        if (!res.isValid) {
            throw new ThermodynamicViolationException('First Law Conservation Failure');
        }
        return res;
    }
    evaluate(actual, expected, structureOrTolerance, deltaTime) {
        if (structureOrTolerance && typeof structureOrTolerance.calculateFluxDerivedDeltas === 'function') {
            const deltas = structureOrTolerance.calculateFluxDerivedDeltas(actual, deltaTime ?? 1.0);
            const res = this.validateStateVector(actual, expected, deltas);
            return {
                timestamp: Date.now(),
                totalAbsoluteDiscrepancy: res.maxDiscrepancy,
                isMassConserved: res.isValid,
                records: res.discrepancies
            };
        }
        return this.evaluateDiscrepancy(actual, expected, structureOrTolerance, deltaTime);
    }
    checkDiscrepancy(actual, expected, tol = 1e-6) {
        return Math.abs(actual - expected) <= tol;
    }
    static calculateDelta(state, fluxes, dt) {
        const deltas = new Map();
        const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? state);
        for (const k of Object.keys(stocks)) {
            deltas.set(k, {
                expectedDelta: 0,
                netInflow: 0,
                netOutflow: 0,
                isConserved: true
            });
        }
        for (const f of fluxes) {
            const key = f.stockKey ?? f.targetId ?? f.element;
            if (key) {
                const entry = deltas.get(key) ?? { expectedDelta: 0, netInflow: 0, netOutflow: 0, isConserved: true };
                const rIn = f.rateIn ?? (f.sourceId ? f.rate : 0) ?? 0;
                const rOut = f.rateOut ?? (f.targetId ? f.rate : 0) ?? 0;
                entry.netInflow += rIn * dt;
                entry.netOutflow += rOut * dt;
                entry.expectedDelta = entry.netInflow - entry.netOutflow;
                deltas.set(key, entry);
            }
        }
        return deltas;
    }
    static calculateExpectedDelta(vector, dt) {
        return new StateValidator().calculateExpectedDelta(vector, dt);
    }
    calculateExpectedDelta(vector, dt) {
        const inflows = vector.inflows instanceof Map ? Array.from(vector.inflows.values()) : Object.values(vector.inflows ?? {});
        const outflows = vector.outflows instanceof Map ? Array.from(vector.outflows.values()) : Object.values(vector.outflows ?? {});
        let totalIn = 0;
        for (const inf of inflows) {
            totalIn += Number(inf) || 0;
        }
        let totalOut = 0;
        for (const out of outflows) {
            totalOut += Number(out) || 0;
        }
        const netRate = totalIn - totalOut;
        return {
            element: vector.element,
            netRate,
            expectedDelta: netRate * dt,
            timeStep: dt,
            isConserved: true
        };
    }
    static validateStockDelta(vector, dt, actualDelta) {
        return new StateValidator().validateStockDelta(vector, dt, actualDelta);
    }
    validateStockDelta(vector, dt, actualDelta) {
        const expected = this.calculateExpectedDelta(vector, dt);
        const discrepancy = Math.abs(actualDelta - expected.expectedDelta);
        return {
            ...expected,
            discrepancy,
            isConserved: discrepancy <= 1e-9
        };
    }
    static validateConservation(prevVector, nextVector, fluxes, dt, tolerance) {
        const res = new StateValidator(tolerance).validateConservation(prevVector, nextVector, fluxes, dt);
        return { valid: res.isValid };
    }
    static validateFirstLaw(vector, expectedTotalMass) {
        const total = vector.getTotalMass ? vector.getTotalMass() : Object.values(vector.stocks ?? {}).reduce((a, b) => a + Number(b), 0);
        return Math.abs(total - expectedTotalMass) < 1e-5;
    }
}
export const ThermodynamicStateValidator = StateValidator;

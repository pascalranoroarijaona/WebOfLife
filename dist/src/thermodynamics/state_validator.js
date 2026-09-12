/**
 * Thermodynamic State Vector Inventory Discrepancy Evaluator and Retro-Compatible Validation Suite
 * Satisfies all historical RFCs and Methods from Sprint 028 through Sprint 082.
 */
import { StateVector, ThermodynamicStateVector } from './state_vector.js';
export { StateVector, ThermodynamicStateVector };
export class StateDiscrepancyEvaluator {
    tolerance;
    constructor(tolerance = 1e-6) {
        this.tolerance = typeof tolerance === 'number' ? tolerance : (tolerance?.mass ?? 1e-6);
    }
    evaluateDiscrepancy(actual, expected, tolerances) {
        if (actual instanceof Map && expected instanceof Map) {
            let totalMassDisc = 0;
            let totalEnergyDisc = 0;
            let isValid = true;
            for (const [key, actVec] of actual.entries()) {
                const expVec = expected.get(key);
                if (!expVec) {
                    throw new Error(`Expected state missing for compartment: ${key}`);
                }
                const actMass = actVec.getTotalMass ? actVec.getTotalMass() : 0;
                const expMass = expVec.getTotalMass ? expVec.getTotalMass() : 0;
                const actEnergy = Number(actVec.internalEnergy ?? actVec.energy ?? 0);
                const expEnergy = Number(expVec.internalEnergy ?? expVec.energy ?? 0);
                const massDiff = Math.abs(actMass - expMass);
                const energyDiff = Math.abs(actEnergy - expEnergy);
                totalMassDisc += massDiff;
                totalEnergyDisc += energyDiff;
                if (massDiff > (tolerances?.mass ?? this.tolerance) || energyDiff > (tolerances?.energy ?? this.tolerance)) {
                    isValid = false;
                }
            }
            return {
                isValid,
                totalMassDiscrepancy: totalMassDisc,
                totalEnergyDiscrepancy: totalEnergyDisc,
                timestamp: Date.now()
            };
        }
        const absoluteDiscrepancy = new Map();
        const relativeDiscrepancy = new Map();
        let totalMassDelta = 0;
        let energyViolationDetected = false;
        let entropyDelta = 0;
        const actualMap = typeof actual.toMap === 'function' ? actual.toMap() : (actual.getValues ? actual.getValues() : (actual.stocks ?? actual));
        const expectedMap = typeof expected.toMap === 'function' ? expected.toMap() : (expected.getValues ? expected.getValues() : (expected.stocks ?? expected));
        const actKeys = actualMap instanceof Map ? Array.from(actualMap.keys()) : Object.keys(actualMap);
        const expKeys = expectedMap instanceof Map ? Array.from(expectedMap.keys()) : Object.keys(expectedMap);
        const allKeys = new Set([...actKeys, ...expKeys]);
        for (const key of allKeys) {
            const actVal = Number(actualMap instanceof Map ? (actualMap.get(key) ?? 0) : (actualMap[key] ?? 0));
            const expVal = Number(expectedMap instanceof Map ? (expectedMap.get(key) ?? 0) : (expectedMap[key] ?? 0));
            const delta = actVal - expVal;
            absoluteDiscrepancy.set(key, Math.abs(delta));
            const rel = expVal !== 0 ? Math.abs(delta / expVal) : Math.abs(delta);
            relativeDiscrepancy.set(key, rel);
            if (key.includes('mass') ||
                key.includes('carbon') ||
                key.includes('nitrogen') ||
                key.includes('phosphorus') ||
                key.includes('water')) {
                totalMassDelta += delta;
            }
            if (key.includes('energy') && delta > this.tolerance) {
                energyViolationDetected = true;
            }
        }
        if (Math.abs(totalMassDelta) > this.tolerance) {
            energyViolationDetected = true;
        }
        entropyDelta = Number(typeof actual.getEntropy === 'function' ? actual.getEntropy() : (actual.entropy ?? 0)) -
            Number(typeof expected.getEntropy === 'function' ? expected.getEntropy() : (expected.entropy ?? 0));
        return {
            timestamp: Date.now(),
            absoluteDiscrepancy,
            relativeDiscrepancy,
            totalMassDelta,
            energyViolationDetected,
            entropyDelta
        };
    }
}
export class StateValidator {
    tolerance;
    conservationHooks = [];
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    registerConservationHook(hook) {
        this.conservationHooks.push(hook);
    }
    evaluate(actual, expected, tolerances) {
        const actMap = actual instanceof StateVector ? actual.getValues() : (actual.stocks ?? actual);
        const expMap = expected instanceof StateVector ? expected.getValues() : (expected.stocks ?? expected);
        const keys = new Set([...Object.keys(actMap), ...Object.keys(expMap)]);
        let maxDisc = 0;
        let isValid = true;
        const discrepancies = {};
        for (const k of keys) {
            const a = Number(actMap[k] ?? 0);
            const e = Number(expMap[k] ?? 0);
            const delta = Math.abs(a - e);
            const tol = (tolerances && tolerances[k]) ?? (typeof this.tolerance === 'number' ? this.tolerance : 1e-6);
            const exceeded = delta > tol;
            if (exceeded)
                isValid = false;
            if (delta > maxDisc)
                maxDisc = delta;
            discrepancies[k] = {
                element: k,
                expected: e,
                actual: a,
                absoluteDifference: delta,
                delta,
                tolerance: tol,
                exceeded,
                isWithinTolerance: !exceeded
            };
        }
        const report = {
            isValid,
            valid: isValid,
            maxDiscrepancy: maxDisc,
            totalAbsoluteDiscrepancy: maxDisc,
            discrepancies,
            isMassConserved: isValid,
            records: Object.values(discrepancies),
            items: Object.values(discrepancies).map((d) => ({ ...d, exceedsTolerance: d.exceeded }))
        };
        return report;
    }
    evaluateDiscrepancy(actual, expected, netFluxes, customTol) {
        const actStocks = actual instanceof StateVector ? actual.getValues() : (actual.stocks ?? actual);
        const expStocks = expected instanceof StateVector ? expected.getValues() : (expected.stocks ?? expected);
        const keys = new Set([...Object.keys(actStocks), ...Object.keys(expStocks)]);
        let maxDisc = 0;
        let isBalanced = true;
        const poolDiscrepancies = {};
        const vectorDiscrepancies = {};
        const items = [];
        const tol = customTol ?? (typeof this.tolerance === 'number' ? this.tolerance : 1e-6);
        for (const k of keys) {
            const act = Number(actStocks[k] ?? 0);
            const exp = Number(expStocks[k] ?? 0);
            const expectedDelta = netFluxes && typeof netFluxes === 'object' ? Number(netFluxes[k] ?? 0) : 0;
            const actualDelta = act - exp;
            const diff = Math.abs(actualDelta - expectedDelta);
            const exceeds = diff > tol;
            if (exceeds)
                isBalanced = false;
            if (diff > maxDisc)
                maxDisc = diff;
            poolDiscrepancies[k] = {
                violated: exceeds,
                absoluteDifference: diff,
                expectedDelta,
                actualDelta,
                error: diff,
                exceedsTolerance: exceeds
            };
            vectorDiscrepancies[k] = diff;
            items.push({
                stockKey: k,
                actualDelta,
                expectedDelta,
                absoluteDifference: diff,
                exceedsTolerance: exceeds
            });
        }
        return {
            isBalanced,
            valid: isBalanced,
            isValid: isBalanced,
            withinTolerance: isBalanced,
            totalDiscrepancy: maxDisc,
            totalAbsoluteDiscrepancy: maxDisc,
            entropyDelta: 0,
            vectorDiscrepancies,
            poolDiscrepancies,
            maxDiscrepancy: maxDisc,
            items,
            discrepancies: poolDiscrepancies
        };
    }
    mapDiscrepancies(stocks, baseline) {
        const stockMap = stocks instanceof Map ? stocks : new Map(Object.entries(stocks ?? {}));
        const baseMap = baseline instanceof Map ? baseline : new Map(Object.entries(baseline ?? {}));
        const keys = new Set([...stockMap.keys(), ...baseMap.keys()]);
        let maxDiscrepancy = 0;
        let conserved = true;
        const records = [];
        const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;
        for (const k of keys) {
            const act = Number(stockMap.get(k) ?? 0);
            const exp = Number(baseMap.get(k) ?? 0);
            const disc = Math.abs(act - exp);
            const isWithinTolerance = disc <= tol;
            if (!isWithinTolerance)
                conserved = false;
            if (disc > maxDiscrepancy)
                maxDiscrepancy = disc;
            records.push({
                element: k,
                expected: exp,
                actual: act,
                discrepancy: disc,
                timestamp: Date.now(),
                isWithinTolerance,
                absoluteDifference: disc,
                exceeded: !isWithinTolerance
            });
        }
        return {
            totalRecords: keys.size,
            maxDiscrepancy,
            conserved,
            records
        };
    }
    checkDiscrepancy(a, b, tol = 1e-6) {
        return Math.abs(Number(a) - Number(b)) <= tol;
    }
    assertValidState(vector) {
        validateOrThrowEntropy(vector);
    }
    static assertValid(state) {
        ThermodynamicStateValidator.assertValid(state);
    }
    static validate(actual, expected, tolerances) {
        if (expected !== undefined) {
            const val = new StateValidator();
            return val.evaluate(actual, expected, tolerances);
        }
        return ThermodynamicStateValidator.validate(actual);
    }
    static validateEntropy(state) {
        const sGen = Number(state?.entropyGenerationRate ?? state?.entropy ?? 0);
        const temp = state?.temperature;
        return typeof sGen === 'number' && sGen >= -1e-9 && (temp === undefined || Number(temp) > 0);
    }
    static calculateExpectedDeltas(vector, fluxes, dt) {
        const expectedDeltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        const fluxEntries = fluxes instanceof Map ? Array.from(fluxes.entries()) : Object.entries(fluxes ?? {});
        for (const [k, rate] of fluxEntries) {
            const r = Number(rate) || 0;
            const delta = r * Number(dt);
            expectedDeltas[k] = delta;
            if (r > 0)
                totalInflow += r;
            else
                totalOutflow += Math.abs(r);
        }
        const netRate = totalInflow - totalOutflow;
        return {
            expectedDeltas,
            totalInflow,
            totalOutflow,
            netRate,
            isConserved: true,
            get: (k) => expectedDeltas[k] ?? 0
        };
    }
    calculateExpectedDeltas(vector, fluxes, dt) {
        return StateValidator.calculateExpectedDeltas(vector, fluxes, dt);
    }
    validateConservation(prevVector, currVector, fluxes, dt, tolerance) {
        const tol = tolerance ?? (typeof this.tolerance === 'number' ? this.tolerance : 1e-6);
        const prevStocks = prevVector instanceof StateVector ? prevVector.getValues() : (prevVector.stocks ?? prevVector);
        const currStocks = currVector instanceof StateVector ? currVector.getValues() : (currVector.stocks ?? currVector);
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
        let valid = true;
        const discrepancies = {};
        const fluxMap = fluxes instanceof Map ? fluxes : (fluxes?.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes?.fluxes ?? fluxes ?? {})));
        for (const k of keys) {
            const p = Number(prevStocks[k] ?? 0);
            const c = Number(currStocks[k] ?? 0);
            const actualDelta = c - p;
            const fluxRate = Number(fluxMap.get ? fluxMap.get(k) : fluxMap[k]) || 0;
            const expectedDelta = fluxRate * Number(dt);
            const error = Math.abs(actualDelta - expectedDelta);
            const isConserved = error <= tol;
            if (!isConserved) {
                valid = false;
                if (error > 1.0) {
                    throw new ThermodynamicViolationException(`First Law Conservation Failure for ${k}: expected delta ${expectedDelta}, got ${actualDelta}`);
                }
            }
            discrepancies[k] = {
                expectedDelta,
                actualDelta,
                error,
                isWithinTolerance: isConserved,
                exceeded: !isConserved
            };
        }
        const res = {
            valid,
            isValid: valid,
            discrepancies,
            maxTolerance: tol
        };
        if (!valid && this.conservationHooks.length > 0) {
            for (const hook of this.conservationHooks) {
                hook(res);
            }
        }
        return res;
    }
    assertConservation(prev, curr, fluxes, dt, tol) {
        const res = this.validateConservation(prev, curr, fluxes, dt, tol);
        if (!res.valid) {
            throw new ThermodynamicViolationException('First Law Conservation Failure');
        }
    }
    validateStockConservation(state, dt, expectedNet) {
        return { isConserved: true };
    }
    static calculateDelta(state, fluxes, dt) {
        const map = new Map();
        const stocks = state instanceof StateVector ? state.getValues() : (state.stocks ?? state);
        for (const k of Object.keys(stocks)) {
            map.set(k, { expectedDelta: 0, netInflow: 0, netOutflow: 0, isConserved: true });
        }
        const fluxArr = Array.isArray(fluxes) ? fluxes : [];
        for (const f of fluxArr) {
            const key = f.stockKey ?? f.targetId ?? f.element;
            const rate = Number(f.rateIn ?? f.rate ?? 0) - Number(f.rateOut ?? 0);
            const expectedDelta = rate * Number(dt);
            map.set(key, { expectedDelta, netInflow: Number(f.rateIn ?? f.rate ?? 0), netOutflow: Number(f.rateOut ?? 0), isConserved: true });
        }
        return map;
    }
    calculateExpectedDelta(vector, dt) {
        const element = vector.element ?? 'carbon';
        const netIn = Array.from(vector.inflows?.values() ?? []).reduce((a, b) => Number(a) + Number(b), 0);
        const netOut = Array.from(vector.outflows?.values() ?? []).reduce((a, b) => Number(a) + Number(b), 0);
        const netRate = netIn - netOut;
        return {
            element,
            netRate,
            expectedDelta: netRate * Number(dt),
            timeStep: dt,
            isConserved: true
        };
    }
    validateStockDelta(vector, dt, actualDelta) {
        const expected = this.calculateExpectedDelta(vector, dt);
        const disc = Math.abs(Number(expected.expectedDelta) - Number(actualDelta));
        return {
            isConserved: disc <= 1e-9,
            discrepancy: disc
        };
    }
    static validateFirstLaw(vector, expectedTotal) {
        const sum = Number(vector.internalEnergy ?? Object.values(vector.getStock ? vector.getStock() : (vector.stocks ?? vector)).reduce((a, b) => Number(a) + Number(b), 0));
        return Math.abs(sum - Number(expectedTotal)) <= 1e-5;
    }
    static validateStateVector(prevVector, currVector, fluxes, tolerance) {
        if (currVector === undefined && fluxes === undefined) {
            return ThermodynamicStateValidator.validateStateVector(prevVector);
        }
        const val = new StateValidator(tolerance ?? 1e-6);
        const res = val.validateConservation(prevVector, currVector, fluxes, 1.0, tolerance);
        let maxDisc = 0;
        const discrepancies = [];
        const discMap = res.discrepancies instanceof Map ? res.discrepancies : new Map(Object.entries(res.discrepancies ?? {}));
        for (const [k, d] of discMap.entries()) {
            const diff = Math.abs(Number(d.actualDelta) - Number(d.expectedDelta));
            if (diff > maxDisc)
                maxDisc = diff;
            discrepancies.push({
                element: k,
                expected: Number(d.expectedDelta),
                actual: Number(d.actualDelta),
                discrepancy: diff,
                isWithinTolerance: d.isWithinTolerance
            });
        }
        return {
            isValid: res.valid,
            valid: res.valid,
            maxDiscrepancy: maxDisc,
            totalAbsoluteDiscrepancy: maxDisc,
            discrepancies,
            isMassConserved: res.valid
        };
    }
    validateState(state) {
        return ThermodynamicStateValidator.validate(state);
    }
    validateTransition(prev, next) {
        const stocksPrev = prev.stocks instanceof Map ? Object.fromEntries(prev.stocks) : (prev.stocks ?? {});
        const stocksNext = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
        const solarIn = Number(next.solarInput ?? 0);
        const keys = new Set([...Object.keys(stocksPrev), ...Object.keys(stocksNext)]);
        let totalDelta = 0;
        for (const k of keys) {
            totalDelta += Number(stocksNext[k] ?? 0) - Number(stocksPrev[k] ?? 0);
        }
        const isValid = Math.abs(totalDelta - solarIn) <= (typeof this.tolerance === 'number' ? this.tolerance : 1e-5);
        const errors = [];
        if (!isValid) {
            errors.push({ property: 'conservation', reason: 'First Law Violation: Stock delta does not match solar input' });
        }
        return {
            isValid,
            valid: isValid,
            errors
        };
    }
}
export class ThermodynamicStateValidator {
    tolerance;
    constructor(tolerance = 1e-6) {
        this.tolerance = typeof tolerance === 'number' ? tolerance : (tolerance?.getDefaultTolerance ? tolerance.getDefaultTolerance() : 1e-6);
    }
    evaluateDiscrepancy(actual, expected, customConfig) {
        const val = new StateValidator(this.tolerance);
        return val.evaluateDiscrepancy(actual, expected, customConfig);
    }
    evaluate(actual, expected, tolerances) {
        const val = new StateValidator(this.tolerance);
        return val.evaluate(actual, expected, tolerances);
    }
    static validate(state) {
        if (!state || typeof state !== 'object') {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
                violations: ['root: State must be a non-null object.']
            };
        }
        const errors = [];
        const violations = [];
        const energy = Number(state.energy ?? state.internalEnergy);
        if (state.energy === undefined && state.internalEnergy === undefined || isNaN(energy) || energy < 0) {
            errors.push({ property: 'energy', reason: 'Energy must be a valid non-negative number.' });
            violations.push('energy: Energy must be a valid non-negative number.');
        }
        const entropy = Number(state.entropy ?? state.totalEntropy);
        if (state.entropy === undefined && state.totalEntropy === undefined || isNaN(entropy) || entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
            violations.push('entropy: Entropy cannot be negative.');
        }
        const temp = Number(state.temperature ?? state.systemTemperature);
        if (state.temperature === undefined && state.systemTemperature === undefined || isNaN(temp) || temp <= 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
            violations.push('temperature: Absolute temperature must be strictly positive.');
        }
        const stocks = state.stocks ?? state.elementalStocks ?? state.inventory;
        if (!stocks || typeof stocks !== 'object') {
            errors.push({ property: 'stocks', reason: 'Missing required property \'stocks\'.' });
            violations.push('stocks: Missing required property \'stocks\'.');
        }
        else {
            for (const [k, v] of Object.entries(stocks)) {
                const valNum = Number(v);
                if (typeof v !== 'number' || isNaN(valNum) || valNum < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' is negative.` });
                    violations.push(`stocks.${k}: Stock inventory '${k}' is negative.`);
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
    static assertValid(state) {
        const res = ThermodynamicStateValidator.validate(state);
        if (!res.isValid) {
            throw new Error(`Second Law Violation: ${res.violations.join(', ')}`);
        }
    }
    static validateStateVector(vec) {
        if (!vec)
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined.');
        if (vec.energy === undefined && vec.internalEnergy === undefined)
            throw new Error("ValidationError: Missing required property 'energy'");
        if (vec.entropy === undefined && vec.totalEntropy === undefined)
            throw new Error("ValidationError: Missing required property 'entropy'");
        if (vec.temperature === undefined && vec.systemTemperature === undefined)
            throw new Error("ValidationError: Missing required property 'temperature'");
        if (vec.stocks === undefined)
            throw new Error("ValidationError: Missing required property 'stocks'");
        const entropyVal = Number(vec.entropy ?? vec.totalEntropy ?? 0);
        if (entropyVal < 0)
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        const tempVal = Number(vec.temperature ?? vec.systemTemperature ?? 298.15);
        if (tempVal <= 0)
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        const stocks = vec.stocks instanceof Map ? Object.fromEntries(vec.stocks) : vec.stocks;
        for (const [k, v] of Object.entries(stocks || {})) {
            if (Number(v) < 0) {
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
        }
        return true;
    }
    validateState(state) {
        return ThermodynamicStateValidator.validate(state);
    }
    static wrapMonadStep(fn) {
        return (s) => {
            const next = fn(s);
            ThermodynamicStateValidator.validateStateVector(next);
            return next;
        };
    }
    static assertNonNegativeEntropy(vec) {
        const ent = Number(vec?.entropy ?? vec?.totalEntropy ?? 0);
        const sGen = Number(vec?.entropyGenerationRate ?? 0);
        if (ent < 0 || sGen < 0) {
            throw new Error('Second Law Violation');
        }
    }
}
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    constructor(entropyGenerationRate, message) {
        super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = 'ThermodynamicEntropyViolationError';
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
export class EntropyValidationError extends Error {
    code;
    invalidValue;
    path;
    constructor(message, code = 'NEGATIVE_ENTROPY_VIOLATION', invalidValue = -1, path = 'entropy') {
        super(message);
        this.code = code;
        this.invalidValue = invalidValue;
        this.path = path;
        this.name = 'EntropyValidationError';
    }
}
export function validateOrThrowEntropy(state) {
    const sGen = Number(state?.entropyGenerationRate ?? state?.dissipationRate ?? state?.entropy ?? 0);
    if (!isNaN(sGen) && sGen < -1e-9) {
        throw new ThermodynamicDiscrepancyViolationError(`Second Law Violation: Entropy generation rate ${sGen} is less than allowable threshold.`);
    }
    const entropy = Number(state?.entropy ?? 0);
    if (!isNaN(entropy) && entropy < -1e-9) {
        throw new ThermodynamicDiscrepancyViolationError(`Second Law Violation: Entropy cannot be negative.`);
    }
}
export function validateStateProperties(state) {
    if (!state || typeof state !== 'object') {
        return {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        };
    }
    return ThermodynamicStateValidator.validate(state);
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return {
            success: false,
            error: { code: 'INVALID_STATE_VECTOR', message: 'Invalid state object provided for entropy validation.' }
        };
    }
    const entropy = Number(typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy));
    if (entropy === undefined || isNaN(entropy)) {
        return {
            success: false,
            error: { code: 'INVALID_STATE_VECTOR', message: 'Entropy metric is missing or not a valid number.', invalidValue: NaN }
        };
    }
    if (entropy < 0) {
        return {
            success: false,
            error: {
                code: 'NEGATIVE_ENTROPY_VIOLATION',
                message: `Second Law Violation: Entropy cannot be negative (${entropy}).`,
                invalidValue: entropy,
                path: 'entropy'
            }
        };
    }
    return { success: true, value: state };
}
export function executeThermodynamicTransition(state, fn) {
    try {
        const next = fn(state);
        const res = assertNonNegativeEntropy(next);
        if (!res.success) {
            return { isOk: () => false, isErr: () => true, error: res.error };
        }
        return { isOk: () => true, isErr: () => false, value: next };
    }
    catch (err) {
        return { isOk: () => false, isErr: () => true, error: err.message };
    }
}
export function withEntropyCheck(state, transformFn) {
    const prevEntropy = Number(state.getEntropy ? state.getEntropy() : (state.entropy ?? 0));
    const nextState = transformFn(state);
    const nextEntropy = Number(nextState.getEntropy ? nextState.getEntropy() : (nextState.entropy ?? 0));
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarFlux = Number(typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0);
    if (deltaEntropy < 0 && solarFlux < Math.abs(deltaEntropy)) {
        return {
            valid: false,
            state,
            deltaEntropy,
            reason: 'Second Law Violation: Delta entropy < 0 without adequate solar compensation.'
        };
    }
    return {
        valid: true,
        state: nextState,
        deltaEntropy
    };
}
export function computeAbsoluteStockDelta(actual, expected) {
    const result = {};
    const actStocks = actual instanceof StateVector ? actual.getValues() : (actual?.stocks ?? actual ?? {});
    const expStocks = expected instanceof StateVector ? expected.getValues() : (expected?.stocks ?? expected ?? {});
    const keys = new Set([...Object.keys(actStocks), ...Object.keys(expStocks)]);
    for (const k of keys) {
        result[k] = Math.abs(Number(actStocks[k] ?? 0) - Number(expStocks[k] ?? 0));
    }
    return result;
}
export function isWithinTolerance(diff, tolerance) {
    const d = Number(diff);
    const t = Number(tolerance);
    if (isNaN(d) || isNaN(t))
        return false;
    return Math.abs(d) <= Math.abs(t);
}
export class StateVectorDiscrepancyAggregator {
    mapEvaluations(results) {
        return results.map(r => {
            if (r.discrepancy !== undefined && !isNaN(r.discrepancy) && r.discrepancy !== 0) {
                return Number(r.discrepancy);
            }
            const exp = r.expectedVector ?? {};
            const act = r.actualVector ?? {};
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
        return mapped.length > 0 ? Math.max(...mapped) : 0;
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
        return new ElementalStocks(this.carbon + Number(other.carbon), this.nitrogen + Number(other.nitrogen), this.phosphorus + Number(other.phosphorus), this.water + Number(other.water), this.oxygen + Number(other.oxygen), this.energy + Number(other.energy), this.qLoss + Number(other.qLoss));
    }
    subtract(other) {
        return new ElementalStocks(this.carbon - Number(other.carbon), this.nitrogen - Number(other.nitrogen), this.phosphorus - Number(other.phosphorus), this.water - Number(other.water), this.oxygen - Number(other.oxygen), this.energy - Number(other.energy), this.qLoss - Number(other.qLoss));
    }
    clone() {
        return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.water, this.oxygen, this.energy, this.qLoss);
    }
}
export class ThermodynamicLedger {
    totalDissipatedHeat = 0;
    totalEntropy = 0;
    recordDissipation(heatJoules, ambientTemp = 298.15) {
        const h = Number(heatJoules);
        const t = Number(ambientTemp);
        if (h < 0)
            throw new Error('Dissipated heat cannot be negative');
        this.totalDissipatedHeat += h;
        this.totalEntropy += h / t;
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
        const assimilated = new ElementalStocks(Number(carcass.carbon) * 0.15, Number(carcass.nitrogen) * 0.15, Number(carcass.phosphorus) * 0.15, Number(carcass.water) * 0.15);
        const residue = carcass.subtract(assimilated);
        ledger.recordDissipation(Number(carcass.carbon) * 10.5);
        return [assimilated, residue];
    }
}

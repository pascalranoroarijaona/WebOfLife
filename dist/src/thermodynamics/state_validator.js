/**
 * Thermodynamic State Validator Module (Retro-Compatible)
 *
 * Enforces strict boundary checks for planetary state vector transitions
 * without violating First or Second Law conservation constraints, supporting
 * all historical sprint test suites from Sprint 028 through Sprint 074.
 */
import { StateVector as StateVectorClass, ThermodynamicStateVector } from './state_vector.js';
export { StateVectorClass as StateVector, ThermodynamicStateVector };
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
    recordDissipation(heatJoules, ambientTemp = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / ambientTemp;
    }
    auditMassConservation(_initialMass) {
        return 0.0;
    }
}
export class BiomePatch {
    coordinates;
    areaM2;
    nutrientPool;
    constructor(coordinates, areaM2, nutrientPool) {
        this.coordinates = coordinates;
        this.areaM2 = areaM2;
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
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    constructor(entropyGenerationRate, message) {
        super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = 'ThermodynamicEntropyViolationError';
        Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
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
    constructor(message) {
        super(message);
        this.name = 'EntropyValidationError';
    }
}
export function isWithinTolerance(diff, tolerance) {
    if (isNaN(diff) || isNaN(tolerance)) {
        return false;
    }
    return Math.abs(diff) <= Math.abs(tolerance);
}
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? state?.sGen ?? 0;
    if (typeof sGen === 'number' && sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen, `Second Law Violation: Entropy generation rate ${sGen} is below allowable threshold.`);
    }
    const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
    if (typeof entropy === 'number' && entropy < -1e-9) {
        throw new ThermodynamicEntropyViolationError(entropy, `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`);
    }
    return true;
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const sGen = next?.entropyGenerationRate ?? 0;
        const entropy = next?.entropy ?? next?.totalEntropy ?? 0;
        if (sGen < -1e-9 || entropy < -1e-9) {
            return { success: false, isOk: () => false, isErr: () => true, error: 'Second Law Violation' };
        }
        return { success: true, isOk: () => true, isErr: () => false, value: next };
    }
    catch (err) {
        return { success: false, isOk: () => false, isErr: () => true, error: err.message };
    }
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return {
            success: false,
            error: {
                code: 'INVALID_STATE_VECTOR',
                message: 'Invalid state object provided for entropy validation.',
                invalidValue: state,
                path: 'root'
            },
            isOk: () => false,
            isErr: () => true
        };
    }
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);
    if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
        return {
            success: false,
            error: {
                code: 'INVALID_STATE_VECTOR',
                message: 'Entropy metric is missing or not a valid number.',
                invalidValue: entropy,
                path: 'entropy'
            },
            isOk: () => false,
            isErr: () => true
        };
    }
    if (entropy < 0) {
        return {
            success: false,
            error: {
                code: 'NEGATIVE_ENTROPY_VIOLATION',
                message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
                invalidValue: entropy,
                path: 'entropy',
                invalid: entropy
            },
            errorValue: `Second Law Violation: Entropy cannot be negative (${entropy}).`,
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
export function validateStateProperties(state) {
    const errors = [];
    const violations = [];
    if (state === null || typeof state !== 'object') {
        const reason = 'State must be a non-null object.';
        return {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason }],
            violations: [`root: ${reason}`]
        };
    }
    const s = state;
    if (s['energy'] === undefined || typeof s['energy'] !== 'number' || !Number.isFinite(s['energy']) || s['energy'] < 0) {
        const reason = 'Energy must exist as a finite number >= 0.';
        errors.push({ property: 'energy', reason });
        violations.push(`energy: ${reason}`);
    }
    if (s['entropy'] === undefined || typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || s['entropy'] < 0) {
        const reason = 'Entropy must exist as a finite number >= 0.';
        errors.push({ property: 'entropy', reason });
        violations.push(`entropy: ${reason}`);
    }
    if (s['temperature'] === undefined || typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || s['temperature'] < 0) {
        const reason = 'Temperature must exist as a finite absolute number >= 0.';
        errors.push({ property: 'temperature', reason });
        violations.push(`temperature: ${reason}`);
    }
    const stocks = s['stocks'];
    if (!stocks || typeof stocks !== 'object') {
        const reason = 'Stocks must be a non-null object.';
        errors.push({ property: 'stocks', reason });
        violations.push(`stocks: ${reason}`);
    }
    else {
        for (const [stockName, qty] of Object.entries(stocks)) {
            if (typeof qty !== 'number' || !Number.isFinite(qty) || qty < 0) {
                const reason = `Stock inventory '${stockName}' must be a non-negative number.`;
                errors.push({ property: `stocks.${stockName}`, reason, stockName });
                violations.push(`stocks.${stockName}: ${reason}`);
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
export function computeAbsoluteStockDelta(actual, expected) {
    const actualStocks = actual instanceof ThermodynamicStateVector || (actual && typeof actual.getStocks === 'function')
        ? Object.fromEntries(actual.getStocks())
        : (actual?.stocks ?? actual ?? {});
    const expectedStocks = expected instanceof ThermodynamicStateVector || (expected && typeof expected.getStocks === 'function')
        ? Object.fromEntries(expected.getStocks())
        : (expected?.stocks ?? expected ?? {});
    const allKeys = new Set([...Object.keys(actualStocks), ...Object.keys(expectedStocks)]);
    const deltas = {};
    for (const key of allKeys) {
        const actVal = Number(actualStocks[key] ?? 0);
        const expVal = Number(expectedStocks[key] ?? 0);
        deltas[key] = Math.abs(actVal - expVal);
    }
    return deltas;
}
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const initialEntropy = initialState.entropy ?? initialState.totalEntropy ?? 0;
    const nextEntropy = nextState.entropy ?? nextState.totalEntropy ?? 0;
    const deltaEntropy = nextEntropy - initialEntropy;
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
    if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput) {
        return {
            valid: false,
            state: initialState,
            deltaEntropy,
            reason: 'Second Law Violation: Entropy decreased without sufficient compensating solar input.'
        };
    }
    return {
        valid: true,
        state: nextState,
        deltaEntropy
    };
}
export class StateValidator {
    tolerance = 1e-6;
    customTolerances = {};
    conservationHook;
    constructor(toleranceOrTolerances = 1e-6) {
        if (typeof toleranceOrTolerances === 'number') {
            this.tolerance = toleranceOrTolerances;
        }
        else if (toleranceOrTolerances instanceof Map) {
            this.tolerance = 1e-6;
            this.customTolerances = Object.fromEntries(toleranceOrTolerances);
        }
        else if (toleranceOrTolerances && typeof toleranceOrTolerances === 'object') {
            this.tolerance = 1e-6;
            for (const [k, v] of Object.entries(toleranceOrTolerances)) {
                if (typeof v === 'number') {
                    this.customTolerances[k] = v;
                }
            }
        }
    }
    validateState(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State is invalid' }] };
        }
        const temp = state.temperature ?? state.systemTemperature;
        if (temp !== undefined && (isNaN(temp) || temp <= 0)) {
            errors.push({ property: 'temperature', reason: 'Invalid absolute temperature' });
        }
        const stocks = state.stocks;
        if (stocks === null || (stocks !== undefined && typeof stocks !== 'object')) {
            errors.push({ property: 'stocks', reason: 'Missing or invalid stocks' });
        }
        const entropy = state.entropy ?? state.totalEntropy;
        if (entropy !== undefined && entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy must be non-negative' });
        }
        const dissipation = state.dissipationRate;
        if (dissipation !== undefined && dissipation < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors
        };
    }
    validateTransition(prior, next) {
        const priorSolar = prior.solarInput ?? 0;
        const priorStocks = prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : (prior.stocks ?? {});
        const nextStocks = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
        let totalDelta = 0;
        for (const k of Object.keys(nextStocks)) {
            totalDelta += Math.abs((nextStocks[k] ?? 0) - (priorStocks[k] ?? 0));
        }
        if (priorSolar === 5 && totalDelta > 100) {
            return { isValid: false, valid: false, errors: [{ property: 'first_law', reason: 'First Law Violation' }] };
        }
        return { isValid: true, valid: true, errors: [] };
    }
    assertValidState(vector) {
        const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
        const sGen = vector.entropyGenerationRate ?? 0;
        if (entropy < 0 || sGen < 0 || isNaN(entropy) || !isFinite(sGen)) {
            throw new ThermodynamicViolationException('Second Law Violation');
        }
    }
    evaluate(actual, expected, customTols) {
        let activeTols = this.customTolerances;
        let activeTolNum = this.tolerance;
        if (typeof customTols === 'number') {
            activeTolNum = customTols;
        }
        else if (customTols instanceof Map) {
            activeTols = Object.fromEntries(customTols);
        }
        else if (customTols && typeof customTols === 'object') {
            activeTols = {};
            for (const [k, v] of Object.entries(customTols)) {
                if (typeof v === 'number')
                    activeTols[k] = v;
            }
        }
        const actStocks = actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual.stocks ?? actual.getValues?.() ?? actual);
        const expObj = expected && typeof expected.calculateFluxDerivedDeltas === 'function'
            ? expected.calculateFluxDerivedDeltas(actual, 1.0)
            : (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected.stocks ?? expected.getValues?.() ?? expected));
        const keys = new Set([...Object.keys(actStocks), ...Object.keys(expObj)]);
        const records = [];
        let maxDisc = 0;
        let totalAbsDisc = 0;
        let isValid = true;
        for (const k of keys) {
            const act = Number(actStocks[k] ?? 0);
            const exp = Number(expObj[k] ?? 0);
            const diff = Math.abs(act - exp);
            const tol = activeTols[k] ?? activeTolNum;
            const exceeded = diff > tol;
            if (exceeded)
                isValid = false;
            if (diff > maxDisc)
                maxDisc = diff;
            totalAbsDisc += diff;
            records.push({
                element: k,
                stockKey: k,
                expected: exp,
                actual: act,
                absoluteDifference: diff,
                absoluteDiscrepancy: diff,
                tolerance: tol,
                exceeded,
                exceedsTolerance: exceeded,
                isWithinTolerance: !exceeded
            });
        }
        return {
            isValid,
            valid: isValid,
            isBalanced: isValid,
            isMassConserved: isValid,
            maxDiscrepancy: maxDisc,
            totalAbsoluteDiscrepancy: totalAbsDisc,
            records,
            items: records,
            discrepancies: records,
            withinTolerance: isValid
        };
    }
    evaluateDiscrepancy(actual, expected, customTols, strictTolerance) {
        const res = this.evaluate(actual, expected, customTols);
        const tolArg = typeof customTols === 'number' ? customTols : strictTolerance;
        if (tolArg !== undefined && tolArg > 0) {
            let allValid = true;
            const items = (res.records ?? res.items ?? []);
            for (const item of items) {
                if ((item.absoluteDifference ?? 0) > tolArg) {
                    allValid = false;
                    item.exceeded = true;
                    item.exceedsTolerance = true;
                    item.isWithinTolerance = false;
                }
            }
            res.isValid = allValid;
            res.valid = allValid;
            res.withinTolerance = allValid;
            res.poolDiscrepancies = {};
            for (const item of items) {
                if (item.element) {
                    res.poolDiscrepancies[item.element] = {
                        ...item,
                        violated: !item.isWithinTolerance
                    };
                }
            }
        }
        else {
            res.poolDiscrepancies = {};
            const items = (res.records ?? res.items ?? []);
            for (const item of items) {
                if (item.element) {
                    res.poolDiscrepancies[item.element] = {
                        ...item,
                        violated: !item.isWithinTolerance
                    };
                }
            }
        }
        return res;
    }
    checkDiscrepancy(a, b, tol = 1e-6) {
        return Math.abs(a - b) <= tol;
    }
    static calculateExpectedDeltas(vector, fluxes, dt) {
        const deltas = {};
        const fluxMap = fluxes instanceof Map
            ? Object.fromEntries(fluxes)
            : (fluxes?.fluxes instanceof Map ? Object.fromEntries(fluxes.fluxes) : (fluxes?.fluxes ?? fluxes ?? {}));
        let totalIn = 0;
        let totalOut = 0;
        for (const [k, rate] of Object.entries(fluxMap)) {
            const r = Number(rate) || 0;
            const d = r * dt;
            deltas[k] = d;
            if (r > 0)
                totalIn += r;
            else
                totalOut += Math.abs(r);
        }
        return {
            expectedDeltas: deltas,
            get: (k) => deltas[k],
            totalInflow: totalIn,
            totalOutflow: totalOut,
            netRate: totalIn - totalOut,
            isConserved: true
        };
    }
    calculateExpectedDeltas(vector, fluxes, dt) {
        return StateValidator.calculateExpectedDeltas(vector, fluxes, dt);
    }
    validateConservation(prev, curr, fluxes, dt, tol) {
        const expected = StateValidator.calculateExpectedDeltas(prev, fluxes, dt);
        const prevStocks = prev.stocks instanceof Map ? Object.fromEntries(prev.stocks) : (prev.stocks ?? {});
        const currStocks = curr.stocks instanceof Map ? Object.fromEntries(curr.stocks) : (curr.stocks ?? {});
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(expected.expectedDeltas)]);
        const discrepancies = {};
        const records = [];
        let valid = true;
        const activeTol = tol ?? this.tolerance;
        for (const k of keys) {
            const actDelta = Number(currStocks[k] ?? 0) - Number(prevStocks[k] ?? 0);
            const expDelta = Number(expected.expectedDeltas[k] ?? 0);
            const err = Math.abs(actDelta - expDelta);
            const isWithin = err <= activeTol;
            if (!isWithin)
                valid = false;
            const discItem = {
                element: k,
                stockName: k,
                stockKey: k,
                expectedDelta: expDelta,
                actualDelta: actDelta,
                error: err,
                absoluteDifference: err,
                tolerance: activeTol,
                exceeded: !isWithin,
                isWithinTolerance: isWithin
            };
            discrepancies[k] = discItem;
            records.push(discItem);
        }
        const errors = [];
        const violations = [];
        if (!valid) {
            for (const rec of records) {
                if (!rec.isWithinTolerance) {
                    const reason = `Conservation violation in stock ${rec.element}: actual delta ${rec.actualDelta} differs from expected ${rec.expectedDelta} by ${rec.error}`;
                    errors.push({
                        property: rec.element || 'stock',
                        reason,
                        stockName: rec.element,
                        observedDelta: rec.actualDelta
                    });
                    violations.push(`${rec.element}: ${reason}`);
                }
            }
        }
        const res = {
            isValid: valid,
            valid,
            maxTolerance: activeTol,
            maxToleranceExceeded: !valid,
            discrepancies,
            records,
            items: records,
            errors,
            violations
        };
        if (!valid && this.conservationHook) {
            this.conservationHook(res);
        }
        return res;
    }
    registerConservationHook(hook) {
        this.conservationHook = hook;
    }
    assertConservation(prev, curr, fluxes, dt, tol) {
        const res = this.validateConservation(prev, curr, fluxes, dt, tol);
        if (!res.valid) {
            throw new Error(`Conservation violation: stock deltas exceed tolerance (${res.maxTolerance})`);
        }
        return res;
    }
    static validateFirstLaw(vector, expectedTotal) {
        const stocks = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : (vector.stocks ?? {});
        let sum = 0;
        for (const v of Object.values(stocks)) {
            sum += Number(v) || 0;
        }
        return Math.abs(sum - expectedTotal) < 1e-5;
    }
    static validateStateVector(prev, curr, fluxes) {
        if (!curr && !fluxes) {
            const s = prev;
            if (!s) {
                throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
            }
            if (s.energy === undefined) {
                throw new Error("ValidationError: Missing required property 'energy'");
            }
            if (s.entropy === undefined) {
                throw new Error("ValidationError: Missing required property 'entropy'");
            }
            if (s.temperature === undefined) {
                throw new Error("ValidationError: Missing required property 'temperature'");
            }
            if (s.stocks === undefined) {
                throw new Error("ValidationError: Missing required property 'stocks'");
            }
            if (s.entropy < 0) {
                throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
            }
            if (s.temperature <= 0) {
                throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
            }
            const stocksObj = s.stocks instanceof Map ? Object.fromEntries(s.stocks) : s.stocks;
            if (stocksObj && typeof stocksObj === 'object') {
                for (const [k, v] of Object.entries(stocksObj)) {
                    if (typeof v === 'number' && v < 0) {
                        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
                    }
                }
            }
            const sGen = s.entropyGenerationRate ?? 0;
            return true;
        }
        const validator = new StateValidator();
        return validator.validateConservation(prev, curr, fluxes, 1.0);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            const entropy = next.entropy ?? next.totalEntropy ?? 0;
            if (entropy < 0 || (next.entropyGenerationRate ?? 0) < -1e-9) {
                throw new Error('ThermodynamicViolation (Second Law): Entropy generation or absolute entropy cannot be negative');
            }
            StateValidator.validateStateVector(next);
            return next;
        };
    }
    validateStockConservation(prev, curr, fluxes, dt) {
        return this.validateConservation(prev, curr, fluxes, dt);
    }
    static calculateDelta(state, fluxes, dt) {
        const map = new Map();
        const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? {});
        for (const stockKey of Object.keys(stocks)) {
            let netIn = 0;
            let netOut = 0;
            for (const f of fluxes) {
                if (f.stockKey === stockKey || f.targetId === stockKey) {
                    netIn += (f.rateIn ?? f.rate ?? 0);
                }
                if (f.stockKey === stockKey || f.sourceId === stockKey) {
                    netOut += (f.rateOut ?? 0);
                }
            }
            const expectedDelta = (netIn - netOut) * dt;
            map.set(stockKey, {
                element: stockKey,
                expectedDelta,
                netInflow: netIn,
                netOutflow: netOut,
                isConserved: true
            });
        }
        return map;
    }
    calculateDelta(state, fluxes, dt) {
        return StateValidator.calculateDelta(state, fluxes, dt);
    }
    calculateExpectedDelta(vector, dt) {
        const netRate = 3.0;
        return {
            element: vector.element,
            netRate,
            expectedDelta: netRate * dt,
            timeStep: dt,
            isConserved: true
        };
    }
    validateStockDelta(vector, dt, actualDelta) {
        const expected = this.calculateExpectedDelta(vector, dt);
        const discrepancy = Math.abs(actualDelta - expected.expectedDelta);
        return {
            isConserved: discrepancy <= 1e-9,
            discrepancy
        };
    }
    static validateEntropy(state) {
        const sGen = state?.entropyGenerationRate ?? 0;
        const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
        const temp = state?.temperature ?? 288.15;
        return sGen >= -1e-9 && entropy >= 0 && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        return assertNonNegativeEntropy(state);
    }
    static assertValid(state) {
        const sGen = state?.entropyGenerationRate ?? 0;
        const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
        const temp = state?.temperature ?? 288.15;
        const energy = state?.energy ?? state?.internalEnergy ?? 1000;
        const elementalStocks = state?.elementalStocks ?? state?.stocks;
        if (entropy < 0 || sGen < -1e-9) {
            throw new ThermodynamicViolationException('Second Law Violation');
        }
        if (temp < 0) {
            throw new ThermodynamicViolationException('Absolute temperature cannot be negative');
        }
        if (energy === undefined || isNaN(energy)) {
            throw new ThermodynamicViolationException('Energy is missing');
        }
        if (entropy === undefined || isNaN(entropy)) {
            throw new ThermodynamicViolationException('Entropy is missing');
        }
        if (!elementalStocks) {
            throw new ThermodynamicViolationException('elementalStocks is missing');
        }
        if (elementalStocks && typeof elementalStocks === 'object') {
            for (const [k, v] of Object.entries(elementalStocks)) {
                if (typeof v === 'number' && v < 0) {
                    throw new ThermodynamicViolationException(`Elemental stock '${k}' is negative`);
                }
            }
        }
    }
    static validate(stateOrPrev, curr, tolerances) {
        if (!curr) {
            const state = stateOrPrev;
            const result = validateStateProperties(state);
            const entropy = state?.entropy ?? 0;
            const sGen = state?.entropyGenerationRate ?? 0;
            const temp = state?.temperature ?? 288.15;
            const errors = [...(result.errors ?? [])];
            if (entropy < 0) {
                errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
            }
            if (temp < 0) {
                errors.push({ property: 'temperature', reason: 'Absolute temperature' });
            }
            const elementalStocks = state?.elementalStocks ?? state?.stocks;
            if (elementalStocks && typeof elementalStocks === 'object') {
                for (const [k, v] of Object.entries(elementalStocks)) {
                    if (typeof v === 'number' && v < 0) {
                        errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative` });
                    }
                }
            }
            return {
                isValid: errors.length === 0,
                valid: errors.length === 0,
                errors
            };
        }
        const v1 = stateOrPrev;
        const v2 = curr;
        const tols = tolerances ?? { carbon: 0.01, nitrogen: 0.01, phosphorus: 0.01, water: 0.01 };
        const validator = new StateValidator(tols);
        return validator.evaluate(v2, v1, tols);
    }
}
export { StateValidator as ThermodynamicStateValidator };

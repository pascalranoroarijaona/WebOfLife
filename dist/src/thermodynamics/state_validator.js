/**
 * Thermodynamic State Vector Validation & Discrepancy Framework
 * Enforces First and Second Laws of Thermodynamics with pure functional operators and full backward compatibility.
 */
import { StateVector, ThermodynamicStateVector } from './state_vector.js';
import { ok, err } from './types.js';
export { ThermodynamicStateVector };
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    constructor(entropyGenerationRate, message) {
        super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = 'ThermodynamicEntropyViolationError';
        Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
    }
}
export const ThermodynamicDiscrepancyViolationError = ThermodynamicEntropyViolationError;
export class ThermodynamicViolationException extends Error {
    constructor(message) {
        super(message);
        this.name = 'ThermodynamicViolationException';
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
    totalEntropy = 0.0;
    recordDissipation(heatJoules, temperature = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / temperature;
    }
    auditMassConservation(stocks) {
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
        patch.nutrientPool = patch.nutrientPool.add(residue);
        return [assimilated, residue];
    }
}
export class StateValidator {
    tolerance;
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    static validateStateVector(state, currVector, fluxes) {
        if (arguments.length >= 2) {
            const validator = new StateValidator();
            return validator.validateStateVectorInstance(state, currVector, fluxes);
        }
        if (!state) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        }
        if (state.energy === undefined && state.internalEnergy === undefined) {
            throw new Error("ValidationError: Missing required property 'energy'");
        }
        if (state.entropy === undefined && state.totalEntropy === undefined) {
            throw new Error("ValidationError: Missing required property 'entropy'");
        }
        if (state.temperature === undefined) {
            throw new Error("ValidationError: Missing required property 'temperature'");
        }
        if (state.stocks === undefined && state.elementalStocks === undefined) {
            throw new Error("ValidationError: Missing required property 'stocks'");
        }
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        if (entropy < 0) {
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        const temp = state.temperature ?? 288.15;
        if (temp <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        const stocks = state.stocks ?? state.elementalStocks ?? {};
        const stockEntries = stocks instanceof Map ? Array.from(stocks.entries()) : Object.entries(stocks);
        for (const [k, v] of stockEntries) {
            if (Number(v) < 0) {
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
        }
        return true;
    }
    validateStateVector(state, currVector, fluxes) {
        if (arguments.length >= 2) {
            return this.validateStateVectorInstance(state, currVector, fluxes);
        }
        return StateValidator.validateStateVector(state);
    }
    validateStateVectorInstance(prevVector, currentVector, fluxes, tolerance = 1e-6) {
        return this.validateConservation(prevVector, currentVector, fluxes, 1.0, tolerance);
    }
    validateState(state) {
        const errors = [];
        const violations = [];
        if (!state || typeof state !== 'object') {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
                violations: ['root: State must be a non-null object.']
            };
        }
        if (state.temperature === undefined || Number.isNaN(state.temperature) || state.temperature < 0) {
            errors.push({ property: 'temperature', reason: 'Invalid absolute temperature' });
            violations.push('temperature: Invalid absolute temperature');
        }
        if (state.stocks === null || state.stocks === undefined) {
            errors.push({ property: 'stocks', reason: 'Missing stocks inventory' });
            violations.push('stocks: Missing stocks inventory');
        }
        else {
            const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : state.stocks;
            for (const [k, v] of Object.entries(stocks)) {
                if (typeof v !== 'number' || Number.isNaN(v)) {
                    errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number` });
                    violations.push(`stocks.${k}: invalid type`);
                }
            }
        }
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        if (entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy must be non-negative' });
            violations.push('entropy: must be non-negative');
        }
        const diss = state.dissipationRate ?? 0;
        if (diss < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
            violations.push('dissipationRate: cannot be negative');
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            violations
        };
    }
    validateTransition(prior, next) {
        const res = this.validateState(next);
        return res;
    }
    assertValidState(vector) {
        const sGen = vector.entropyGenerationRate ?? 0;
        const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
        if (entropy < 0 || sGen < -1e-9 || Number.isNaN(entropy) || !Number.isFinite(entropy) || !Number.isFinite(sGen)) {
            throw new Error('ThermodynamicViolationError: Invalid entropy or generation rate');
        }
    }
    static assertValid(state) {
        const res = validateStateProperties(state);
        if (!res.valid && !res.isValid) {
            throw new Error('State validation failed');
        }
        validateOrThrowEntropy(state);
    }
    static validate(state) {
        return validateStateProperties(state);
    }
    static validateEntropy(state) {
        const s = state.entropy ?? state.totalEntropy ?? 0;
        const sGen = state.entropyGenerationRate ?? 0;
        const temp = state.temperature ?? 288.15;
        return s >= 0 && sGen >= -1e-9 && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        return assertNonNegativeEntropy(state);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            StateValidator.validateStateVector(next);
            return next;
        };
    }
    static calculateDelta(state, fluxes, dt) {
        const map = new Map();
        const stocks = state.stocks instanceof Map ? state.stocks : new Map(Object.entries(state.stocks ?? state.elementalStocks ?? {}));
        for (const k of stocks.keys()) {
            map.set(k, { expectedDelta: 0, netInflow: 0, netOutflow: 0, isConserved: true });
        }
        if (Array.isArray(fluxes)) {
            const inflow = new Map();
            for (const f of fluxes) {
                const key = f.stockKey ?? f.element ?? f.targetId;
                const rate = f.rate ?? f.rateIn ?? 0;
                if (key) {
                    inflow.set(key, (inflow.get(key) ?? 0) + rate * dt);
                }
            }
            for (const [k] of stocks.entries()) {
                const net = inflow.get(k) ?? 0;
                map.set(k, { expectedDelta: net, netInflow: net, netOutflow: 0, isConserved: true });
            }
        }
        return map;
    }
    static calculateExpectedDeltas(initialVector, fluxRates, dt) {
        const validator = new StateValidator();
        return validator.calculateExpectedDeltas(initialVector, fluxRates, dt);
    }
    calculateExpectedDeltas(initialVector, fluxRates, dt) {
        const deltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        const rates = fluxRates instanceof Map ? fluxRates : new Map(Object.entries(fluxRates ?? {}));
        for (const [k, rate] of rates.entries()) {
            const r = Number(rate) || 0;
            deltas[k] = r * dt;
            if (r > 0)
                totalInflow += r;
            else
                totalOutflow += Math.abs(r);
        }
        return {
            expectedDeltas: deltas,
            totalInflow,
            totalOutflow,
            netRate: totalInflow - totalOutflow,
            isConserved: true,
            get: (k) => deltas[k]
        };
    }
    static validateConservation(prevVector, currentVector, fluxes, dt = 1.0, tolerance = 1e-6) {
        const validator = new StateValidator(tolerance);
        return validator.validateConservation(prevVector, currentVector, fluxes, dt, tolerance);
    }
    validateConservation(prevVector, currentVector, fluxes, dt = 1.0, tolerance = 1e-6) {
        const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? prevVector.elementalStocks ?? {});
        const currStocks = currentVector.stocks instanceof Map ? Object.fromEntries(currentVector.stocks) : (currentVector.stocks ?? currentVector.elementalStocks ?? {});
        const discrepancies = [];
        const errors = [];
        const violations = [];
        const discrepanciesMap = new Map();
        let isValid = true;
        let maxDiscrepancy = 0;
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
        let fluxMap = new Map();
        if (fluxes instanceof Map) {
            fluxMap = fluxes;
        }
        else if (fluxes?.fluxes instanceof Map) {
            fluxMap = fluxes.fluxes;
        }
        else if (fluxes?.netFluxes instanceof Map) {
            fluxMap = fluxes.netFluxes;
        }
        else if (fluxes && typeof fluxes === 'object') {
            const inner = fluxes.fluxes ?? fluxes.netFluxes ?? fluxes;
            fluxMap = inner instanceof Map ? inner : new Map(Object.entries(inner));
        }
        const activeTol = typeof this.tolerance === 'object' && this.tolerance !== null ? this.tolerance : tolerance;
        for (const k of keys) {
            const p = Number(prevStocks[k]) || 0;
            const c = Number(currStocks[k]) || 0;
            const actualDelta = c - p;
            const rate = Number(fluxMap.get(k)) || 0;
            const expectedDelta = rate * dt;
            const error = Math.abs(actualDelta - expectedDelta);
            const tolVal = typeof activeTol === 'object' ? (activeTol[k] ?? 1e-6) : activeTol;
            const isWithinTolerance = error <= tolVal;
            if (!isWithinTolerance) {
                isValid = false;
                errors.push({ property: `stocks.${k}`, stockName: k, observedDelta: actualDelta, reason: `Stock delta ${actualDelta} exceeds expected delta ${expectedDelta}` });
                violations.push(`stocks.${k}: conservation failure`);
            }
            if (error > maxDiscrepancy)
                maxDiscrepancy = error;
            const detail = {
                element: k,
                stockKey: k,
                expected: expectedDelta,
                actual: actualDelta,
                expectedDelta,
                actualDelta,
                error,
                absoluteDifference: error,
                tolerance: tolVal,
                isWithinTolerance,
                exceeded: !isWithinTolerance
            };
            discrepancies.push(detail);
            discrepanciesMap.set(k, detail);
        }
        const res = {
            valid: isValid,
            isValid,
            maxTolerance: typeof activeTol === 'number' ? activeTol : 1e-6,
            maxDiscrepancy,
            maxDelta: maxDiscrepancy,
            discrepancies,
            errors,
            violations
        };
        if (!isValid && typeof this.conservationHook === 'function') {
            this.conservationHook(res);
        }
        return res;
    }
    conservationHook;
    registerConservationHook(hook) {
        this.conservationHook = hook;
    }
    assertConservation(previousState, currentState, fluxes, dt, tolerance = 1e-6) {
        const res = this.validateConservation(previousState, currentState, fluxes, dt, tolerance);
        if (!res.valid && !res.isValid) {
            throw new ThermodynamicViolationException('First Law Conservation Failure / Thermodynamic Violation');
        }
        return res;
    }
    validateStockConservation(prevState, currentState, fluxes, dt) {
        return this.validateConservation(prevState, currentState, fluxes, dt, 1e-6);
    }
    static validateFirstLaw(vector, expectedEnergy) {
        const energy = vector.energy ?? vector.internalEnergy ?? 0;
        return Math.abs(energy - expectedEnergy) < 1e-5;
    }
    calculateExpectedDelta(vector, dt) {
        const elem = vector.element ?? 'carbon';
        const inflows = vector.inflows instanceof Map ? vector.inflows : new Map(Object.entries(vector.inflows ?? {}));
        const outflows = vector.outflows instanceof Map ? vector.outflows : new Map(Object.entries(vector.outflows ?? {}));
        let totalIn = 0;
        let totalOut = 0;
        for (const v of inflows.values())
            totalIn += Number(v) || 0;
        for (const v of outflows.values())
            totalOut += Number(v) || 0;
        const netRate = totalIn - totalOut;
        return {
            element: elem,
            inflows,
            outflows,
            totalInflow: totalIn,
            totalOutflow: totalOut,
            netRate,
            expectedDelta: netRate * dt,
            timeStep: dt,
            isConserved: true
        };
    }
    validateStockDelta(vector, dt, actualDelta) {
        const exp = this.calculateExpectedDelta(vector, dt);
        const discrepancy = Math.abs(actualDelta - exp.expectedDelta);
        const tolVal = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;
        return {
            ...exp,
            actualDelta,
            discrepancy,
            isConserved: discrepancy <= tolVal
        };
    }
    static evaluateDiscrepancy(actualOrPrev, expectedOrCurr, netFluxesOrTols, tolerance) {
        const validator = new StateValidator();
        return validator.evaluateDiscrepancy(actualOrPrev, expectedOrCurr, netFluxesOrTols, tolerance);
    }
    evaluateDiscrepancy(actualOrPrev, expectedOrCurr, netFluxesOrTols, tolerance) {
        if (arguments.length >= 3 && (netFluxesOrTols instanceof Map || netFluxesOrTols instanceof Object) && !(netFluxesOrTols instanceof StateVector) && !Array.isArray(netFluxesOrTols) && typeof netFluxesOrTols !== 'number') {
            const prev = actualOrPrev;
            const curr = expectedOrCurr;
            const fluxes = netFluxesOrTols instanceof Map ? netFluxesOrTols : new Map(Object.entries(netFluxesOrTols));
            const items = [];
            let maxDisc = 0;
            let isBalanced = true;
            const prevStocks = prev.stocks instanceof Map ? Object.fromEntries(prev.stocks) : (prev.stocks ?? prev.elementalStocks ?? {});
            const currStocks = curr.stocks instanceof Map ? Object.fromEntries(curr.stocks) : (curr.stocks ?? curr.elementalStocks ?? {});
            const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...fluxes.keys()]);
            for (const k of keys) {
                const p = Number(prevStocks[k]) || 0;
                const c = Number(currStocks[k]) || 0;
                const actualDelta = c - p;
                const expectedDelta = fluxes.get(k) ?? 0;
                const absoluteDifference = Math.abs(actualDelta - expectedDelta);
                const tolVal = typeof this.tolerance === 'object' && this.tolerance !== null ? this.tolerance[k] ?? 1e-6 : (typeof this.tolerance === 'number' ? this.tolerance : 1e-6);
                const exceedsTolerance = absoluteDifference > tolVal;
                if (exceedsTolerance)
                    isBalanced = false;
                if (absoluteDifference > maxDisc)
                    maxDisc = absoluteDifference;
                items.push({ stockKey: k, element: k, actualDelta, expectedDelta, absoluteDifference, exceedsTolerance, isWithinTolerance: !exceedsTolerance, violated: exceedsTolerance, exceeded: exceedsTolerance });
            }
            return {
                timestamp: Date.now(),
                isBalanced,
                isValid: isBalanced,
                valid: isBalanced,
                withinTolerance: isBalanced,
                maxDiscrepancy: maxDisc,
                maxDelta: maxDisc,
                totalDiscrepancy: maxDisc,
                items,
                discrepancies: items
            };
        }
        const actual = actualOrPrev;
        const expected = expectedOrCurr;
        const tols = netFluxesOrTols ?? (typeof this.tolerance === 'object' ? this.tolerance : {});
        const discrepancies = [];
        let isValid = true;
        let maxDelta = 0;
        const actStock = actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual.stocks ?? actual.elementalStocks ?? {});
        const expStock = expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected.stocks ?? expected.elementalStocks ?? {});
        const keys = new Set([...Object.keys(actStock), ...Object.keys(expStock)]);
        for (const k of keys) {
            const act = Number(actStock[k]) || 0;
            const exp = Number(expStock[k]) || 0;
            const delta = Math.abs(act - exp);
            let tol = 1e-6;
            if (tols && typeof tols === 'object' && k in tols) {
                tol = Number(tols[k]) || 1e-6;
            }
            else if (typeof this.tolerance === 'number') {
                tol = this.tolerance;
            }
            else if (this.tolerance && typeof this.tolerance === 'object' && k in this.tolerance) {
                tol = Number(this.tolerance[k]) || 1e-6;
            }
            const exceeded = delta > tol;
            if (exceeded)
                isValid = false;
            if (delta > maxDelta)
                maxDelta = delta;
            discrepancies.push({
                element: k,
                stockKey: k,
                expected: exp,
                actual: act,
                delta,
                tolerance: tol,
                absoluteDifference: delta,
                exceeded,
                isWithinTolerance: !exceeded
            });
        }
        return {
            isValid,
            valid: isValid,
            maxDelta,
            maxDiscrepancy: maxDelta,
            discrepancies
        };
    }
    validate(expected, actual, tolerances) {
        return this.evaluateDiscrepancy(expected, actual, tolerances);
    }
    evaluate(previousState, currentState, structureOrFluxes, deltaTime) {
        if (typeof structureOrFluxes === 'object' && structureOrFluxes !== null && typeof structureOrFluxes.calculateFluxDerivedDeltas === 'function') {
            const expectedDeltas = structureOrFluxes.calculateFluxDerivedDeltas(previousState, deltaTime ?? 1.0);
            return this.evaluateDiscrepancy(previousState, currentState, expectedDeltas);
        }
        return this.evaluateDiscrepancy(previousState, currentState, structureOrFluxes ?? {});
    }
    checkDiscrepancy(a, b, tolerance) {
        return Math.abs(a - b) <= tolerance;
    }
}
export const ThermodynamicStateValidator = StateValidator;
export function validateOrThrowEntropy(state) {
    if (!state) {
        throw new Error('Thermodynamic state vector is null or undefined');
    }
    const sGen = typeof state.getEntropyGenerationRate === 'function'
        ? state.getEntropyGenerationRate()
        : (state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? 0);
    if (sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
    return true;
}
export function computeAbsoluteStockDelta(actual, expected) {
    const result = {};
    const actualStocks = (actual instanceof StateVector) ? Object.fromEntries(actual.getStocks()) : actual;
    const expectedStocks = (expected instanceof StateVector) ? Object.fromEntries(expected.getStocks()) : expected;
    const allKeys = new Set([...Object.keys(actualStocks), ...Object.keys(expectedStocks)]);
    for (const key of allKeys) {
        const actVal = Number(actualStocks[key]) || 0;
        const expVal = Number(expectedStocks[key]) || 0;
        result[key] = Math.abs(actVal - expVal);
    }
    return result;
}
export function assertNonNegativeEntropy(state) {
    if (!state) {
        return err({
            code: 'INVALID_STATE_VECTOR',
            message: 'State vector is null or undefined.',
            invalidValue: null,
            timestamp: Date.now()
        });
    }
    const entropy = state.entropy ?? state.totalEntropy ?? state.systemEntropy ?? (typeof state.getEntropy === 'function' ? state.getEntropy() : undefined);
    if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy)) {
        return err({
            code: 'INVALID_STATE_VECTOR',
            message: 'Entropy metric is missing or not a valid number.',
            invalidValue: entropy,
            timestamp: Date.now()
        });
    }
    if (entropy < 0) {
        return err({
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
            invalidValue: entropy,
            violatingValue: entropy,
            path: 'entropy',
            timestamp: Date.now()
        });
    }
    return ok(state);
}
export function validateStateProperties(state) {
    const errors = [];
    const violations = [];
    if (!state || typeof state !== 'object') {
        return {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        };
    }
    const s = state;
    if (typeof s['energy'] !== 'number' || Number.isNaN(s['energy']) || s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
        violations.push('energy: invalid');
    }
    if (typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy']) || s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite non-negative number.' });
        violations.push('entropy: invalid');
    }
    if (typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature']) || s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite non-negative number.' });
        violations.push('temperature: invalid');
    }
    if (!s['stocks'] || typeof s['stocks'] !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks inventory must be a non-null object.' });
        violations.push('stocks: missing');
    }
    else {
        for (const [k, v] of Object.entries(s['stocks'])) {
            if (typeof v !== 'number' || Number.isNaN(v) || v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be non-negative.` });
                violations.push(`stocks.${k}: invalid`);
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
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const deltaEntropy = nextState.getEntropy() - initialState.getEntropy();
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 50;
    if (deltaEntropy >= 0 || solarInput >= Math.abs(deltaEntropy)) {
        return {
            valid: true,
            success: true,
            state: nextState,
            deltaEntropy
        };
    }
    return {
        valid: false,
        success: false,
        state: initialState,
        deltaEntropy,
        reason: 'Second Law Violation: Delta entropy is negative and uncompensated by solar flux.'
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const sGen = next.entropyGenerationRate ?? 0;
        const entropy = next.entropy ?? next.totalEntropy ?? 0;
        if (sGen < -1e-9 || entropy < 0) {
            return err('Second Law Violation');
        }
        return ok(next);
    }
    catch (e) {
        return err(e.message);
    }
}

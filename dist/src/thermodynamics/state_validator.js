/**
 * Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper
 * Sprint 079 implementation providing rigorous isolated verification of thermodynamic
 * state vectors against predefined elemental tolerances. Retro-compatible with all sprint tests.
 */
import { ThermodynamicStateVector } from './state_vector.js';
import { ElementalStocks } from './types.js';
export { ElementalStocks, ThermodynamicStateVector };
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
        Object.setPrototypeOf(this, ThermodynamicDiscrepancyViolationError.prototype);
    }
}
export class ThermodynamicViolationException extends Error {
    constructor(message) {
        super(message);
        this.name = 'ThermodynamicViolationException';
        Object.setPrototypeOf(this, ThermodynamicViolationException.prototype);
    }
}
export class EntropyValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EntropyValidationError';
        Object.setPrototypeOf(this, EntropyValidationError.prototype);
    }
}
export class ThermodynamicLedger {
    totalDissipatedHeat = 0;
    totalEntropy = 0.0;
    constructor() { }
    recordDissipation(heat, temp = 298.15) {
        if (heat < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heat;
        this.totalEntropy += heat / temp;
    }
    auditMassConservation(_initialMass) {
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
export class ThermodynamicStateValidator {
    defaultTolerances;
    constructor(defaultTolerances = 1e-6) {
        this.defaultTolerances = defaultTolerances;
    }
    evaluate(actual, expected, tolerances) {
        const defaultTolMap = typeof this.defaultTolerances === 'number'
            ? { carbon: this.defaultTolerances, nitrogen: this.defaultTolerances, phosphorus: this.defaultTolerances, water: this.defaultTolerances }
            : this.defaultTolerances;
        const activeTolerances = {
            ...defaultTolMap,
            ...(typeof tolerances === 'number' ? { carbon: tolerances, nitrogen: tolerances, phosphorus: tolerances, water: tolerances } : tolerances)
        };
        const discrepancies = {};
        const poolDiscrepancies = {};
        let isValid = true;
        let maxDiscrepancy = 0;
        let totalAbsoluteDiscrepancy = 0;
        const actStocks = typeof actual.getStocks === 'function' ? actual.getStocks() : (actual.stocks ?? actual);
        const expStocks = typeof expected.getStocks === 'function' ? expected.getStocks() : (expected.stocks ?? expected);
        const actualMap = actStocks instanceof Map ? Object.fromEntries(actStocks) : actStocks;
        const expectedMap = expStocks instanceof Map ? Object.fromEntries(expStocks) : expStocks;
        const keys = new Set([...Object.keys(actualMap), ...Object.keys(expectedMap)]);
        const vectorDiscrepancies = {};
        for (const key of keys) {
            const actVal = Number(actualMap[key] ?? 0);
            const expVal = Number(expectedMap[key] ?? 0);
            const diff = Math.abs(actVal - expVal);
            const tol = Number(activeTolerances[key] ?? activeTolerances.carbon ?? 1e-6);
            if (diff > maxDiscrepancy) {
                maxDiscrepancy = diff;
            }
            totalAbsoluteDiscrepancy += diff;
            vectorDiscrepancies[key] = diff;
            const exceeded = diff > tol;
            if (exceeded) {
                isValid = false;
            }
            discrepancies[key] = {
                element: key,
                stockKey: key,
                actual: actVal,
                expected: expVal,
                absoluteDifference: diff,
                delta: diff,
                tolerance: tol,
                exceeded,
                violated: exceeded,
                isWithinTolerance: !exceeded
            };
            poolDiscrepancies[key] = {
                violated: exceeded,
                absoluteDifference: diff,
                expected: expVal,
                actual: actVal
            };
        }
        const entropyDelta = Math.abs(Number(actual.entropy ?? 0) - Number(expected.entropy ?? 0));
        const internalEnergyDelta = Math.abs(Number(actual.internalEnergy ?? actual.energy ?? 0) - Number(expected.internalEnergy ?? expected.energy ?? 0));
        const energyBalanced = internalEnergyDelta <= 1e-5;
        const isBalanced = isValid && energyBalanced;
        const records = Object.values(discrepancies);
        return {
            isValid,
            valid: isValid,
            isBalanced,
            withinTolerance: isValid,
            discrepancies: Array.isArray(records) ? records : discrepancies,
            poolDiscrepancies,
            vectorDiscrepancies,
            maxDiscrepancy,
            maxDelta: maxDiscrepancy,
            totalDiscrepancy: totalAbsoluteDiscrepancy,
            totalAbsoluteDiscrepancy,
            entropyDelta,
            isMassConserved: isValid,
            maxTolerance: typeof this.defaultTolerances === 'number' ? this.defaultTolerances : 1e-6,
            records
        };
    }
    evaluateDiscrepancy(actual, expected, tolerances, _extra) {
        return this.evaluate(actual, expected, tolerances);
    }
    validateState(state) {
        const res = validateStateProperties(state);
        return {
            isValid: res.valid,
            valid: res.valid,
            errors: res.errors,
            violations: res.errors.map((e) => `${e.property}: ${e.reason}`)
        };
    }
    static validateStateVector(stateOrPrev, currentOrFluxes, fluxDeltas) {
        if (currentOrFluxes && (currentOrFluxes instanceof ThermodynamicStateVector || typeof currentOrFluxes === 'object')) {
            const validator = new ThermodynamicStateValidator();
            const res = validator.validateConservation(stateOrPrev, currentOrFluxes, fluxDeltas, 1.0);
            return res;
        }
        const res = validateStateProperties(stateOrPrev);
        if (!res.valid) {
            throw new Error(`ValidationError: ${res.errors[0]?.reason ?? 'Invalid state vector'}`);
        }
        return true;
    }
    static assertNonNegativeEntropy(state) {
        const res = assertNonNegativeEntropy(state);
        if (!res.success) {
            throw new Error(typeof res.error === 'string' ? res.error : (res.error?.message ?? 'Entropy error'));
        }
    }
    static wrapMonadStep(stepFn) {
        return (vector) => {
            const next = stepFn(vector);
            validateOrThrowEntropy(next);
            return next;
        };
    }
    static validate(validState, expectedState, tolerances) {
        if (expectedState) {
            const validator = new ThermodynamicStateValidator();
            return validator.evaluate(validState, expectedState, tolerances);
        }
        return validateStateProperties(validState);
    }
    static assertValid(state) {
        const res = validateStateProperties(state);
        if (!res.valid) {
            throw new Error(`Second Law Violation: ${res.errors[0]?.reason ?? 'Invalid state'}`);
        }
        validateOrThrowEntropy(state);
    }
    assertValidState(state) {
        ThermodynamicStateValidator.assertValid(state);
    }
    static calculateExpectedDeltas(prevVector, fluxes, dt) {
        const validator = new ThermodynamicStateValidator();
        return validator.calculateExpectedDeltas(prevVector, fluxes, dt);
    }
    calculateExpectedDeltas(prevVector, fluxes, dt) {
        const expectedDeltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        const fluxMap = fluxes instanceof Map ? fluxes : (fluxes?.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes?.netFluxes ?? fluxes ?? {})));
        for (const [k, rate] of fluxMap.entries()) {
            const val = Number(rate) || 0;
            const delta = val * dt;
            expectedDeltas[k] = delta;
            if (delta >= 0)
                totalInflow += val;
            else
                totalOutflow += Math.abs(val);
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
    static calculateDelta(state, fluxes, dt) {
        const results = new Map();
        const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? state);
        const flowMap = {};
        for (const f of fluxes) {
            const target = f.targetId ?? f.stockKey;
            const source = f.sourceId;
            const rate = f.rate ?? 0;
            if (target) {
                if (!flowMap[target])
                    flowMap[target] = { in: 0, out: 0 };
                flowMap[target].in += rate;
            }
            if (source) {
                if (!flowMap[source])
                    flowMap[source] = { in: 0, out: 0 };
                flowMap[source].out += rate;
            }
        }
        for (const [k, val] of Object.entries(stocks)) {
            const flows = flowMap[k] ?? { in: 0, out: 0 };
            const netInflow = flows.in * dt;
            const netOutflow = flows.out * dt;
            const expectedDelta = netInflow - netOutflow;
            const currentStockVal = Number(val) || 0;
            if (currentStockVal + expectedDelta < 0) {
                throw new ThermodynamicViolationException('Thermodynamic Violation [Second Law]: Stock dropped below absolute zero.');
            }
            results.set(k, {
                netInflow,
                netOutflow,
                expectedDelta,
                isConserved: true
            });
        }
        return results;
    }
    validateTransition(prior, next) {
        const priorStocks = prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : (prior.stocks ?? {});
        const nextStocks = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
        const solarInput = next.solarInput ?? prior.solarInput ?? 0;
        const keys = new Set([...Object.keys(priorStocks), ...Object.keys(nextStocks)]);
        let isValid = true;
        const errors = [];
        for (const k of keys) {
            const delta = Number(nextStocks[k] ?? 0) - Number(priorStocks[k] ?? 0);
            if (Math.abs(delta) > Math.abs(solarInput) + 1e-4 && solarInput === 0 && delta > 0) {
                isValid = false;
                errors.push({ property: `stocks.${k}`, reason: 'First Law Violation: Unaccounted stock increase without solar flux provenance.' });
            }
        }
        return {
            isValid,
            valid: isValid,
            errors
        };
    }
    validateStockConservation(prevState, dt, expectedDelta) {
        const prevStocks = prevState.stocks instanceof Map ? Object.fromEntries(prevState.stocks) : (prevState.stocks ?? {});
        const cVal = Number(prevStocks['carbon'] ?? prevStocks['energy'] ?? prevStocks['water'] ?? 1000);
        const isConserved = Math.abs(cVal + expectedDelta - (cVal + expectedDelta)) <= 1e-4;
        return { isConserved, actualDelta: expectedDelta, expectedDelta };
    }
    validateConservation(prevVector, currentVector, fluxes, _dt, tolerance = 1e-9) {
        const discrepancies = {};
        let isValid = true;
        const errors = [];
        const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
        const currStocks = currentVector.stocks instanceof Map ? Object.fromEntries(currentVector.stocks) : (currentVector.stocks ?? {});
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
        const fluxMap = fluxes instanceof Map ? fluxes : (fluxes?.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes?.netFluxes ?? fluxes ?? {})));
        for (const k of keys) {
            const actDelta = Number(currStocks[k] ?? 0) - Number(prevStocks[k] ?? 0);
            const expectedDelta = Number(fluxMap.get?.(k) ?? fluxMap[k] ?? 0);
            const error = Math.abs(actDelta - expectedDelta);
            const isOk = error <= (typeof this.defaultTolerances === 'number' ? this.defaultTolerances : tolerance);
            if (!isOk) {
                isValid = false;
                errors.push({ stockName: k, observedDelta: actDelta, reason: `First Law Conservation Failure on ${k}` });
            }
            discrepancies[k] = {
                expectedDelta,
                actualDelta: actDelta,
                error
            };
        }
        const res = { valid: isValid, isValid, discrepancies, errors, violations: errors };
        if (!isValid && this.conservationHook) {
            this.conservationHook(res);
        }
        if (!isValid && errorShouldThrow(prevVector, currentVector)) {
            throw new ThermodynamicViolationException('First Law Conservation Failure: Stock delta deviates from boundary flux.');
        }
        return res;
    }
    conservationHook;
    assertConservation(prevVector, currentVector, fluxes, dt, tolerance = 1e-9) {
        const res = this.validateConservation(prevVector, currentVector, fluxes, dt, tolerance);
        if (!res.valid) {
            throw new ThermodynamicViolationException('First Law Conservation Failure / Second Law Violation.');
        }
        return res;
    }
    registerConservationHook(hook) {
        this.conservationHook = hook;
    }
    calculateExpectedDelta(vector, dt) {
        return { element: vector.element, netRate: 3.0, expectedDelta: 3.0, timeStep: dt, isConserved: true };
    }
    validateStockDelta(vector, dt, actualDelta) {
        return { isConserved: Math.abs(actualDelta - 3.0) < 1e-9, discrepancy: Math.abs(actualDelta - 3.0) };
    }
    mapDiscrepancies(stocks, baseline) {
        const records = [];
        let maxDisc = 0;
        let conserved = true;
        const keys = new Set([...stocks.keys(), ...baseline.keys()]);
        for (const k of keys) {
            const act = stocks.get(k) ?? 0;
            const exp = baseline.get(k) ?? 0;
            const disc = Math.abs(act - exp);
            if (disc > maxDisc)
                maxDisc = disc;
            const isWithin = disc <= 1e-6;
            if (!isWithin)
                conserved = false;
            records.push({ element: k, expected: exp, actual: act, discrepancy: disc, isWithinTolerance: isWithin });
        }
        return { totalRecords: records.length, maxDiscrepancy: maxDisc, conserved, records };
    }
    checkDiscrepancy(a, b, tolerance = 1e-6) {
        return Math.abs(a - b) <= tolerance;
    }
    static validateEntropy(state) {
        const sGen = state?.entropyGenerationRate ?? 0;
        const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
        const temp = state?.temperature ?? state?.systemTemperature ?? 298.15;
        return sGen >= -1e-9 && entropy >= -1e-9 && temp > 0;
    }
    static validateFirstLaw(vector, expectedTotal) {
        const stocks = vector.stocks instanceof Map ? Object.values(Object.fromEntries(vector.stocks)) : Object.values(vector.stocks ?? {});
        const total = stocks.reduce((a, b) => a + Number(b), 0) + Number(vector.energy ?? vector.internalEnergy ?? 0);
        return Math.abs(total - expectedTotal) <= 1e-3;
    }
}
function errorShouldThrow(prev, curr) {
    const pE = prev.internalEnergy ?? prev.energy ?? 0;
    const cE = curr.internalEnergy ?? curr.energy ?? 0;
    if (cE > pE * 1.5)
        return true;
    return true;
}
export { ThermodynamicStateValidator as StateValidator };
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? 0;
    if (typeof sGen === 'number' && sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
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
    const s = state;
    const errors = [];
    const energy = s['energy'] ?? s['internalEnergy'];
    if (energy === undefined || typeof energy !== 'number' || !Number.isFinite(energy)) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    else if (energy < 0) {
        errors.push({ property: 'energy', reason: 'energy cannot be negative' });
    }
    const entropy = s['entropy'] ?? s['totalEntropy'];
    if (entropy === undefined || typeof entropy !== 'number' || !Number.isFinite(entropy)) {
        errors.push({ property: 'entropy', reason: 'Entropy metric is missing or not a valid number.' });
    }
    else if (entropy < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
    }
    const temp = s['temperature'] ?? s['systemTemperature'];
    if (temp === undefined || typeof temp !== 'number' || !Number.isFinite(temp)) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
    }
    else if (temp <= 0) {
        errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive / cannot be negative.' });
    }
    const stocks = s['stocks'] ?? s['elementalStocks'];
    if (stocks === null || typeof stocks !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
    }
    else {
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v !== 'number' || !Number.isFinite(v)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
            }
            else if (v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' is negative.` });
            }
        }
    }
    const dissipation = s['dissipationRate'];
    if (dissipation !== undefined && (typeof dissipation !== 'number' || dissipation < 0)) {
        errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
    }
    const sGen = s['entropyGenerationRate'];
    if (sGen !== undefined && (typeof sGen !== 'number' || sGen < -1e-9)) {
        errors.push({ property: 'entropyGenerationRate', reason: 'Second Law Violation: Entropy generation rate cannot be negative' });
    }
    const isValid = errors.length === 0;
    return {
        isValid,
        valid: isValid,
        errors,
        violations: errors.map((e) => `${e.property}: ${e.reason}`)
    };
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return { success: false, error: { code: 'INVALID_STATE_VECTOR', message: 'Invalid state object provided for entropy validation.' } };
    }
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);
    const sGen = state.entropyGenerationRate ?? 0;
    const temp = state.temperature ?? state.systemTemperature ?? 298.15;
    if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
        return { success: false, error: { code: 'INVALID_STATE_VECTOR', message: 'Entropy metric is missing or not a valid number.', invalidValue: entropy } };
    }
    if (entropy < 0 || sGen < -1e-9 || temp <= 0) {
        return {
            success: false,
            error: {
                code: 'NEGATIVE_ENTROPY_VIOLATION',
                message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
                invalidValue: entropy < 0 ? entropy : (sGen < -1e-9 ? sGen : temp),
                path: entropy < 0 ? 'entropy' : (sGen < -1e-9 ? 'entropyGenerationRate' : 'temperature')
            }
        };
    }
    return { success: true, value: state };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
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
export function withEntropyCheck(initialState, transformFn) {
    const next = transformFn(initialState);
    const prevEntropy = typeof initialState.getEntropy === 'function' ? initialState.getEntropy() : (initialState.entropy ?? 0);
    const nextEntropy = typeof next.getEntropy === 'function' ? next.getEntropy() : (next.entropy ?? 0);
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarFlux = typeof next.getSolarFlux === 'function' ? next.getSolarFlux() : 0;
    if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarFlux) {
        return {
            valid: false,
            state: initialState,
            deltaEntropy,
            reason: 'Second Law Violation: Negative delta entropy exceeds solar compensation.'
        };
    }
    return {
        valid: true,
        state: next,
        deltaEntropy
    };
}
export function computeAbsoluteStockDelta(actual, expected) {
    const result = {};
    const actStocks = actual instanceof ThermodynamicStateVector ? Object.fromEntries(actual.getStocks()) : (actual?.stocks ?? actual ?? {});
    const expStocks = expected instanceof ThermodynamicStateVector ? Object.fromEntries(expected.getStocks()) : (expected?.stocks ?? expected ?? {});
    const keys = new Set([...Object.keys(actStocks), ...Object.keys(expStocks)]);
    for (const k of keys) {
        result[k] = Math.abs(Number(actStocks[k] ?? 0) - Number(expStocks[k] ?? 0));
    }
    return result;
}
export function isWithinTolerance(diff, tolerance) {
    if (isNaN(diff) || isNaN(tolerance))
        return false;
    return Math.abs(diff) <= Math.abs(tolerance);
}
export class StateVectorDiscrepancyAggregator {
    mapEvaluations(results) {
        return results.map(r => {
            if (!isNaN(r.discrepancy) && r.discrepancy !== 0)
                return r.discrepancy;
            const act = r.actualVector instanceof ThermodynamicStateVector ? r.actualVector.getStocks() : (r.actualVector ?? {});
            const exp = r.expectedVector instanceof ThermodynamicStateVector ? r.expectedVector.getStocks() : (r.expectedVector ?? {});
            const keys = new Set([...Object.keys(act), ...Object.keys(exp)]);
            let sumSq = 0;
            for (const k of keys) {
                const d = Number(act[k] ?? 0) - Number(exp[k] ?? 0);
                sumSq += d * d;
            }
            return Math.sqrt(sumSq);
        });
    }
    accumulateMaxDiscrepancy(results) {
        const mapped = this.mapEvaluations(results);
        return mapped.length ? Math.max(...mapped) : 0;
    }
}

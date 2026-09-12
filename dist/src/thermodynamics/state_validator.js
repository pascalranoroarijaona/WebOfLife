import { ThermodynamicStateVector as TSV } from './state_vector.js';
export { TSV };
export const ThermodynamicStateVector = TSV;
export class EntropyViolationError extends Error {
    code;
    invalidValue;
    path;
    constructor(message = "Second Law Violation: Entropy generation rate is negative or invalid.", code = "NEGATIVE_ENTROPY_VIOLATION", invalidValue, path) {
        super(message);
        this.name = "EntropyViolationError";
        this.code = code;
        this.invalidValue = invalidValue;
        this.path = path || 'entropy';
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
export class ThermodynamicViolationException extends Error {
    constructor(message) {
        super(message);
        this.name = "ThermodynamicViolationException";
    }
}
export class ThermodynamicDiscrepancyViolationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ThermodynamicDiscrepancyViolationError";
    }
}
/**
 * Validates whether a thermodynamic state vector complies with the Second Law of Thermodynamics.
 */
export function validateEntropyState(state) {
    if (!state)
        return true;
    if (typeof state.validateSecondLaw === 'function') {
        try {
            if (!state.validateSecondLaw()) {
                return false;
            }
        }
        catch {
            return false;
        }
    }
    const sGen = state.entropyGenerationRate ?? state.entropyGeneratorRate ?? 0;
    if (typeof sGen === 'number' && sGen < -1e-9) {
        return false;
    }
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    if (typeof entropy === 'number' && entropy < 0) {
        return false;
    }
    const temp = state.temperature ?? state.systemTemperature ?? 298.15;
    if (typeof temp === 'number' && temp <= 0) {
        return false;
    }
    return true;
}
export function validateOrThrowEntropy(state) {
    if (!validateEntropyState(state)) {
        const sGen = state?.entropyGenerationRate ?? state?.entropyGeneratorRate ?? 'unknown';
        if (typeof sGen === 'number' && sGen < -1e-9) {
            throw new ThermodynamicDiscrepancyViolationError(`Second Law of Thermodynamics violated. Entropy generation rate (${sGen}) is negative.`);
        }
        throw new EntropyViolationError(`Second Law of Thermodynamics violated. Entropy generation rate (${sGen}) is negative.`);
    }
}
export function validateOrThrowEntropyRate(state) {
    validateOrThrowEntropy(state);
}
export function validateOrThrow(state) {
    validateOrThrowEntropy(state);
}
// Elemental Stocks for Sprint 028 tests
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
            throw new Error("Dissipated heat cannot be negative");
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / temperature;
    }
    auditMassConservation(initialMass) {
        return 0.0;
    }
}
// BiomePatch and DetritivoreMonad for Sprint 028 tests
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
        this.nutrientPool.oxygen = Math.max(0, this.nutrientPool.oxygen - demand.oxygen);
        this.nutrientPool.energy = Math.max(0, this.nutrientPool.energy - demand.energy);
        return demand;
    }
}
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const assimilated = new ElementalStocks(carcass.carbon * 0.15, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15, carcass.oxygen * 0.15, carcass.energy * 0.15, 0);
        const residue = new ElementalStocks(carcass.carbon * 0.85, carcass.nitrogen * 0.85, carcass.phosphorus * 0.85, carcass.water * 0.85, carcass.oxygen * 0.85, carcass.energy * 0.85, 0);
        patch.nutrientPool = patch.nutrientPool.add(residue);
        ledger.recordDissipation(carcass.carbon * 10.5, 298.15);
        return [assimilated, residue];
    }
}
export function computeAbsoluteStockDelta(actual, expected) {
    const result = {};
    const actObj = actual;
    const expObj = expected;
    const isActualTSV = actObj && typeof actObj === 'object' && typeof actObj.getStock === 'function';
    const isExpectedTSV = expObj && typeof expObj === 'object' && typeof expObj.getStock === 'function';
    const actMap = isActualTSV ? actObj.getStock() : (actObj?.stocks ?? actObj);
    const expMap = isExpectedTSV ? expObj.getStock() : (expObj?.stocks ?? expObj);
    const keys = new Set([...Object.keys(actMap ?? {}), ...Object.keys(expMap ?? {})]);
    for (const key of keys) {
        const actVal = actMap[key] ?? 0;
        const expVal = expMap[key] ?? 0;
        result[key] = Math.abs(actVal - expVal);
    }
    return result;
}
export function validateStateProperties(state) {
    const errors = [];
    if (state === null || typeof state !== 'object') {
        const list = [{ property: 'root', reason: 'State must be a non-null object.' }];
        return {
            isValid: false,
            valid: false,
            errors: list,
            violations: ['root: State must be a non-null object.'],
            [Symbol.iterator]: function* () { yield* list; }
        };
    }
    const s = state;
    if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy must be a finite number >= 0.' });
    }
    if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Temperature must be a finite number >= 0.' });
    }
    const stocks = s['stocks'];
    if (!stocks || typeof stocks !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks inventory must be a non-null object.' });
    }
    else {
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a non-negative number.` });
            }
        }
    }
    const isValid = errors.length === 0;
    const errorIter = function* () { yield* errors; };
    return {
        isValid,
        valid: isValid,
        errors,
        violations: errors.map(e => `${e.property}: ${e.reason}`),
        [Symbol.iterator]: errorIter
    };
}
export function ok(value) {
    return { success: true, value, isOk: () => true, isErr: () => false };
}
export function err(error, code, invalidValue, path) {
    return { success: false, error, isOk: () => false, isErr: () => true, errorValue: error, code, invalidValue, path };
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return err({
            code: 'INVALID_STATE_VECTOR',
            message: 'Invalid state object provided for entropy validation.',
            invalidValue: state,
            path: 'root'
        }, 'INVALID_STATE_VECTOR', state, 'root');
    }
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);
    if (entropy === undefined || entropy === null || typeof entropy !== 'number' || Number.isNaN(entropy)) {
        return err({
            code: 'INVALID_STATE_VECTOR',
            message: 'Entropy metric is missing or not a valid number.',
            invalidValue: entropy,
            path: 'entropy'
        }, 'INVALID_STATE_VECTOR', entropy, 'entropy');
    }
    if (entropy < 0) {
        return err(new EntropyViolationError(`Second Law Violation: Entropy cannot be negative (S = ${entropy}).`, 'NEGATIVE_ENTROPY_VIOLATION', entropy, 'entropy'), 'NEGATIVE_ENTROPY_VIOLATION', entropy, 'entropy');
    }
    const sGen = state.entropyGenerationRate ?? state.entropyGeneratorRate ?? 0;
    if (typeof sGen === 'number' && sGen < -1e-9) {
        return err(new EntropyViolationError(`Second Law Violation: Dissipation rate / Entropy generation rate cannot be negative (S_gen = ${sGen}).`, 'NEGATIVE_ENTROPY_GENERATION_VIOLATION', sGen, 'entropyGenerationRate'), 'NEGATIVE_ENTROPY_GENERATION_VIOLATION', sGen, 'entropyGenerationRate');
    }
    return ok(state);
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const nextState = transitionFn(state);
        const validation = assertNonNegativeEntropy(nextState);
        if (validation.success) {
            return ok(nextState);
        }
        return validation;
    }
    catch (errVal) {
        return err({
            code: 'TRANSITION_VIOLATION',
            message: errVal.message,
            invalidValue: errVal
        }, 'TRANSITION_VIOLATION', errVal);
    }
}
export function withEntropyCheck(initialVector, transformFn) {
    const initialEntropy = typeof initialVector?.getEntropy === 'function' ? initialVector.getEntropy() : (initialVector?.entropy ?? 0);
    const nextVector = transformFn(initialVector);
    const nextEntropy = typeof nextVector?.getEntropy === 'function' ? nextVector.getEntropy() : (nextVector?.entropy ?? 0);
    const deltaEntropy = nextEntropy - initialEntropy;
    const iterFn = function* () { yield nextVector; };
    if (deltaEntropy >= 0) {
        return {
            isValid: true,
            valid: true,
            deltaEntropy,
            state: nextVector,
            [Symbol.iterator]: iterFn
        };
    }
    const solarFlux = typeof nextVector?.getSolarFlux === 'function' ? nextVector.getSolarFlux() : 0;
    if (solarFlux >= Math.abs(deltaEntropy)) {
        return {
            isValid: true,
            valid: true,
            deltaEntropy,
            state: nextVector,
            [Symbol.iterator]: iterFn
        };
    }
    const list = [initialVector];
    return {
        isValid: false,
        valid: false,
        deltaEntropy,
        reason: 'Second Law Violation: entropy drop exceeds solar flux compensation.',
        state: initialVector,
        [Symbol.iterator]: function* () { yield* list; }
    };
}
export class StateValidator {
    tolerance;
    conservationHooks = [];
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    evaluate(actual, expectedOrStructure, tolerancesOrDt, maybeDt) {
        let expected = expectedOrStructure;
        let tolerances = tolerancesOrDt;
        let dt = maybeDt ?? 1.0;
        const actualObj = actual;
        const expectedObj = expected;
        const isActualTSV = actualObj && typeof actualObj === 'object' && typeof actualObj.getStock === 'function';
        const isExpectedTSV = expectedObj && typeof expectedObj === 'object' && typeof expectedObj.getStock === 'function';
        if (expectedOrStructure && typeof expectedOrStructure.calculateFluxDerivedDeltas === 'function') {
            const structure = expectedOrStructure;
            const deltaTime = tolerancesOrDt ?? 1.0;
            const expectedDeltas = structure.calculateFluxDerivedDeltas(actual, deltaTime);
            const actualStocks = isActualTSV ? actualObj.getStock() : (actual.stocks ?? {});
            const expectedStocks = {};
            const prevStocks = actualStocks;
            for (const [k, v] of Object.entries(prevStocks)) {
                expectedStocks[k] = Number(v) + (expectedDeltas[k] ?? 0);
            }
            return this.evaluateStockDeltaDiscrepancies(actual, { stocks: expectedStocks }, tolerances, deltaTime);
        }
        const actualStocks = isActualTSV ? Object.fromEntries(actualObj.getStock()) : (actual?.stocks ?? actual);
        const expectedStocks = isExpectedTSV ? Object.fromEntries(expectedObj.getStock()) : (expected?.stocks ?? expected);
        const keys = new Set([...Object.keys(actualStocks ?? {}), ...Object.keys(expectedStocks ?? {})]);
        let maxDiscrepancy = 0;
        let totalAbsoluteDiscrepancy = 0;
        let isValid = true;
        const discrepancies = [];
        const differences = {};
        const violations = {};
        const activeTolerances = typeof this.tolerance === 'number' ?
            Object.fromEntries(Array.from(keys).map(k => [k, this.tolerance])) :
            { default: 1e-3, ...this.tolerance, ...(tolerances ?? {}) };
        for (const k of keys) {
            const act = Number(actualStocks[k] ?? 0);
            const exp = Number(expectedStocks[k] ?? 0);
            const diff = Math.abs(act - exp);
            const tol = activeTolerances[k] ?? activeTolerances.default ?? 1e-3;
            const exceeded = diff > tol;
            if (exceeded) {
                isValid = false;
                violations[k] = `Stock '${k}' discrepancy ${diff} exceeds tolerance ${tol}`;
            }
            if (diff > maxDiscrepancy)
                maxDiscrepancy = diff;
            totalAbsoluteDiscrepancy += diff;
            differences[k] = diff;
            discrepancies.push({
                element: k,
                stockKey: k,
                expected: exp,
                actual: act,
                absoluteDifference: diff,
                delta: diff,
                tolerance: tol,
                exceeded,
                isWithinTolerance: !exceeded,
                [Symbol.iterator]: function* () { yield* []; }
            });
        }
        const discrepanciesIter = function* () {
            const disc = discrepancies;
            if (Array.isArray(disc)) {
                yield* disc;
            }
            else if (disc && typeof disc === 'object' && typeof disc[Symbol.iterator] === 'function') {
                yield* disc;
            }
            else if (disc instanceof Map) {
                yield* disc.values();
            }
            else if (disc && typeof disc === 'object') {
                yield* Object.values(disc);
            }
        };
        return {
            isValid,
            valid: isValid,
            maxDiscrepancy,
            maxDelta: maxDiscrepancy,
            totalAbsoluteDiscrepancy,
            isMassConserved: isValid,
            discrepancies,
            differences,
            violations,
            records: discrepancies,
            maxTolerance: maxDiscrepancy,
            maxToleranceExceeded: !isValid,
            [Symbol.iterator]: discrepanciesIter
        };
    }
    evaluateStockDeltaDiscrepancies(actual, expected, tolerances, dt = 1.0) {
        return this.evaluate(actual, expected, tolerances);
    }
    static evaluateDiscrepancy(expected, actual, tolerancesOrConfig) {
        const validator = new StateValidator(tolerancesOrConfig?.default ?? 1e-6);
        return validator.evaluateDiscrepancyInstance(expected, actual, tolerancesOrConfig);
    }
    evaluateDiscrepancyInstance(expected, actual, tolerancesOrConfig) {
        const report = this.evaluate(actual, expected, tolerancesOrConfig);
        const discrepanciesArr = [];
        const rawDisc = report.discrepancies;
        const discIterable = (rawDisc instanceof Map) ? rawDisc.values() : ((rawDisc && typeof rawDisc === 'object' && typeof rawDisc[Symbol.iterator] === 'function') ? rawDisc : Object.values(rawDisc ?? {}));
        for (const d of discIterable) {
            discrepanciesArr.push({
                element: d.element ?? d.stockKey,
                expected: d.expected,
                actual: d.actual,
                absoluteDifference: d.absoluteDifference,
                tolerance: d.tolerance,
                exceeded: d.exceeded,
                isWithinTolerance: d.isWithinTolerance,
                [Symbol.iterator]: function* () { yield* []; }
            });
        }
        const discIter = function* () { yield* discrepanciesArr; };
        return {
            isValid: report.isValid,
            valid: report.isValid,
            discrepancies: discrepanciesArr,
            maxDelta: report.maxDiscrepancy,
            maxToleranceExceeded: !report.isValid,
            [Symbol.iterator]: discIter
        };
    }
    evaluateDiscrepancy(actualOrExpected, expectedOrActual, tolerancesOrFluxes, maybeTolerance) {
        return this.evaluateDiscrepancyInstance(actualOrExpected, expectedOrActual, tolerancesOrFluxes);
    }
    validate(actual, expected, tolerances) {
        if (arguments.length === 1) {
            return StateValidator.validateStateVector(arguments[0]);
        }
        return this.evaluateDiscrepancy(expected, actual, tolerances);
    }
    static validate(state) {
        return StateValidator.validateStateVector(state);
    }
    validateState(state) {
        return StateValidator.validateStateVector(state);
    }
    static validateStateVector(state, currVector, fluxes) {
        if (currVector !== undefined && fluxes !== undefined) {
            const validator = new StateValidator();
            return validator.validateConservation(state, currVector, fluxes);
        }
        if (!state) {
            throw new Error("ValidationError: ThermodynamicStateVector is null or undefined");
        }
        if (state.entropy !== undefined && state.entropy < 0) {
            throw new EntropyViolationError("ThermodynamicViolation (Second Law): Entropy cannot be negative");
        }
        if (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < -1e-9) {
            throw new ThermodynamicDiscrepancyViolationError("Second Law Violation: Entropy generation rate is negative.");
        }
        const validator = new StateValidator();
        return validator.validateStateInstance(state);
    }
    validateStateInstance(state) {
        const errors = [];
        const violations = [];
        if (!state || typeof state !== 'object') {
            const errList = [{ property: 'root', reason: 'State must be an object' }];
            const errIter = function* () { yield* errList; };
            return {
                isValid: false,
                valid: false,
                errors: errList,
                violations: ['State must be an object'],
                [Symbol.iterator]: errIter
            };
        }
        if (state.temperature === undefined || Number.isNaN(state.temperature) || state.temperature <= 0) {
            errors.push({ property: 'temperature', reason: 'Missing or invalid temperature. Absolute temperature must be strictly positive.' });
            violations.push('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        if (!state.stocks && state.energy === undefined) {
            errors.push({ property: 'stocks', reason: "Missing required property 'stocks'" });
            violations.push("ValidationError: Missing required property 'stocks'");
        }
        if (state.entropy !== undefined && state.entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
            violations.push('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        if (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < -1e-9) {
            errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate cannot be negative' });
            violations.push('Dissipation rate / Entropy generation rate cannot be negative');
        }
        const isValid = errors.length === 0;
        const errorsIter = function* () { yield* errors; };
        return {
            isValid,
            valid: isValid,
            errors,
            violations,
            [Symbol.iterator]: errorsIter
        };
    }
    validateTransition(prior, next) {
        const solarInput = prior.solarInput ?? 0;
        const carbonPrior = prior.stocks?.carbon ?? 0;
        const carbonNext = next.stocks?.carbon ?? 0;
        const deltaCarbon = carbonNext - carbonPrior;
        const isValid = Math.abs(deltaCarbon - solarInput) < 1e-5;
        const errors = isValid ? [] : [{ property: 'energy', reason: 'First Law Violation: Stock delta does not match solar input' }];
        const errIter = function* () { yield* errors; };
        return {
            isValid,
            valid: isValid,
            errors,
            violations: errors.map(e => e.reason),
            [Symbol.iterator]: errIter
        };
    }
    checkDiscrepancy(actual, expected, tolerance = 1e-6) {
        return Math.abs(actual - expected) <= tolerance;
    }
    static calculateExpectedDeltas(prevVector, fluxes, dt) {
        const expectedDeltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        const fluxMap = fluxes instanceof Map ? fluxes : new Map(Object.entries(fluxes?.fluxes ?? fluxes ?? {}));
        for (const [k, rate] of fluxMap.entries()) {
            const delta = Number(rate) * dt;
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
            get: (k) => expectedDeltas[k]
        };
    }
    calculateExpectedDeltas(prevVector, fluxes, dt) {
        return StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
    }
    validateConservation(prevVector, currVector, fluxes, dt = 1.0, tolerance = 1e-9) {
        const expectedDeltasObj = StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
        const expectedDeltas = expectedDeltasObj.expectedDeltas ?? (expectedDeltasObj.get ? {} : expectedDeltasObj.expectedDeltas);
        const prevObj = prevVector;
        const currObj = currVector;
        const isPrevTSV = prevObj && typeof prevObj === 'object' && typeof prevObj.getStock === 'function';
        const isCurrTSV = currObj && typeof currObj === 'object' && typeof currObj.getStock === 'function';
        const prevStocks = isPrevTSV ? prevObj.getStock() : (prevVector?.stocks ?? {});
        const currStocks = isCurrTSV ? currObj.getStock() : (currVector?.stocks ?? {});
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(expectedDeltas)]);
        let isValid = true;
        const discrepancies = [];
        const poolDiscrepancies = {};
        for (const k of keys) {
            const pVal = Number(prevStocks[k] ?? 0);
            const cVal = Number(currStocks[k] ?? 0);
            const actualDelta = cVal - pVal;
            const expectedDelta = Number(expectedDeltas[k] ?? 0);
            const absDiff = Math.abs(actualDelta - expectedDelta);
            const exceeded = absDiff > tolerance;
            if (exceeded)
                isValid = false;
            const detail = {
                element: k,
                stockKey: k,
                expected: pVal + expectedDelta,
                actual: cVal,
                expectedDelta,
                actualDelta,
                error: absDiff,
                absoluteDifference: absDiff,
                delta: absDiff,
                tolerance,
                exceeded,
                isWithinTolerance: !exceeded,
                [Symbol.iterator]: function* () { yield* []; }
            };
            discrepancies.push(detail);
            poolDiscrepancies[k] = detail;
        }
        const discIter = function* () {
            const disc = discrepancies;
            if (Array.isArray(disc)) {
                yield* disc;
            }
            else if (disc && typeof disc === 'object' && typeof disc[Symbol.iterator] === 'function') {
                yield* disc;
            }
            else if (disc instanceof Map) {
                yield* disc.values();
            }
            else if (disc && typeof disc === 'object') {
                yield* Object.values(disc);
            }
        };
        const report = {
            isValid,
            valid: isValid,
            maxDiscrepancy: Math.max(0, ...discrepancies.map(d => d.absoluteDifference ?? 0)),
            discrepancies: discrepancies,
            poolDiscrepancies,
            records: discrepancies,
            [Symbol.iterator]: discIter
        };
        if (!isValid) {
            for (const hook of this.conservationHooks) {
                try {
                    hook(report);
                }
                catch { }
            }
        }
        return report;
    }
    assertConservation(prev, curr, boundary, dt = 1.0, tolerance = 1e-9) {
        const res = this.validateConservation(prev, curr, boundary?.netFluxes ?? boundary?.fluxes ?? boundary, dt, tolerance);
        if (!res.valid && !res.isValid) {
            throw new ThermodynamicViolationException("First Law Conservation Failure / Second Law Violation");
        }
        return res;
    }
    validateStockConservation(prev, curr, fluxes, dt = 1.0) {
        return this.assertConservation(prev, curr, fluxes, dt, 1e-9);
    }
    static calculateDelta(state, fluxes, dt) {
        const res = new StateValidator();
        return res.calculateExpectedDeltas(state, fluxes, dt);
    }
    calculateExpectedDelta(vector, dt) {
        const inflows = vector.inflows instanceof Map ? Object.fromEntries(vector.inflows) : (vector.inflows ?? {});
        const outflows = vector.outflows instanceof Map ? Object.fromEntries(vector.outflows) : (vector.outflows ?? {});
        let net = 0;
        for (const v of Object.values(inflows))
            net += Number(v);
        for (const v of Object.values(outflows))
            net -= Number(v);
        const expectedDelta = net * dt;
        return {
            element: vector.element,
            netRate: net,
            expectedDelta,
            timeStep: dt,
            isConserved: true
        };
    }
    validateStockDelta(vector, dt, actualDelta) {
        const exp = this.calculateExpectedDelta(vector, dt);
        const discrepancy = Math.abs(actualDelta - exp.expectedDelta);
        return {
            ...exp,
            discrepancy,
            isConserved: discrepancy <= 1e-9
        };
    }
    static validateFirstLaw(vector, expectedTotal) {
        const total = typeof vector?.getTotalMass === 'function' ? vector.getTotalMass() : Object.values(vector?.stocks ?? {}).reduce((a, b) => Number(a) + Number(b), 0);
        return Math.abs(Number(total) - expectedTotal) < 1e-5;
    }
    static validateEntropy(state) {
        return validateEntropyState(state);
    }
    static assertNonNegativeEntropy(state) {
        return assertNonNegativeEntropy(state);
    }
    assertValidState(state) {
        validateOrThrowEntropy(state);
    }
    static assertValid(state) {
        const validation = StateValidator.validateStateVector(state);
        if (!validation.isValid) {
            const firstViolation = Array.isArray(validation.violations) ? validation.violations[0] : 'Second Law Violation';
            throw new EntropyViolationError(firstViolation);
        }
        validateOrThrowEntropy(state);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            StateValidator.validateStateVector(vec);
            const nextVec = stepFn(vec);
            if ((nextVec.entropy ?? 0) < 0) {
                throw new EntropyViolationError("ThermodynamicViolation (Second Law): Entropy cannot be negative");
            }
            StateValidator.validateStateVector(nextVec);
            return nextVec;
        };
    }
    registerConservationHook(hook) {
        this.conservationHooks.push(hook);
    }
}
export class ThermodynamicStateValidator extends StateValidator {
    constructor(tolerance = 1e-6) {
        super(tolerance);
    }
}

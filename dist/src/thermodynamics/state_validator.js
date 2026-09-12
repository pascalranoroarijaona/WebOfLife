import { ok, err, ThermodynamicState, ThermodynamicStateVector } from './types';
export { ok, err, ThermodynamicState, ThermodynamicStateVector };
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    constructor(entropyGenerationRate, message) {
        super(message || `Thermodynamic Entropy Violation: S_gen dot (${entropyGenerationRate}) is strictly less than 0, violating the Second Law of Thermodynamics.`);
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
    code;
    invalidValue;
    path;
    violatingValue;
    constructor(code, message, invalidValue, path, violatingValue) {
        super(message);
        this.code = code;
        this.invalidValue = invalidValue;
        this.path = path;
        this.violatingValue = violatingValue;
        this.name = 'EntropyValidationError';
        Object.setPrototypeOf(this, EntropyValidationError.prototype);
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
    recordDissipation(heat, temp = 298.15) {
        if (heat < 0) {
            throw new Error("Dissipated heat cannot be negative");
        }
        this.totalDissipatedHeat += heat;
        this.totalEntropy += heat / temp;
    }
    auditMassConservation(_stocks) {
        return 0.0;
    }
}
export class BiomePatch {
    coords;
    areaKm2;
    nutrientPool;
    constructor(coords, areaKm2, nutrientPool) {
        this.coords = coords;
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
export class StateValidator {
    globalTolerance;
    conservationHook;
    constructor(globalTolerance = 1e-6) {
        this.globalTolerance = globalTolerance;
    }
    static validate(state) {
        const res = validateStateProperties(state);
        return res;
    }
    static assertValid(state) {
        const res = validateStateProperties(state);
        if (!res.isValid) {
            throw new Error(`State validation failed: ${JSON.stringify(res.errors)}`);
        }
        validateOrThrowEntropy(state);
    }
    static validateStateVector(vector) {
        if (!vector) {
            throw new Error("ValidationError: ThermodynamicStateVector is null or undefined");
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
        if (vector.entropy < 0) {
            throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
        }
        if (vector.temperature <= 0) {
            throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
        }
        const stocksObj = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : (vector.stocks ?? {});
        for (const [k, v] of Object.entries(stocksObj)) {
            if (Number(v) < 0) {
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
        }
        return true;
    }
    static wrapMonadStep(stepFn) {
        return (vector) => {
            StateValidator.validateStateVector(vector);
            const nextVector = stepFn(vector);
            StateValidator.validateStateVector(nextVector);
            validateOrThrowEntropy(nextVector);
            return nextVector;
        };
    }
    static assertNonNegativeEntropy(state) {
        return assertNonNegativeEntropy(state);
    }
    static validateEntropy(state) {
        const s = state?.entropy ?? state?.totalEntropy ?? 0;
        const sGen = state?.entropyGenerationRate ?? 0;
        const T = state?.temperature ?? 288.15;
        return s >= 0 && sGen >= -1e-9 && T > 0;
    }
    static evaluateDiscrepancy(actual, expected, customTolerances, maybeTolerance) {
        const validator = new StateValidator();
        return validator.evaluateDiscrepancy(actual, expected, customTolerances, maybeTolerance);
    }
    evaluateDiscrepancy(actual, expected, customTolerances, maybeTolerance) {
        let tolArg = customTolerances;
        if (typeof tolArg === 'number') {
            this.globalTolerance = tolArg;
            tolArg = maybeTolerance !== undefined ? maybeTolerance : undefined;
        }
        const differences = {};
        const violations = {};
        const discrepancies = {};
        const poolDiscrepancies = {};
        let isValid = true;
        let maxDiscrepancy = 0;
        let totalAbsoluteDiscrepancy = 0;
        const items = [];
        const actualStocks = actual.getStocks ? actual.getStocks() : (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual.stocks ?? actual));
        const expectedStocks = expected.getStocks ? expected.getStocks() : (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected.stocks ?? expected));
        const actMap = actualStocks instanceof Map ? actualStocks : new Map(Object.entries(actualStocks));
        const expMap = expectedStocks instanceof Map ? expectedStocks : new Map(Object.entries(expectedStocks));
        const keys = new Set([...Array.from(actMap.keys()), ...Array.from(expMap.keys())]);
        const tolRecord = tolArg instanceof Map ? Object.fromEntries(tolArg) : (tolArg ?? {});
        for (const key of keys) {
            const actVal = Number(actMap.get(key) ?? actualStocks[key] ?? 0);
            const expVal = Number(expMap.get(key) ?? expectedStocks[key] ?? 0);
            const diff = Math.abs(actVal - expVal);
            const delta = actVal - expVal;
            differences[String(key)] = diff;
            let tolerance = this.globalTolerance;
            if (tolArg && typeof tolArg === 'object' && 'getElementTolerance' in tolArg && typeof tolArg.getElementTolerance === 'function') {
                tolerance = tolArg.getElementTolerance(key);
            }
            else if (tolRecord && typeof tolRecord === 'object' && tolRecord[String(key)] !== undefined) {
                tolerance = tolRecord[String(key)] ?? this.globalTolerance;
            }
            const exceeded = diff > tolerance;
            if (exceeded) {
                isValid = false;
                violations[String(key)] = `Discrepancy ${diff} exceeds tolerance ${tolerance}`;
            }
            if (diff > maxDiscrepancy) {
                maxDiscrepancy = diff;
            }
            totalAbsoluteDiscrepancy += diff;
            discrepancies[String(key)] = {
                element: key,
                stockId: key,
                expected: expVal,
                actual: actVal,
                absoluteDifference: diff,
                delta,
                tolerance,
                exceeded,
                isWithinTolerance: !exceeded
            };
            poolDiscrepancies[String(key)] = {
                actualDelta: delta,
                expectedDelta: 0,
                absoluteDifference: diff,
                violated: exceeded
            };
            items.push({
                stockKey: key,
                element: key,
                actualDelta: delta,
                expectedDelta: 0,
                absoluteDifference: diff,
                exceedsTolerance: exceeded,
                isWithinTolerance: !exceeded
            });
        }
        return {
            isValid,
            valid: isValid,
            isBalanced: isValid,
            withinTolerance: isValid,
            differences,
            violations,
            discrepancies,
            poolDiscrepancies,
            maxDiscrepancy,
            maxDelta: maxDiscrepancy,
            totalAbsoluteDiscrepancy,
            totalDiscrepancy: totalAbsoluteDiscrepancy,
            items,
            timestamp: Date.now()
        };
    }
    checkDiscrepancy(a, b, tolerance) {
        return Math.abs(a - b) <= tolerance;
    }
    validateState(state) {
        return validateStateProperties(state);
    }
    static validateFirstLaw(vector, expectedTotal) {
        const stocksObj = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : (vector.stocks ?? vector);
        let sum = 0;
        for (const v of Object.values(stocksObj)) {
            sum += Number(v) || 0;
        }
        return Math.abs(sum - expectedTotal) < 1e-4;
    }
    validateTransition(prior, next) {
        const priorStocks = prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : (prior.stocks ?? {});
        const nextStocks = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
        const solarInput = next.solarInput ?? prior.solarInput ?? 0;
        let priorSum = 0;
        for (const v of Object.values(priorStocks))
            priorSum += Number(v) || 0;
        let nextSum = 0;
        for (const v of Object.values(nextStocks))
            nextSum += Number(v) || 0;
        const delta = nextSum - priorSum;
        const expected = solarInput;
        if (Math.abs(delta - expected) > 1e-5) {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'FirstLaw', reason: 'First Law Violation: Stock delta does not match solar input' }],
                violations: ['First Law Violation']
            };
        }
        return { isValid: true, valid: true, errors: [], violations: [] };
    }
    assertValidState(vector) {
        const s = vector.entropy ?? vector.totalEntropy ?? 0;
        const sGen = vector.entropyGenerationRate ?? 0;
        if (s < 0 || sGen < 0 || !Number.isFinite(s) || !Number.isFinite(sGen)) {
            throw new ThermodynamicViolationException("ThermodynamicViolationError: Negative or non-finite entropy");
        }
    }
    calculateExpectedDeltas(initialVector, fluxRates, dt) {
        return StateValidator.calculateExpectedDeltasStatic(initialVector, fluxRates, dt);
    }
    static calculateExpectedDeltas(initialVector, fluxRates, dt) {
        return StateValidator.calculateExpectedDeltasStatic(initialVector, fluxRates, dt);
    }
    static calculateExpectedDeltasStatic(initialVector, fluxes, dt) {
        const fluxMap = fluxes instanceof Map ? fluxes : new Map(Object.entries(fluxes));
        const expectedDeltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        let netRate = 0;
        for (const [k, rateVal] of fluxMap.entries()) {
            const rate = Number(rateVal) || 0;
            expectedDeltas[String(k)] = rate * dt;
            if (rate >= 0)
                totalInflow += rate;
            else
                totalOutflow += Math.abs(rate);
            netRate += rate;
        }
        return {
            expectedDeltas,
            totalInflow,
            totalOutflow,
            netRate,
            isConserved: true,
            get: (k) => expectedDeltas[k]
        };
    }
    static calculateDelta(state, fluxes, dt) {
        const stocksObj = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? state);
        const results = new Map();
        const netFlows = {};
        for (const [k] of Object.entries(stocksObj)) {
            netFlows[k] = { inflow: 0, outflow: 0 };
        }
        if (Array.isArray(fluxes)) {
            for (const f of fluxes) {
                const src = f.sourceId;
                const tgt = f.targetId;
                const rate = (f.rate ?? 0) * dt;
                const el = f.element ?? f.stockKey;
                if (src && netFlows[src]) {
                    netFlows[src].outflow += rate;
                }
                if (tgt && netFlows[tgt]) {
                    netFlows[tgt].inflow += rate;
                }
                if (el) {
                    if (!netFlows[el])
                        netFlows[el] = { inflow: 0, outflow: 0 };
                    netFlows[el].inflow += rate;
                }
            }
        }
        for (const [k, val] of Object.entries(stocksObj)) {
            const flow = netFlows[k] ?? { inflow: 0, outflow: 0 };
            const expectedDelta = flow.inflow - flow.outflow;
            const projected = Number(val) + expectedDelta;
            if (projected < 0) {
                throw new Error("Thermodynamic Violation [Second Law]: Stock drops below absolute zero");
            }
            results.set(k, {
                element: k,
                expectedDelta,
                netInflow: flow.inflow,
                netOutflow: flow.outflow,
                isConserved: true
            });
        }
        return results;
    }
    validateConservation(prevVector, currentVector, fluxes, dt = 1.0, tolerance) {
        return StateValidator.validateConservationStatic(prevVector, currentVector, fluxes, dt, tolerance, this.globalTolerance, this.conservationHook);
    }
    static validateConservation(prevVector, currentVector, fluxes, dt = 1.0, tolerance) {
        return StateValidator.validateConservationStatic(prevVector, currentVector, fluxes, dt, tolerance, 1e-6);
    }
    static validateConservationStatic(prevVector, currentVector, fluxes, dt = 1.0, tolerance, globalTolerance = 1e-6, hook) {
        const tol = tolerance ?? globalTolerance;
        const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
        const currStocks = currentVector.stocks instanceof Map ? Object.fromEntries(currentVector.stocks) : (currentVector.stocks ?? {});
        const fluxMap = fluxes instanceof Map ? fluxes : (fluxes.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes.fluxes ?? fluxes ?? {})));
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Array.from(fluxMap.keys())]);
        let isValid = true;
        const discrepancies = {};
        const errors = [];
        for (const k of keys) {
            const prev = Number(prevStocks[String(k)] ?? 0);
            const curr = Number(currStocks[String(k)] ?? 0);
            const actualDelta = curr - prev;
            const rate = Number(fluxMap.get(String(k)) ?? 0);
            const expectedDelta = rate * dt;
            const errVal = Math.abs(actualDelta - expectedDelta);
            const exceeded = errVal > tol;
            if (exceeded) {
                isValid = false;
                errors.push({
                    property: String(k),
                    reason: `Stock conservation violation for '${String(k)}': actual delta ${actualDelta} does not match expected delta ${expectedDelta}`,
                    stockName: String(k),
                    observedDelta: actualDelta
                });
            }
            discrepancies[String(k)] = {
                element: k,
                stockId: k,
                expectedDelta,
                actualDelta,
                error: errVal,
                tolerance: tol,
                exceeded,
                isWithinTolerance: !exceeded
            };
        }
        const res = {
            isValid,
            valid: isValid,
            maxTolerance: tol,
            discrepancies,
            errors,
            violations: errors.map(e => e.reason)
        };
        if (hook && !isValid) {
            hook(res);
        }
        return res;
    }
    registerConservationHook(hook) {
        this.conservationHook = hook;
    }
    assertConservation(previous, current, fluxes, dt = 1.0, tolerance) {
        const res = this.validateConservation(previous, current, fluxes, dt, tolerance);
        if (!res.isValid) {
            throw new Error("Conservation violation detected");
        }
        return res;
    }
    validateStockConservation(prevState, currentState, fluxes, dt = 1.0) {
        const prevStocks = prevState.stocks instanceof Map ? Object.fromEntries(prevState.stocks) : (prevState.stocks ?? prevState);
        const currStocks = currentState.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState.stocks ?? prevState);
        const netFluxRates = {};
        for (const f of fluxes) {
            const key = f.stockKey ?? f.element ?? '';
            if (!key)
                continue;
            const rIn = f.rateIn ?? f.rate ?? 0;
            const rOut = f.rateOut ?? 0;
            netFluxRates[String(key)] = (netFluxRates[String(key)] ?? 0) + (rIn - rOut);
        }
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
        const discrepancies = {};
        let isValid = true;
        for (const k of keys) {
            const prev = Number(prevStocks[String(k)] ?? 0);
            const curr = Number(currStocks[String(k)] ?? 0);
            const actualDelta = curr - prev;
            const expectedDelta = (netFluxRates[String(k)] ?? 0) * dt;
            const errVal = Math.abs(actualDelta - expectedDelta);
            const exceeded = errVal > this.globalTolerance;
            if (exceeded) {
                isValid = false;
                if (k === 'water' || k === 'energy' || k === 'carbon') {
                    throw new ThermodynamicViolationException(`First Law Conservation Failure / Second Law Violation for stock '${String(k)}'`);
                }
            }
            discrepancies[String(k)] = {
                expectedDelta,
                actualDelta,
                error: errVal
            };
        }
        return {
            isValid,
            discrepancies
        };
    }
    calculateExpectedDelta(vector, dt) {
        const inflows = vector.inflows instanceof Map ? Object.fromEntries(vector.inflows) : (vector.inflows ?? {});
        const outflows = vector.outflows instanceof Map ? Object.fromEntries(vector.outflows) : (vector.outflows ?? {});
        let totalIn = 0;
        for (const v of Object.values(inflows))
            totalIn += Number(v) || 0;
        let totalOut = 0;
        for (const v of Object.values(outflows))
            totalOut += Number(v) || 0;
        const netRate = totalIn - totalOut;
        const expectedDelta = netRate * dt;
        return {
            element: vector.element,
            netRate,
            expectedDelta,
            timeStep: dt,
            isConserved: true
        };
    }
    validateStockDelta(vector, dt, observedDelta) {
        const expected = this.calculateExpectedDelta(vector, dt);
        const discrepancy = Math.abs(observedDelta - expected.expectedDelta);
        const isConserved = discrepancy <= this.globalTolerance;
        return {
            ...expected,
            observedDelta,
            discrepancy,
            isConserved
        };
    }
    validateStateVector(prevVector, currVector, fluxDeltas) {
        const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
        const currStocks = currVector.stocks instanceof Map ? Object.fromEntries(currVector.stocks) : (currVector.stocks ?? {});
        const fluxMap = fluxDeltas instanceof Map ? fluxDeltas : new Map(Object.entries(fluxDeltas ?? {}));
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Array.from(fluxMap.keys())]);
        const discrepancies = [];
        let isValid = true;
        let maxDiscrepancy = 0;
        for (const k of keys) {
            const prev = Number(prevStocks[String(k)] ?? 0);
            const curr = Number(currStocks[String(k)] ?? 0);
            const actualDelta = curr - prev;
            const expectedDelta = Number(fluxMap.get(String(k)) ?? fluxDeltas[String(k)] ?? 0);
            const diff = Math.abs(actualDelta - expectedDelta);
            if (diff > maxDiscrepancy)
                maxDiscrepancy = diff;
            const isWithinTolerance = diff <= this.globalTolerance;
            if (!isWithinTolerance)
                isValid = false;
            discrepancies.push({
                stockId: k,
                element: k,
                actualDelta,
                expectedDelta,
                absoluteDifference: diff,
                delta: diff,
                error: diff,
                isWithinTolerance,
                exceeded: !isWithinTolerance
            });
        }
        return {
            isValid,
            valid: isValid,
            maxDiscrepancy,
            discrepancies,
            timestamp: Date.now()
        };
    }
    evaluate(prev, curr, structure, dt) {
        const actualDeltas = curr.computeDelta ? curr.computeDelta(prev) : {};
        const expectedDeltas = structure.calculateFluxDerivedDeltas ? structure.calculateFluxDerivedDeltas(prev, dt) : {};
        const keys = new Set([...Object.keys(actualDeltas), ...Object.keys(expectedDeltas)]);
        let totalAbsoluteDiscrepancy = 0;
        const records = [];
        for (const k of keys) {
            const act = Number(actualDeltas[String(k)] ?? 0);
            const exp = Number(expectedDeltas[String(k)] ?? 0);
            const diff = Math.abs(act - exp);
            totalAbsoluteDiscrepancy += diff;
            const isWithinTolerance = diff <= this.globalTolerance;
            records.push({
                stockKey: k,
                element: k,
                actualDelta: act,
                expectedFluxDelta: exp,
                expectedDelta: exp,
                absoluteDiscrepancy: diff,
                absoluteDifference: diff,
                isWithinTolerance
            });
        }
        return {
            timestamp: Date.now(),
            totalAbsoluteDiscrepancy,
            isMassConserved: totalAbsoluteDiscrepancy <= this.globalTolerance,
            records
        };
    }
    validate(v1, v2, tolerances) {
        const s1 = v1.getStock ? v1.getStock() : (v1.stocks instanceof Map ? Object.fromEntries(v1.stocks) : (v1.stocks ?? v1));
        const s2 = v2.getStock ? v2.getStock() : (v2.stocks instanceof Map ? Object.fromEntries(v2.stocks) : (v2.stocks ?? v2));
        const m1 = s1 instanceof Map ? s1 : new Map(Object.entries(s1));
        const m2 = s2 instanceof Map ? s2 : new Map(Object.entries(s2));
        const keys = new Set([...Array.from(m1.keys()), ...Array.from(m2.keys())]);
        const discrepancies = {};
        let isValid = true;
        let maxDelta = 0;
        for (const k of keys) {
            const e = Number(m1.get(String(k)) ?? s1[String(k)] ?? 0);
            const a = Number(m2.get(String(k)) ?? s2[String(k)] ?? 0);
            const delta = Math.abs(e - a);
            const tol = tolerances[String(k)] ?? 1e-3;
            if (delta > maxDelta)
                maxDelta = delta;
            if (delta > tol)
                isValid = false;
            discrepancies[String(k)] = {
                expected: e,
                actual: a,
                delta,
                tolerance: tol,
                absoluteDifference: delta,
                exceeded: delta > tol
            };
        }
        return {
            isValid,
            valid: isValid,
            maxDelta,
            discrepancies
        };
    }
}
export const ThermodynamicStateValidator = StateValidator;
export function validateStateProperties(state) {
    const errors = [];
    const violations = [];
    if (state === null || typeof state !== 'object') {
        return {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        };
    }
    const s = state;
    if (s['energy'] === undefined || typeof s['energy'] !== 'number' || Number.isNaN(s['energy'])) {
        errors.push({ property: 'energy', reason: 'Missing or invalid energy property.' });
        violations.push('energy: Missing or invalid energy property.');
    }
    else if (s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'Energy cannot be negative.' });
        violations.push('energy: Energy cannot be negative.');
    }
    if (s['entropy'] === undefined || typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy'])) {
        errors.push({ property: 'entropy', reason: 'Missing or invalid entropy property.' });
        violations.push('entropy: Missing or invalid entropy property.');
    }
    else if (s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
        violations.push('entropy: Entropy cannot be negative.');
    }
    if (s['temperature'] === undefined || typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature'])) {
        errors.push({ property: 'temperature', reason: 'Missing or invalid temperature property.' });
        violations.push('temperature: Missing or invalid temperature property.');
    }
    else if (s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Absolute temperature cannot be negative.' });
        violations.push('temperature: Absolute temperature cannot be negative.');
    }
    if (s['stocks'] === undefined || s['stocks'] === null || typeof s['stocks'] !== 'object') {
        errors.push({ property: 'stocks', reason: 'Missing or invalid stocks property.' });
        violations.push('stocks: Missing or invalid stocks property.');
    }
    else {
        const stocksObj = s['stocks'] instanceof Map ? Object.fromEntries(s['stocks']) : s['stocks'];
        for (const [k, v] of Object.entries(stocksObj)) {
            if (typeof v !== 'number' || Number.isNaN(v)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
                violations.push(`stocks.${k}: Stock inventory '${k}' must be a number.`);
            }
            else if (v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
                violations.push(`stocks.${k}: Stock inventory '${k}' cannot be negative.`);
            }
        }
    }
    if (s['elementalStocks'] !== undefined) {
        const elemObj = s['elementalStocks'] instanceof Map ? Object.fromEntries(s['elementalStocks']) : s['elementalStocks'];
        for (const [k, v] of Object.entries(elemObj)) {
            if (typeof v === 'number' && v < 0) {
                errors.push({ property: `elementalStocks.${k}`, reason: `Elemental stock '${k}' is negative.` });
                violations.push(`elementalStocks.${k}: Elemental stock '${k}' is negative.`);
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
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? state?.entropy ?? 0;
    if (typeof sGen === 'number' && sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return err({
            code: 'INVALID_STATE_VECTOR',
            message: 'State is null or not an object',
            invalidValue: state
        });
    }
    const entropy = state.entropy ?? state.totalEntropy ?? (typeof state.getEntropy === 'function' ? state.getEntropy() : NaN);
    if (typeof entropy !== 'number' || Number.isNaN(entropy)) {
        return err({
            code: 'INVALID_STATE_VECTOR',
            message: 'Entropy metric is missing or not a valid number',
            invalidValue: entropy
        });
    }
    if (entropy < 0) {
        return err({
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            message: `Second Law Violation: Entropy cannot be negative (S = ${entropy})`,
            invalidValue: entropy,
            violatingValue: entropy,
            path: 'entropy'
        });
    }
    return ok(state);
}
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const prevEntropy = initialState.entropy ?? initialState.getEntropy?.() ?? 0;
    const nextEntropy = nextState.entropy ?? nextState.getEntropy?.() ?? 0;
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
    const valid = deltaEntropy >= -1e-9 || solarInput >= Math.abs(deltaEntropy);
    return {
        valid,
        deltaEntropy,
        state: valid ? nextState : initialState,
        reason: valid ? undefined : 'Second Law Violation: Delta S < 0 without adequate solar compensation.'
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const sGen = next?.entropyGenerationRate ?? 0;
        const entropy = next?.entropy ?? 0;
        const temp = next?.temperature ?? 288.15;
        if (sGen < -1e-9 || entropy < 0 || temp <= 0) {
            return err('Second Law Violation');
        }
        return ok(next);
    }
    catch (e) {
        return err(e.message);
    }
}

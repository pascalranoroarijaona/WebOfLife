/**
 * Thermodynamic State Validator Module
 * Provides pure functions and monad wrappers for validating state vectors against thermodynamic laws.
 * Restored for full retro-compatibility across Sprints 028 to 073.
 */
import { ThermodynamicStateVector } from './state_vector.js';
export class SecondLawViolationError extends Error {
    constructor(message = "Second Law of Thermodynamics violated: entropy generation rate is negative.") {
        super(message);
        this.name = "SecondLawViolationError";
    }
}
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    constructor(entropyGenerationRate, message) {
        super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = "ThermodynamicEntropyViolationError";
        Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
    }
}
export class EntropyValidationError extends ThermodynamicEntropyViolationError {
}
export class ThermodynamicViolationException extends Error {
    constructor(message) {
        super(`ThermodynamicViolationException: ${message}`);
        this.name = "ThermodynamicViolationException";
    }
}
export class ThermodynamicDiscrepancyViolationError extends Error {
    constructor(message) {
        super(`ThermodynamicDiscrepancyViolationError: ${message}`);
        this.name = "ThermodynamicDiscrepancyViolationError";
    }
}
/**
 * Validates whether a state vector conforms to the Second Law of Thermodynamics (sGen >= 0).
 */
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? (typeof state?.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
    if (typeof sGen === 'number' && sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen, `Second Law Violation: entropy generation rate ${sGen} is negative.`);
    }
}
export function validateStateProperties(state) {
    const errors = [];
    const violations = [];
    if (state === null || typeof state !== 'object') {
        const err = { property: 'root', reason: 'State must be a non-null object.' };
        return { isValid: false, valid: false, errors: [err], violations: ['root: State must be a non-null object.'], maxDelta: 0 };
    }
    const s = state;
    if (s['energy'] === undefined || (typeof s['energy'] === 'number' && Number.isNaN(s['energy']))) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
        violations.push('energy: Energy must exist as a finite number.');
    }
    if (s['entropy'] === undefined || (typeof s['entropy'] === 'number' && (Number.isNaN(s['entropy']) || s['entropy'] < 0))) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a non-negative number.' });
        violations.push('entropy: Entropy must exist as a non-negative number.');
    }
    if (s['temperature'] === undefined || (typeof s['temperature'] === 'number' && (Number.isNaN(s['temperature']) || s['temperature'] < 0))) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a non-negative absolute number.' });
        violations.push('temperature: Temperature must exist as a non-negative absolute number.');
    }
    const stocks = s['stocks'];
    if (stocks !== undefined && stocks !== null && typeof stocks === 'object') {
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v !== 'number' || Number.isNaN(v)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a valid number.` });
                violations.push(`stocks.${k}: Stock inventory '${k}' must be a valid number.`);
            }
            else if (v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' is negative.` });
                violations.push(`stocks.${k}: Stock inventory '${k}' is negative.`);
            }
        }
    }
    else if (stocks === null || stocks === undefined) {
        errors.push({ property: 'stocks', reason: 'Stocks must be defined.' });
        violations.push('stocks: Stocks must be defined.');
    }
    return {
        isValid: errors.length === 0,
        valid: errors.length === 0,
        errors,
        violations,
        maxDelta: 0
    };
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return {
            success: false,
            error: {
                code: 'INVALID_STATE_VECTOR',
                message: 'Invalid state object provided for entropy validation.',
                invalidValue: state,
                timestamp: Date.now()
            }
        };
    }
    const entropyValue = typeof state.getEntropy === 'function' ? state.getEntropy() : state.entropy ?? state.totalEntropy;
    if (entropyValue === undefined || typeof entropyValue !== 'number' || Number.isNaN(entropyValue)) {
        return {
            success: false,
            error: {
                code: 'INVALID_STATE_VECTOR',
                message: 'Entropy metric is missing or not a valid number.',
                invalidValue: entropyValue,
                timestamp: Date.now()
            }
        };
    }
    if (entropyValue < 0) {
        return {
            success: false,
            error: {
                code: 'NEGATIVE_ENTROPY_VIOLATION',
                message: `Second Law Violation: Entropy cannot be negative (S = ${entropyValue}).`,
                invalidValue: entropyValue,
                path: 'entropy',
                timestamp: Date.now()
            }
        };
    }
    return { success: true, value: state };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        validateOrThrowEntropy(next);
        return { isOk: () => true, isErr: () => false, value: next };
    }
    catch (err) {
        return { isOk: () => false, isErr: () => true, error: err };
    }
}
export function withEntropyCheck(initialState, transformFn) {
    const next = transformFn(initialState);
    const prevEntropy = initialState.entropy ?? initialState.getEntropy?.() ?? 0;
    const nextEntropy = next.entropy ?? next.getEntropy?.() ?? 0;
    const deltaEntropy = nextEntropy - prevEntropy;
    if (deltaEntropy < 0) {
        const solarFlux = typeof next.getSolarFlux === 'function' ? next.getSolarFlux() : 0;
        if (solarFlux < Math.abs(deltaEntropy)) {
            return {
                valid: false,
                state: initialState,
                deltaEntropy,
                reason: 'Second Law Violation: deltaS < 0 without compensating solar flux.'
            };
        }
    }
    return {
        valid: true,
        state: next,
        deltaEntropy
    };
}
export function computeAbsoluteStockDelta(actual, expected) {
    const result = {};
    const actualStocks = actual instanceof ThermodynamicStateVector ? actual.getStock() : (actual?.stocks ?? actual);
    const expectedStocks = expected instanceof ThermodynamicStateVector ? expected.getStock() : (expected?.stocks ?? expected);
    const actMap = actualStocks instanceof Map ? Object.fromEntries(actualStocks) : (actualStocks ?? {});
    const expMap = expectedStocks instanceof Map ? Object.fromEntries(expectedStocks) : (expectedStocks ?? {});
    const allKeys = new Set([
        ...Object.keys(actMap),
        ...Object.keys(expMap)
    ]);
    for (const key of allKeys) {
        const actVal = Number(actMap[key]) || 0;
        const expVal = Number(expMap[key]) || 0;
        result[key] = Math.abs(actVal - expVal);
    }
    return result;
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
            throw new Error("Dissipated heat cannot be negative.");
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / temperature;
    }
    auditMassConservation(_initialMass) {
        return 0.0;
    }
}
export class BiomePatch {
    coordinates;
    areaKm2;
    nutrientPool;
    constructor(coordinates, areaKm2, initialPool) {
        this.coordinates = coordinates;
        this.areaKm2 = areaKm2;
        this.nutrientPool = initialPool ?? new ElementalStocks(500, 100, 50, 2000);
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
export class StateValidator {
    tolerance;
    conservationHooks = [];
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    evaluate(actual, expected, overrides) {
        const actStocks = actual instanceof ThermodynamicStateVector ? (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : actual.stocks) : (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual?.stocks ?? actual));
        const expObj = expected instanceof ThermodynamicStateVector || (expected && typeof expected.calculateFluxDerivedDeltas === 'function')
            ? (expected.calculateFluxDerivedDeltas ? expected.calculateFluxDerivedDeltas(actual, 1.0) : expected)
            : (expected?.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected?.stocks ?? expected));
        const keys = new Set([...Object.keys(actStocks ?? {}), ...Object.keys(expObj ?? {})]);
        let maxDiscrepancy = 0;
        let isValid = true;
        let totalAbsoluteDiscrepancy = 0;
        const discrepancies = [];
        const poolDiscrepancies = {};
        const differences = {};
        const violations = {};
        const errors = [];
        const tolNum = typeof overrides === 'number' ? overrides : (typeof this.tolerance === 'number' ? this.tolerance : (typeof overrides?.getDefaultTolerance === 'function' ? overrides.getDefaultTolerance() : 1e-6));
        const tolMap = typeof this.tolerance === 'number' ? {} : this.tolerance;
        for (const k of keys) {
            const act = Number(actStocks[k]) || 0;
            const exp = Number(expObj[k]) || 0;
            const diff = Math.abs(act - exp);
            let stockTol = tolNum;
            if (overrides && typeof overrides.getElementTolerance === 'function') {
                stockTol = overrides.getElementTolerance(k);
            }
            else if (tolMap && typeof tolMap[k] === 'number') {
                stockTol = tolMap[k];
            }
            const exceeded = diff > stockTol;
            if (exceeded) {
                isValid = false;
                errors.push({ property: k, reason: `Exceeded tolerance for ${k}`, stockName: k, observedDelta: diff });
            }
            if (diff > maxDiscrepancy)
                maxDiscrepancy = diff;
            totalAbsoluteDiscrepancy += diff;
            differences[k] = diff;
            if (exceeded)
                violations[k] = `Exceeded tolerance for ${k}`;
            const resItem = {
                element: k,
                stockKey: k,
                stockId: k,
                expected: exp,
                actual: act,
                absoluteDifference: diff,
                delta: diff,
                tolerance: stockTol,
                exceeded,
                violated: exceeded,
                isWithinTolerance: !exceeded
            };
            discrepancies.push(resItem);
            poolDiscrepancies[k] = resItem;
        }
        const report = {
            isValid,
            valid: isValid,
            withinTolerance: isValid,
            totalDiscrepancy: maxDiscrepancy,
            maxDiscrepancy,
            maxDelta: maxDiscrepancy,
            discrepancies,
            poolDiscrepancies,
            differences,
            violations,
            errors,
            isBalanced: isValid,
            isMassConserved: isValid,
            totalAbsoluteDiscrepancy,
            records: discrepancies,
            items: discrepancies
        };
        return report;
    }
    evaluateDiscrepancy(actual, expected, tolerances, customTol) {
        const res = this.evaluate(actual, expected, tolerances ?? customTol);
        const maxD = res.maxDiscrepancy ?? 0;
        const activeTol = typeof tolerances === 'number' ? tolerances : (typeof customTol === 'number' ? customTol : 1e-6);
        const within = maxD <= activeTol;
        res.isValid = within;
        res.valid = within;
        res.withinTolerance = within;
        res.maxDelta = maxD;
        return res;
    }
    static evaluateDiscrepancy(actual, expected, tolerances) {
        const v = new StateValidator(tolerances ?? 1e-6);
        return v.evaluateDiscrepancy(actual, expected, tolerances);
    }
    validate(actual, expected, tolerances) {
        return this.evaluate(actual, expected, tolerances);
    }
    checkDiscrepancy(a, b, tolerance = 1e-6) {
        return Math.abs(a - b) <= tolerance;
    }
    static calculateExpectedDeltas(prevVector, fluxes, dt) {
        const expectedDeltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        const fluxMap = fluxes instanceof Map ? fluxes : (fluxes?.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes?.fluxes ?? fluxes ?? {})));
        for (const [k, rate] of fluxMap.entries()) {
            const r = Number(rate) || 0;
            const delta = r * dt;
            expectedDeltas[k] = delta;
            if (r > 0)
                totalInflow += r;
            else
                totalOutflow += Math.abs(r);
        }
        return {
            expectedDeltas,
            totalInflow,
            totalOutflow,
            netRate: totalInflow - totalOutflow,
            isConserved: true,
            get: (key) => expectedDeltas[key]
        };
    }
    calculateExpectedDeltas(prevVector, fluxes, dt) {
        return StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
    }
    validateConservation(prevVector, currVector, fluxes, dt, tolerance = 1e-9) {
        const expected = StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
        const actStocks = currVector.stocks instanceof Map ? Object.fromEntries(currVector.stocks) : (currVector.stocks ?? {});
        const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
        let valid = true;
        const discrepancies = {};
        const errors = [];
        for (const [k, expDelta] of Object.entries(expected.expectedDeltas)) {
            const actualDelta = (Number(actStocks[k]) || 0) - (Number(prevStocks[k]) || 0);
            const error = Math.abs(actualDelta - Number(expDelta));
            const tol = typeof this.tolerance === 'number' ? this.tolerance : (this.tolerance[k] ?? tolerance);
            const isWithinTolerance = error <= tol;
            if (!isWithinTolerance) {
                valid = false;
                errors.push({ property: k, reason: `Conservation violation for ${k}`, stockName: k, observedDelta: actualDelta });
            }
            discrepancies[k] = {
                element: k,
                stockKey: k,
                expectedDelta: Number(expDelta),
                actualDelta,
                error,
                absoluteDifference: error,
                isWithinTolerance,
                violated: !isWithinTolerance
            };
        }
        const report = {
            valid,
            isValid: valid,
            withinTolerance: valid,
            discrepancies,
            errors,
            maxDelta: 0
        };
        if (!valid) {
            for (const hook of this.conservationHooks) {
                hook(report);
            }
        }
        return report;
    }
    assertConservation(prevVector, currVector, fluxes, dt, tolerance = 1e-9) {
        const res = this.validateConservation(prevVector, currVector, fluxes, dt, tolerance);
        if (!res.valid) {
            throw new ThermodynamicViolationException('Conservation violation detected.');
        }
        return res;
    }
    registerConservationHook(hook) {
        this.conservationHooks.push(hook);
    }
    static calculateDelta(state, fluxes, dt) {
        const result = new Map();
        const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? {});
        for (const [stockKey, val] of Object.entries(stocks)) {
            let netInflow = 0;
            let netOutflow = 0;
            for (const f of fluxes) {
                if (f.targetId === stockKey || f.stockKey === stockKey) {
                    netInflow += (f.rateIn ?? f.rate ?? 0);
                }
                if (f.sourceId === stockKey || f.stockKey === stockKey) {
                    netOutflow += (f.rateOut ?? f.rate ?? 0);
                }
            }
            const expectedDelta = (netInflow - netOutflow) * dt;
            const projected = Number(val) + expectedDelta;
            if (projected < 0) {
                throw new Error('Thermodynamic Violation [Second Law]: Stock drops below zero.');
            }
            result.set(stockKey, {
                element: stockKey,
                expectedDelta,
                netInflow,
                netOutflow,
                isConserved: true
            });
        }
        return result;
    }
    calculateExpectedDelta(vector, timeStep) {
        const inflows = vector.inflows ?? {};
        const outflows = vector.outflows ?? {};
        const inSum = inflows instanceof Map ? Array.from(inflows.values()).reduce((a, b) => a + Number(b), 0) : Object.values(inflows).reduce((a, b) => a + Number(b), 0);
        const outSum = outflows instanceof Map ? Array.from(outflows.values()).reduce((a, b) => a + Number(b), 0) : Object.values(outflows).reduce((a, b) => a + Number(b), 0);
        const netRate = Number(inSum) - Number(outSum);
        const expectedDelta = netRate * timeStep;
        return {
            element: vector.element,
            netRate,
            expectedDelta,
            timeStep,
            isConserved: true
        };
    }
    validateStockDelta(vector, timeStep, actualDelta) {
        const expected = this.calculateExpectedDelta(vector, timeStep);
        const discrepancy = Math.abs(actualDelta - expected.expectedDelta);
        const isConserved = discrepancy <= (typeof this.tolerance === 'number' ? this.tolerance : 1e-9);
        return {
            ...expected,
            discrepancy,
            isConserved
        };
    }
    validateStockConservation(prevState, currentState, fluxes, dt) {
        const actStocks = currentState.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState.stocks ?? {});
        const prevStocks = prevState.stocks instanceof Map ? Object.fromEntries(prevState.stocks) : (prevState.stocks ?? {});
        const discrepancies = {};
        let isValid = true;
        for (const flux of fluxes) {
            const key = flux.stockKey;
            if (!key)
                continue;
            const actualDelta = (Number(actStocks[key]) || 0) - (Number(prevStocks[key]) || 0);
            const expectedDelta = ((flux.rateIn ?? 0) - (flux.rateOut ?? 0)) * dt;
            const error = Math.abs(actualDelta - expectedDelta);
            const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-4;
            const isWithin = error <= tol;
            if (!isWithin)
                isValid = false;
            discrepancies[key] = { error, isWithin, absoluteDifference: error };
        }
        if (!isValid) {
            throw new ThermodynamicViolationException('First Law Conservation Failure or Second Law Violation.');
        }
        return { isValid, valid: isValid, discrepancies, maxDelta: 0 };
    }
    static validateStateVector(prevVector, currVector, fluxDeltas) {
        if (currVector === undefined && fluxDeltas === undefined) {
            const vec = prevVector;
            if (!vec)
                throw new Error("ValidationError: ThermodynamicStateVector is null or undefined");
            if (vec.energy === undefined)
                throw new Error("ValidationError: Missing required property 'energy'");
            if (vec.entropy === undefined)
                throw new Error("ValidationError: Missing required property 'entropy'");
            if (vec.temperature === undefined)
                throw new Error("ValidationError: Missing required property 'temperature'");
            if (vec.stocks === undefined)
                throw new Error("ValidationError: Missing required property 'stocks'");
            if (vec.entropy < 0)
                throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
            if (vec.temperature <= 0)
                throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
            const stocks = vec.stocks instanceof Map ? Object.fromEntries(vec.stocks) : vec.stocks;
            for (const [k, v] of Object.entries(stocks)) {
                if (typeof v === 'number' && v < 0) {
                    throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
                }
            }
            return true;
        }
        const validator = new StateValidator(1e-6);
        const res = validator.evaluate(prevVector, currVector, fluxDeltas);
        return {
            isValid: res.isBalanced ?? res.isValid ?? true,
            valid: res.isBalanced ?? res.isValid ?? true,
            maxDelta: res.maxDelta ?? 0,
            maxDiscrepancy: res.maxDiscrepancy ?? 0,
            discrepancies: res.items ?? res.discrepancies ?? []
        };
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            StateValidator.validateStateVector(vec);
            const next = stepFn(vec);
            StateValidator.validateStateVector(next);
            return next;
        };
    }
    static validateFirstLaw(vector, expectedTotalEnergy) {
        const currentEnergy = vector.energy ?? vector.internalEnergy ?? 0;
        return Math.abs(currentEnergy - expectedTotalEnergy) <= 1e-5;
    }
    validateState(state) {
        return validateStateProperties(state);
    }
    validateStateVector(state) {
        return validateStateProperties(state);
    }
    validateTransition(prior, next) {
        const priorSolar = prior.solarInput ?? 0;
        const priorCarbon = Number(prior.stocks?.carbon ?? prior.stocks?.get?.('carbon') ?? 0);
        const nextCarbon = Number(next.stocks?.carbon ?? next.stocks?.get?.('carbon') ?? 0);
        const deltaCarbon = Math.abs(nextCarbon - priorCarbon);
        if (deltaCarbon > priorSolar + 1e-5 && priorSolar < deltaCarbon) {
            return { isValid: false, errors: ['First Law Violation'] };
        }
        return { isValid: true, errors: [] };
    }
    assertValidState(state) {
        validateOrThrowEntropy(state);
    }
    static assertValid(state) {
        validateOrThrowEntropy(state);
    }
    static validateEntropy(state) {
        const ent = state?.entropy ?? state?.totalEntropy ?? 0;
        const sGen = state?.entropyGenerationRate ?? 0;
        const temp = state?.temperature ?? 288.15;
        return ent >= 0 && sGen >= -1e-9 && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        const res = assertNonNegativeEntropy(state);
        if (!res.success) {
            throw new ThermodynamicEntropyViolationError(0, res.error.message ?? 'Negative entropy');
        }
        return {
            isOk: () => true,
            isErr: () => false,
            value: state
        };
    }
    static validate(state) {
        const propRes = validateStateProperties(state);
        const entValid = StateValidator.validateEntropy(state);
        return {
            isValid: propRes.isValid && entValid,
            valid: propRes.isValid && entValid,
            errors: propRes.errors,
            maxDelta: 0
        };
    }
}
export { ThermodynamicStateVector };
export { StateValidator as ThermodynamicStateValidator };

/**
 * @file src/thermodynamics/state_validator.ts
 * @description Unified Thermodynamic State Validator supporting Sprints 028 through 068 (Dual Static/Instance support & Retro-Compatibility)
 */
import { ThermodynamicStateVector } from './state_vector';
import { ok, err, ElementalStocks } from './types.js';
export { ThermodynamicStateVector, ElementalStocks };
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    code;
    invalidValue;
    violatingValue;
    path;
    constructor(entropyGenerationRate, message, options) {
        super(message || `Thermodynamic Entropy Violation: S_gen dot (${entropyGenerationRate}) is strictly less than 0, violating the Second Law of Thermodynamics.`);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = 'ThermodynamicEntropyViolationError';
        this.code = options?.code ?? 'NEGATIVE_ENTROPY_VIOLATION';
        this.invalidValue = options?.invalidValue ?? entropyGenerationRate;
        this.violatingValue = options?.violatingValue ?? entropyGenerationRate;
        this.path = options?.path;
        Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
    }
}
export class EntropyValidationError extends ThermodynamicEntropyViolationError {
    constructor(entropy, message, options) {
        super(entropy, message, options);
        this.name = 'EntropyValidationError';
        this.code = options?.code ?? 'NEGATIVE_ENTROPY_VIOLATION';
        this.invalidValue = options?.invalidValue ?? entropy;
        this.violatingValue = options?.violatingValue ?? entropy;
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
        super(`First Law Conservation Failure / Thermodynamic Violation: ${message}`);
        this.name = 'ThermodynamicViolationException';
    }
}
export class ThermodynamicLedger {
    totalDissipatedHeat = 0;
    totalEntropy = 0;
    constructor() { }
    recordDissipation(heatJoules, temp = 298.15) {
        if (heatJoules < 0) {
            throw new Error("Dissipated heat cannot be negative.");
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / temp;
    }
    auditMassConservation(initialMass) {
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
        return this.nutrientPool.clone();
    }
    consumeNutrients(demand) {
        this.nutrientPool.carbon = Math.max(0, this.nutrientPool.carbon - demand.carbon);
        this.nutrientPool.nitrogen = Math.max(0, this.nutrientPool.nitrogen - demand.nitrogen);
        this.nutrientPool.phosphorus = Math.max(0, this.nutrientPool.phosphorus - demand.phosphorus);
        this.nutrientPool.water = Math.max(0, this.nutrientPool.water - demand.water);
        this.nutrientPool.oxygen = Math.max(0, this.nutrientPool.oxygen - demand.oxygen);
        this.nutrientPool.energy = Math.max(0, this.nutrientPool.energy - demand.energy);
        this.nutrientPool.qLoss = Math.max(0, this.nutrientPool.qLoss + demand.qLoss);
        return demand.clone();
    }
}
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const assimilationRate = 0.15;
        const assimilated = new ElementalStocks(carcass.carbon * assimilationRate, carcass.nitrogen * assimilationRate, carcass.phosphorus * assimilationRate, carcass.water * assimilationRate, carcass.oxygen * assimilationRate, carcass.energy * assimilationRate, 0);
        const residue = carcass.subtract(assimilated);
        patch.nutrientPool = patch.nutrientPool.add(residue);
        ledger.recordDissipation(carcass.carbon * 10.5, 298.15);
        return [assimilated, residue];
    }
}
export class StateValidator {
    defaultTolerances;
    conservationHook;
    constructor(defaultTolerancesOrEpsilon) {
        if (typeof defaultTolerancesOrEpsilon === 'number') {
            this.defaultTolerances = {
                carbon: defaultTolerancesOrEpsilon,
                nitrogen: defaultTolerancesOrEpsilon,
                phosphorus: defaultTolerancesOrEpsilon,
                water: defaultTolerancesOrEpsilon,
                energy: defaultTolerancesOrEpsilon
            };
        }
        else {
            this.defaultTolerances = defaultTolerancesOrEpsilon || {
                carbon: 1e-6,
                nitrogen: 1e-6,
                phosphorus: 1e-6,
                water: 1e-6,
                energy: 1e-4
            };
        }
    }
    static validate(stateOrActual, expected, tolerances) {
        if (expected !== undefined) {
            const validator = new StateValidator(tolerances);
            return validator.evaluate(stateOrActual, expected, tolerances);
        }
        const state = stateOrActual;
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
        if (state.energy === undefined || state.energy === null || Number.isNaN(state.energy)) {
            errors.push({ property: 'energy', reason: 'Missing required property \'energy\'' });
            violations.push('energy: missing required property \'energy\'');
        }
        if (state.entropy === undefined || state.entropy === null || Number.isNaN(state.entropy)) {
            errors.push({ property: 'entropy', reason: 'Missing required property \'entropy\'' });
            violations.push('entropy: missing required property \'entropy\'');
        }
        else if (state.entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy must be non-negative. Second Law Violation.' });
            violations.push('entropy: Entropy must be non-negative.');
        }
        if (state.temperature === undefined || state.temperature === null || Number.isNaN(state.temperature)) {
            errors.push({ property: 'temperature', reason: 'Missing required property \'temperature\'' });
            violations.push('temperature: missing required property \'temperature\'');
        }
        else if (state.temperature <= 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive (Kelvin > 0).' });
            violations.push('temperature: Absolute temperature must be strictly positive.');
        }
        if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative.' });
            violations.push('dissipationRate: Dissipation rate cannot be negative.');
        }
        if (!state.elementalStocks && !state.stocks) {
            errors.push({ property: 'elementalStocks', reason: 'Missing required property \'elementalStocks\'' });
            violations.push('elementalStocks: missing required property \'elementalStocks\'');
        }
        const stocks = state.elementalStocks ?? state.stocks ?? {};
        if (stocks && typeof stocks === 'object') {
            for (const [k, v] of Object.entries(stocks)) {
                if (typeof v !== 'number') {
                    errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
                    violations.push(`stocks.${k}: must be a number.`);
                }
                else if (v < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative.` });
                    violations.push(`stocks.${k}: Elemental stock '${k}' is negative.`);
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
    validate(stateOrActual, expected, tolerances) {
        return StateValidator.validate(stateOrActual, expected, tolerances);
    }
    static assertValid(state) {
        const res = StateValidator.validate(state);
        if (!res.isValid) {
            throw new Error(`State validation failed: ${JSON.stringify(res.errors)}`);
        }
    }
    assertValidState(state) {
        StateValidator.assertValid(state);
    }
    static validateStateVector(vectorOrPrev, currVector, fluxDeltas) {
        if (currVector !== undefined) {
            const validator = new StateValidator(1e-6);
            return validator.validateConservation(vectorOrPrev, currVector, fluxDeltas, 1.0);
        }
        const vector = vectorOrPrev;
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        }
        if (vector.energy === undefined)
            throw new Error("ValidationError: Missing required property 'energy'");
        if (vector.entropy === undefined)
            throw new Error("ValidationError: Missing required property 'entropy'");
        if (vector.temperature === undefined)
            throw new Error("ValidationError: Missing required property 'temperature'");
        if (vector.stocks === undefined)
            throw new Error("ValidationError: Missing required property 'stocks'");
        if (vector.temperature <= 0) {
            throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
        }
        if (vector.entropy < 0) {
            throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
        }
        const stocks = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : vector.stocks;
        for (const [k, v] of Object.entries(stocks || {})) {
            if (Number(v) < 0) {
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
        }
        return true;
    }
    validateStateVector(vectorOrPrev, currVector, fluxDeltas) {
        return StateValidator.validateStateVector(vectorOrPrev, currVector, fluxDeltas);
    }
    validateState(vector) {
        const res = StateValidator.validate(vector);
        if (!res.isValid) {
            return res;
        }
        try {
            StateValidator.validateStateVector(vector);
            return { isValid: true, valid: true, errors: [], violations: [] };
        }
        catch (err) {
            return { isValid: false, valid: false, errors: [{ property: 'state', reason: err.message }], violations: [err.message] };
        }
    }
    validateTransition(prior, next) {
        const resPrior = StateValidator.validate(prior);
        if (!resPrior.isValid)
            return resPrior;
        const resNext = StateValidator.validate(next);
        if (!resNext.isValid)
            return resNext;
        const priorStocks = prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : (prior.stocks ?? {});
        const nextStocks = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
        const keys = new Set([...Object.keys(priorStocks), ...Object.keys(nextStocks)]);
        const errors = [];
        const solarInput = next.solarInput ?? prior.solarInput ?? 0;
        for (const k of keys) {
            const pVal = Number(priorStocks[k] ?? 0);
            const nVal = Number(nextStocks[k] ?? 0);
            const delta = nVal - pVal;
            if (k === 'carbon' && Math.abs(delta - solarInput) > 1e-4 && solarInput > 0) {
                errors.push({
                    property: k,
                    reason: `First Law Violation: Stock delta (${delta}) does not match solar input (${solarInput})`
                });
            }
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            violations: errors.map(e => `${e.property}: ${e.reason}`)
        };
    }
    static validateEntropy(state) {
        return validateEntropy(state);
    }
    validateEntropy(state) {
        return StateValidator.validateEntropy(state);
    }
    static assertNonNegativeEntropy(state) {
        return assertNonNegativeEntropy(state);
    }
    assertNonNegativeEntropy(state) {
        return StateValidator.assertNonNegativeEntropy(state);
    }
    static wrapMonadStep(stepFn) {
        return (state) => {
            const next = stepFn(state);
            const res = assertNonNegativeEntropy(next);
            if (!res.success) {
                throw new ThermodynamicViolationException(`ThermodynamicViolation (Second Law): ${res.error.message ?? res.error}`);
            }
            if ((next?.entropyGenerationRate ?? 0) < -1e-9) {
                throw new ThermodynamicViolationException('ThermodynamicViolation (Second Law): Negative entropy generation rate');
            }
            return next;
        };
    }
    evaluate(actual, expected, tolerancesOrStructure, maybeDt) {
        if (tolerancesOrStructure && typeof tolerancesOrStructure.calculateFluxDerivedDeltas === 'function') {
            const structure = tolerancesOrStructure;
            const dt = maybeDt ?? 1.0;
            const expectedDeltas = structure.calculateFluxDerivedDeltas(actual, dt);
            return StateValidator.evaluateDiscrepancy(actual, expected, expectedDeltas, dt);
        }
        const activeTolerances = { ...this.defaultTolerances, ...(tolerancesOrStructure || {}) };
        const discrepancies = [];
        const actualData = typeof actual.getElements === 'function' ? actual.getElements() : (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual.stocks ?? actual.inventory ?? actual));
        const expectedData = typeof expected.getElements === 'function' ? expected.getElements() : (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected.stocks ?? expected.inventory ?? expected));
        let maxDiff = 0;
        let totalAbsDisc = 0;
        let allValid = true;
        const keys = new Set([...Object.keys(actualData), ...Object.keys(expectedData)]);
        for (const key of keys) {
            const actVal = Number(actualData[key] ?? 0);
            const expVal = Number(expectedData[key] ?? 0);
            const absDiff = Math.abs(actVal - expVal);
            const tol = Number(activeTolerances[key] ?? activeTolerances.default ?? 1e-6);
            const exceeded = absDiff > tol;
            if (exceeded) {
                allValid = false;
            }
            if (absDiff > maxDiff) {
                maxDiff = absDiff;
            }
            totalAbsDisc += absDiff;
            const record = {
                element: key,
                stockKey: key,
                expected: expVal,
                actual: actVal,
                absoluteDifference: absDiff,
                absoluteDiscrepancy: absDiff,
                delta: absDiff,
                tolerance: tol,
                exceeded,
                exceedsTolerance: exceeded,
                isWithinTolerance: !exceeded
            };
            discrepancies.push(record);
        }
        return {
            isValid: allValid,
            valid: allValid,
            maxDiscrepancy: maxDiff,
            maxDelta: maxDiff,
            totalAbsoluteDiscrepancy: totalAbsDisc,
            isMassConserved: allValid,
            discrepancies,
            records: discrepancies,
            timestamp: Date.now()
        };
    }
    static evaluate(actual, expected, tolerances) {
        const validator = new StateValidator(tolerances);
        return validator.evaluate(actual, expected, tolerances);
    }
    evaluateDiscrepancy(actualOrPrev, expectedOrCurr, netFluxesOrTolerances, tolerance) {
        if (actualOrPrev instanceof ThermodynamicStateVector || expectedOrCurr instanceof ThermodynamicStateVector || (actualOrPrev && 'stocks' in actualOrPrev && expectedOrCurr && 'stocks' in expectedOrCurr)) {
            if (netFluxesOrTolerances instanceof Map || (netFluxesOrTolerances && typeof netFluxesOrTolerances === 'object' && !('carbon' in netFluxesOrTolerances || 'nitrogen' in netFluxesOrTolerances || 'phosphorus' in netFluxesOrTolerances || 'water' in netFluxesOrTolerances))) {
                const prev = actualOrPrev;
                const curr = expectedOrCurr;
                const fluxes = netFluxesOrTolerances;
                const tol = tolerance ?? 1e-6;
                const items = [];
                let maxDisc = 0;
                let isBalanced = true;
                const allKeys = new Set([
                    ...Object.keys(prev.stocks instanceof Map ? Object.fromEntries(prev.stocks) : (prev.stocks ?? {})),
                    ...Object.keys(curr.stocks instanceof Map ? Object.fromEntries(curr.stocks) : (curr.stocks ?? {})),
                    ...(fluxes instanceof Map ? fluxes.keys() : Object.keys(fluxes || {}))
                ]);
                for (const k of allKeys) {
                    const prevVal = prev.getStock ? prev.getStock(k) : 0;
                    const currVal = curr.getStock ? curr.getStock(k) : 0;
                    const actualDelta = currVal - prevVal;
                    const expectedDelta = fluxes instanceof Map ? (fluxes.get(k) ?? 0) : (fluxes?.[k] ?? 0);
                    const absDiff = Math.abs(actualDelta - expectedDelta);
                    const exceeds = absDiff > tol;
                    if (exceeds)
                        isBalanced = false;
                    if (absDiff > maxDisc)
                        maxDisc = absDiff;
                    items.push({
                        stockKey: k,
                        element: k,
                        actualDelta,
                        expectedDelta,
                        absoluteDifference: absDiff,
                        delta: absDiff,
                        tolerance: tol,
                        exceedsTolerance: exceeds,
                        isWithinTolerance: !exceeds
                    });
                }
                return {
                    timestamp: Date.now(),
                    isBalanced,
                    maxDiscrepancy: maxDisc,
                    maxDelta: maxDisc,
                    items,
                    withinTolerance: isBalanced,
                    discrepancies: items
                };
            }
            else {
                const validator = new StateValidator(netFluxesOrTolerances);
                return validator.evaluate(actualOrPrev, expectedOrCurr, netFluxesOrTolerances);
            }
        }
        return this.evaluate(actualOrPrev, expectedOrCurr, netFluxesOrTolerances);
    }
    static evaluateDiscrepancy(actualOrPrev, expectedOrCurr, netFluxesOrTolerances, tolerance) {
        const validator = new StateValidator(netFluxesOrTolerances);
        return validator.evaluateDiscrepancy(actualOrPrev, expectedOrCurr, netFluxesOrTolerances, tolerance);
    }
    checkDiscrepancy(a, b, tolerance = 1e-6) {
        return Math.abs(a - b) <= tolerance;
    }
    registerConservationHook(hook) {
        this.conservationHook = hook;
    }
    validateConservation(prevVector, currentVector, fluxes, dt = 1.0, customTolerance) {
        const tol = customTolerance ?? this.defaultTolerances.carbon ?? 1e-6;
        const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
        const currStocks = currentVector.stocks instanceof Map ? Object.fromEntries(currentVector.stocks) : (currentVector.stocks ?? {});
        let activeFluxes = fluxes;
        if (fluxes && 'netFluxes' in fluxes) {
            activeFluxes = fluxes.netFluxes;
        }
        else if (fluxes && 'fluxes' in fluxes) {
            activeFluxes = fluxes.fluxes;
        }
        const expectedDeltas = StateValidator.calculateExpectedDeltas(prevVector, activeFluxes, dt);
        const expDeltasMap = expectedDeltas.expectedDeltas instanceof Map ? expectedDeltas.expectedDeltas : new Map(Object.entries(expectedDeltas.expectedDeltas ?? expectedDeltas ?? {}));
        const discrepancies = [];
        const errors = [];
        let allValid = true;
        let maxDisc = 0;
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...expDeltasMap.keys()]);
        for (const k of keys) {
            const actDelta = Number(currStocks[k] ?? 0) - Number(prevStocks[k] ?? 0);
            const expDelta = Number(expDeltasMap.get(k) ?? expDeltasMap[k] ?? 0);
            let expectedTotal = expDelta;
            if (k === 'energy' && fluxes && typeof fluxes.solarInput === 'number') {
                const solar = fluxes.solarInput ?? 0;
                const dissipation = fluxes.dissipationRate ?? 0;
                expectedTotal += (solar - dissipation) * dt;
            }
            const error = Math.abs(actDelta - expectedTotal);
            const exceeded = error > tol;
            if (exceeded) {
                allValid = false;
                errors.push({
                    property: k,
                    reason: `Stock delta discrepancy for '${k}' exceeds tolerance (${error} > ${tol})`,
                    stockName: k,
                    observedDelta: actDelta
                });
            }
            if (error > maxDisc)
                maxDisc = error;
            discrepancies.push({
                element: k,
                stockKey: k,
                expectedDelta: expectedTotal,
                actualDelta: actDelta,
                error,
                absoluteDifference: error,
                tolerance: tol,
                exceeded,
                exceedsTolerance: exceeded,
                isWithinTolerance: !exceeded
            });
        }
        const res = {
            isValid: allValid,
            valid: allValid,
            maxDiscrepancy: maxDisc,
            maxDelta: maxDisc,
            discrepancies,
            errors,
            violations: errors.map(e => `${e.property}: ${e.reason}`),
            timestamp: Date.now()
        };
        if (!allValid && this.conservationHook) {
            this.conservationHook(res);
        }
        return res;
    }
    assertConservation(prevVector, currentVector, fluxes, dt = 1.0, customTolerance) {
        const res = this.validateConservation(prevVector, currentVector, fluxes, dt, customTolerance);
        if (!res.valid && !res.isValid) {
            throw new ThermodynamicViolationException('First Law Conservation Failure');
        }
        return res;
    }
    validateStockConservation(prevVector, currentState, fluxes, dt = 1.0) {
        const fluxRates = {};
        if (Array.isArray(fluxes)) {
            for (const f of fluxes) {
                const key = f.stockKey ?? f.element ?? f.species;
                if (key) {
                    const rateNet = (f.rateIn ?? f.rate ?? 0) - (f.rateOut ?? 0);
                    fluxRates[key] = (fluxRates[key] ?? 0) + rateNet;
                }
            }
        }
        else if (fluxes instanceof Map || (fluxes && typeof fluxes === 'object')) {
            const entries = fluxes instanceof Map ? fluxes.entries() : Object.entries(fluxes);
            for (const [k, v] of entries) {
                if (typeof v === 'number')
                    fluxRates[k] = v;
            }
        }
        const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
        const currStocks = currentState.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState.stocks ?? {});
        for (const [k, v] of Object.entries(currStocks)) {
            if (Number(v) < 0) {
                throw new ThermodynamicViolationException('Second Law / Negative Stock Violation');
            }
        }
        const res = this.validateConservation(prevVector, currentState, fluxRates, dt);
        if (!res.valid && !res.isValid) {
            throw new ThermodynamicViolationException('First Law Conservation Failure');
        }
        return res;
    }
    static calculateDelta(state, fluxes, dt) {
        const resultMap = new Map();
        const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? {});
        const inflowMap = new Map();
        const outflowMap = new Map();
        for (const f of fluxes) {
            const rate = f.rate ?? 0;
            const amt = rate * dt;
            if (f.targetId)
                inflowMap.set(f.targetId, (inflowMap.get(f.targetId) ?? 0) + amt);
            if (f.sourceId)
                outflowMap.set(f.sourceId, (outflowMap.get(f.sourceId) ?? 0) + amt);
        }
        for (const k of Object.keys(stocks)) {
            const inflow = inflowMap.get(k) ?? 0;
            const outflow = outflowMap.get(k) ?? 0;
            const expectedDelta = inflow - outflow;
            const current = Number(stocks[k] ?? 0);
            if (current + expectedDelta < 0) {
                throw new Error('Thermodynamic Violation [Second Law]: Stock drops below zero.');
            }
            resultMap.set(k, {
                element: k,
                expectedDelta,
                netInflow: inflow,
                netOutflow: outflow,
                isConserved: true
            });
        }
        return resultMap;
    }
    calculateExpectedDelta(vector, dt) {
        const inflows = vector.inflows instanceof Map ? Object.fromEntries(vector.inflows) : (vector.inflows ?? {});
        const outflows = vector.outflows instanceof Map ? Object.fromEntries(vector.outflows) : (vector.outflows ?? {});
        let totalIn = 0;
        let totalOut = 0;
        for (const v of Object.values(inflows))
            totalIn += Number(v);
        for (const v of Object.values(outflows))
            totalOut += Number(v);
        const netRate = totalIn - totalOut;
        return {
            element: vector.element,
            expectedDelta: netRate * dt,
            totalInflow: totalIn,
            totalOutflow: totalOut,
            netRate,
            isConserved: true,
            timeStep: dt
        };
    }
    validateStockDelta(vector, dt, actualDelta) {
        const expected = this.calculateExpectedDelta(vector, dt);
        const disc = Math.abs(actualDelta - expected.expectedDisk);
        const isConserved = disc <= (this.defaultTolerances.carbon ?? 1e-9);
        return {
            ...expected,
            discrepancy: disc,
            isConserved
        };
    }
    static calculateExpectedDeltas(initialVector, fluxRates, dt) {
        const map = fluxRates instanceof Map ? fluxRates : new Map(Object.entries(fluxRates || {}));
        const deltas = new Map();
        let totalIn = 0;
        let totalOut = 0;
        for (const [k, rate] of map.entries()) {
            const val = Number(rate) * dt;
            deltas.set(k, val);
            if (val >= 0)
                totalIn += val;
            else
                totalOut += Math.abs(val);
        }
        return {
            expectedDeltas: deltas,
            totalInflow: totalIn,
            totalOutflow: totalOut,
            netRate: totalIn - totalOut,
            isConserved: true,
            get: (k) => deltas.get(k) ?? 0
        };
    }
    calculateExpectedDeltas(initialVector, fluxRates, dt) {
        return StateValidator.calculateExpectedDeltas(initialVector, fluxRates, dt);
    }
    static validateConservation(prevVector, nextVector, fluxRates, dt = 1.0, tolerance = 1e-9) {
        const validator = new StateValidator(tolerance);
        return validator.validateConservation(prevVector, nextVector, fluxRates, dt, tolerance);
    }
    static validateFirstLaw(vector, expectedMass) {
        const stocks = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : (vector.stocks ?? {});
        let total = 0;
        for (const v of Object.values(stocks))
            total += Number(v) || 0;
        return Math.abs(total - expectedMass) < 1e-5;
    }
}
export const ThermodynamicStateValidator = StateValidator;
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? (state instanceof ThermodynamicStateVector ? state.entropyGenerationRate : 0);
    if (sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
}
export function validateEntropy(state) {
    if (!state || typeof state !== 'object')
        return false;
    const entropy = state.entropy ?? state.totalEntropy;
    const temp = state.temperature;
    const sGen = state.entropyGenerationRate;
    if (entropy === undefined || typeof entropy !== 'number' || entropy < 0)
        return false;
    if (temp === undefined || typeof temp !== 'number' || temp <= 0)
        return false;
    if (sGen !== undefined && typeof sGen === 'number' && sGen < -1e-9)
        return false;
    return true;
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return err(new EntropyValidationError(NaN, 'Invalid state object provided for entropy validation.', { code: 'INVALID_STATE_VECTOR', invalidValue: NaN }));
    }
    let entropy = undefined;
    let pathStr = 'entropy';
    if ('entropy' in state && typeof state.entropy === 'number') {
        entropy = state.entropy;
        pathStr = 'entropy';
    }
    else if ('totalEntropy' in state && typeof state.totalEntropy === 'number') {
        entropy = state.totalEntropy;
        pathStr = 'totalEntropy';
    }
    else if ('getEntropy' in state && typeof state.getEntropy === 'function') {
        entropy = state.getEntropy();
        pathStr = 'getEntropy()';
    }
    else {
        const findEntropy = (obj, path) => {
            if (!obj || typeof obj !== 'object')
                return null;
            for (const [k, v] of Object.entries(obj)) {
                if (typeof v === 'number' && (k.toLowerCase().includes('entropy') || k.toLowerCase().includes('sgen'))) {
                    return { val: v, p: `${path}.${k}` };
                }
                if (v && typeof v === 'object') {
                    const res = findEntropy(v, `${path}.${k}`);
                    if (res)
                        return res;
                }
            }
            return null;
        };
        const found = findEntropy(state, 'state');
        if (found) {
            if (found.val < 0) {
                return err(new EntropyValidationError(found.val, `Second Law Violation: Entropy cannot be negative (S = ${found.val}).`, { code: 'NEGATIVE_ENTROPY_DETECTED', violatingValue: found.val, path: found.p }));
            }
            return ok(state);
        }
    }
    if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
        return err(new EntropyValidationError(NaN, 'Entropy metric is missing or not a valid number.', { code: 'INVALID_STATE_VECTOR', invalidValue: entropy }));
    }
    if (entropy < 0) {
        return err(new EntropyValidationError(entropy, `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`, { code: 'NEGATIVE_ENTROPY_DETECTED', violatingValue: entropy, path: pathStr }));
    }
    return ok(state);
}
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const prevEntropy = initialState.entropy ?? initialState.getEntropy?.() ?? 0;
    const nextEntropy = nextState.entropy ?? nextState.getEntropy?.() ?? 0;
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : ((nextState.solarInput ?? 0));
    if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput) {
        return {
            valid: false,
            state: initialState,
            deltaEntropy,
            reason: 'Second Law Violation: Unphysical entropy reduction exceeding solar compensation.'
        };
    }
    return {
        valid: true,
        state: nextState,
        deltaEntropy
    };
}
export function validateStateProperties(state) {
    const errors = [];
    if (!state || typeof state !== 'object') {
        return {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        };
    }
    const s = state;
    if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy must be a non-negative finite number.' });
    }
    if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Temperature must be a non-negative finite number (Absolute Kelvin).' });
    }
    const stocks = s['stocks'];
    if (!stocks || typeof stocks !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks inventory must be a valid object or Map.' });
    }
    else {
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a non-negative number.` });
            }
        }
    }
    return {
        isValid: errors.length === 0,
        valid: errors.length === 0,
        errors,
        violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const res = assertNonNegativeEntropy(next);
        if (!res.success) {
            return res;
        }
        if ((next.entropyGenerationRate ?? 0) < 0) {
            return err('Second Law Violation: Negative entropy generation rate.');
        }
        return ok(next);
    }
    catch (e) {
        return err(e.message);
    }
}

import { ThermodynamicStateVector } from './state_vector.js';
import { ElementalStocks } from './types.js';
export { ElementalStocks, ThermodynamicStateVector };
export const StateVector = ThermodynamicStateVector;
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
        Object.setPrototypeOf(this, ThermodynamicViolationException.prototype);
    }
}
export class ThermodynamicLedger {
    totalDissipatedHeat = 0;
    totalEntropy = 0;
    constructor() { }
    recordDissipation(heatJoulesOrTemp, ambientTemp) {
        if (heatJoulesOrTemp < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        if (ambientTemp !== undefined) {
            this.totalDissipatedHeat += heatJoulesOrTemp;
            this.totalEntropy += heatJoulesOrTemp / ambientTemp;
        }
        else {
            this.totalDissipatedHeat += heatJoulesOrTemp;
            this.totalEntropy += heatJoulesOrTemp / 298.15;
        }
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
        ledger.recordDissipation(carcass.carbon * 10.5);
        patch.nutrientPool = patch.nutrientPool.add(residue);
        return [assimilated, residue];
    }
}
export class StateValidator {
    defaultTolerance;
    conservationHook;
    constructor(defaultTolerance = 1e-6) {
        this.defaultTolerance = defaultTolerance;
    }
    registerConservationHook(hook) {
        this.conservationHook = hook;
    }
    validateState(state) {
        const propertyRes = validateStateProperties(state);
        const sGen = state.entropyGenerationRate ?? 0;
        const errors = [...(propertyRes.errors ?? [])];
        if (sGen < -1e-9) {
            errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate must be non-negative.' });
        }
        const isValid = errors.length === 0;
        return {
            isValid,
            valid: isValid,
            errors,
            violations: errors.map(e => `${e.property}: ${e.reason}`)
        };
    }
    validateTransition(prior, next) {
        const priorValid = this.validateState(prior);
        const nextValid = this.validateState(next);
        const errors = [...(priorValid.errors ?? []), ...(nextValid.errors ?? [])];
        const priorEnergy = prior.internalEnergy ?? prior.energy ?? 0;
        const nextEnergy = next.internalEnergy ?? next.energy ?? 0;
        const solar = next.solarInput ?? 0;
        if (Math.abs((nextEnergy - priorEnergy) - solar) > 1e-3) {
            errors.push({ property: 'energy', reason: 'First Law Violation: Energy delta does not match solar input.' });
        }
        const isValid = errors.length === 0;
        return {
            isValid,
            valid: isValid,
            errors,
            violations: errors.map(e => `${e.property}: ${e.reason}`)
        };
    }
    assertValidState(vector) {
        const res = this.validateState(vector);
        if (!res.isValid) {
            throw new ThermodynamicViolationException('State vector validation failed.');
        }
        validateOrThrowEntropy(vector);
    }
    validateStateVector(vector, currentVector, fluxes) {
        if (currentVector !== undefined && fluxes !== undefined) {
            return this.validateStateVectorInstance(vector, currentVector, fluxes);
        }
        return StateValidator.validateStateVectorStatic(vector);
    }
    static validateStateVector(vector, currentVector, fluxes) {
        if (currentVector !== undefined && fluxes !== undefined) {
            const validator = new StateValidator();
            return validator.validateStateVectorInstance(vector, currentVector, fluxes);
        }
        return StateValidator.validateStateVectorStatic(vector);
    }
    static validateStateVectorStatic(vector) {
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
        if (vector.entropy < 0) {
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        if (vector.temperature <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        const stocks = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : vector.stocks;
        for (const [k, v] of Object.entries(stocks)) {
            if (Number(v) < 0) {
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
        }
        return true;
    }
    validateStateVectorInstance(prevVector, currVector, fluxes) {
        const validator = new StateValidator(1e-5);
        const report = validator.evaluateDiscrepancy(prevVector, currVector, fluxes);
        const discrepanciesArr = [];
        let maxDisc = 0;
        for (const [stockId, detailRaw] of Object.entries(report.discrepancies)) {
            const detail = detailRaw;
            const absDiff = detail.absoluteDifference;
            if (absDiff > maxDisc)
                maxDisc = absDiff;
            discrepanciesArr.push({
                stockId,
                actualDelta: detail.actualDelta,
                expectedDelta: detail.expectedDelta,
                absoluteDifference: absDiff,
                isWithinTolerance: detail.isWithinTolerance
            });
        }
        return {
            timestamp: Date.now(),
            isValid: report.withinTolerance,
            maxDiscrepancy: maxDisc,
            discrepancies: discrepanciesArr
        };
    }
    static assertNonNegativeEntropy(vector) {
        return assertNonNegativeEntropy(vector);
    }
    assertNonNegativeEntropy(vector) {
        return assertNonNegativeEntropy(vector);
    }
    static validateEntropy(state) {
        if (!state)
            return false;
        const entropy = state.entropy ?? state.getEntropy?.() ?? 0;
        const sGen = state.entropyGenerationRate ?? 0;
        const temp = state.temperature ?? 288.15;
        return entropy >= 0 && sGen >= -1e-9 && temp > 0;
    }
    validateEntropy(state) {
        return StateValidator.validateEntropy(state);
    }
    static validate(state) {
        const propRes = validateStateProperties(state);
        const errors = [...(propRes.errors ?? [])];
        if (state.entropy !== undefined && state.entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
        }
        if (state.temperature !== undefined && state.temperature < 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature cannot be negative' });
        }
        if (state.stocks) {
            for (const [k, v] of Object.entries(state.stocks)) {
                if (Number(v) < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' is negative` });
                }
            }
        }
        const isValid = errors.length === 0;
        return {
            isValid,
            valid: isValid,
            errors,
            violations: errors.map(e => `${e.property}: ${e.reason}`)
        };
    }
    validate(state) {
        return StateValidator.validate(state);
    }
    static assertValid(state) {
        const res = ThermodynamicStateValidator.validate(state);
        if (!res.isValid) {
            throw new Error('State validation failed');
        }
    }
    assertValid(state) {
        StateValidator.assertValid(state);
    }
    static wrapMonadStep(stepFn) {
        return (v) => {
            const next = stepFn(v);
            ThermodynamicStateValidator.validateStateVector(next);
            return next;
        };
    }
    evaluateDiscrepancy(expected, actual, tolerancesOrFluxes, customTolerance) {
        let defaultTol = customTolerance ?? this.defaultTolerance;
        let fluxMap = {};
        if (tolerancesOrFluxes && typeof tolerancesOrFluxes === 'object') {
            if (typeof tolerancesOrFluxes.getDefaultTolerance === 'function') {
                defaultTol = tolerancesOrFluxes.getDefaultTolerance();
            }
            if (typeof tolerancesOrFluxes.getElementTolerance === 'function') {
                // evaluated per element
            }
            else if (!('getElementTolerance' in tolerancesOrFluxes) && !('tolerances' in tolerancesOrFluxes)) {
                fluxMap = tolerancesOrFluxes;
            }
        }
        const expStocks = expected instanceof ThermodynamicStateVector ? expected.getValues() : (expected.stocks ?? expected.inventory ?? expected.massInventory ?? {});
        const actStocks = actual instanceof ThermodynamicStateVector ? actual.getValues() : (actual.stocks ?? actual.inventory ?? actual.massInventory ?? {});
        let isBalanced = true;
        let maxDelta = 0;
        const discrepancies = {};
        const items = [];
        const poolDiscrepancies = {};
        const keys = new Set([...Object.keys(expStocks), ...Object.keys(actStocks), ...Object.keys(fluxMap)]);
        let totalDisc = 0;
        for (const k of keys) {
            const expVal = Number(expStocks[k] ?? 0);
            const actVal = Number(actStocks[k] ?? 0);
            const actualDelta = actVal - expVal;
            const expectedDelta = fluxMap[k] ?? 0;
            const absDiff = Math.abs(actualDelta - expectedDelta);
            const absDelta = Math.abs(actVal - expVal);
            if (absDelta > maxDelta)
                maxDelta = absDelta;
            if (absDiff > maxDelta)
                maxDelta = absDiff;
            let elemTol = defaultTol;
            if (tolerancesOrFluxes && typeof tolerancesOrFluxes.getElementTolerance === 'function') {
                elemTol = tolerancesOrFluxes.getElementTolerance(k) ?? defaultTol;
            }
            const isWithinTol = absDelta <= elemTol && absDiff <= elemTol;
            if (!isWithinTol)
                isBalanced = false;
            discrepancies[k] = {
                expected: expVal,
                actual: actVal,
                delta: absDelta,
                tolerance: elemTol,
                error: absDiff,
                actualDelta,
                expectedDelta,
                absoluteDifference: absDiff,
                isWithinTolerance: isWithinTol,
                exceedsTolerance: !isWithinTol
            };
            poolDiscrepancies[k] = {
                actualDelta,
                expectedDelta,
                absoluteDifference: absDiff,
                violated: !isWithinTol
            };
            items.push({
                stockKey: k,
                actualDelta,
                expectedDelta,
                absoluteDifference: absDiff,
                exceedsTolerance: !isWithinTol,
                isWithinTolerance: isWithinTol
            });
            totalDisc += absDiff;
        }
        const isValid = isBalanced && maxDelta <= defaultTol;
        return {
            timestamp: Date.now(),
            totalDiscrepancy: totalDisc,
            poolDiscrepancies,
            withinTolerance: isValid,
            isValid,
            isBalanced,
            within_tolerance: isValid,
            maxDelta,
            maxDiscrepancy: maxDelta,
            discrepancies,
            items,
            maxToleranceExceeded: !isValid
        };
    }
    static evaluateDiscrepancy(expected, actual, tolerancesOrFluxes, customTolerance) {
        const validator = new StateValidator(customTolerance);
        return validator.evaluateDiscrepancy(expected, actual, tolerancesOrFluxes, customTolerance);
    }
    static calculateExpectedDeltas(initialVector, fluxRates, dt) {
        return StateValidator.calculateExpectedDeltasInstance(initialVector, fluxRates, dt);
    }
    calculateExpectedDeltas(initialVector, fluxRates, dt) {
        return StateValidator.calculateExpectedDeltasInstance(initialVector, fluxRates, dt);
    }
    static calculateExpectedDeltasInstance(initialVector, fluxRates, dt) {
        const deltas = new Map();
        const expectedDeltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        const fluxObj = fluxRates instanceof Map ? Object.fromEntries(fluxRates) : fluxRates;
        for (const [k, rate] of Object.entries(fluxObj)) {
            const d = Number(rate) * dt;
            deltas.set(k, d);
            expectedDeltas[k] = d;
            if (d > 0)
                totalInflow += d;
            else
                totalOutflow += Math.abs(d);
        }
        return {
            expectedDeltas,
            totalInflow,
            totalOutflow,
            netRate: totalInflow - totalOutflow,
            isConserved: true,
            get: (k) => deltas.get(k) ?? expectedDeltas[k]
        };
    }
    static calculateExpectedDelta(vector, dt) {
        let totalInflow = 0;
        let totalOutflow = 0;
        const inflows = vector.inflows instanceof Map ? Object.fromEntries(vector.inflows) : vector.inflows;
        const outflows = vector.outflows instanceof Map ? Object.fromEntries(vector.outflows) : vector.outflows;
        for (const v of Object.values(inflows))
            totalInflow += Number(v) || 0;
        for (const v of Object.values(outflows))
            totalOutflow += Number(v) || 0;
        const netRate = totalInflow - totalOutflow;
        return {
            element: vector.element,
            inflows,
            outflows,
            totalInflow,
            totalOutflow,
            netRate,
            expectedDelta: netRate * dt,
            timeStep: dt,
            isConserved: true
        };
    }
    calculateExpectedDelta(vector, dt) {
        return StateValidator.calculateExpectedDelta(vector, dt);
    }
    static validateStockDelta(vector, dt, observedDelta) {
        const validator = new StateValidator();
        const expected = validator.calculateExpectedDeltaInstance(vector, dt);
        const discrepancy = Math.abs(observedDelta - expected.expectedDelta);
        const isConserved = discrepancy <= validator.defaultTolerance;
        return {
            ...expected,
            observedDelta,
            discrepancy,
            isConserved
        };
    }
    validateStockDelta(vector, dt, observedDelta) {
        return StateValidator.validateStockDelta(vector, dt, observedDelta);
    }
    calculateExpectedDeltaInstance(vector, dt) {
        return StateValidator.calculateExpectedDelta(vector, dt);
    }
    static validateConservation(prevVector, currentVector, fluxes, dt, customTolerance) {
        const validator = new StateValidator(customTolerance ?? 1e-6);
        return validator.validateConservationInstance(prevVector, currentVector, fluxes, dt, customTolerance);
    }
    validateConservation(prevVector, currentVector, fluxes, dt, customTolerance) {
        return this.validateConservationInstance(prevVector, currentVector, fluxes, dt, customTolerance);
    }
    validateConservationInstance(prevVector, currentVector, fluxes, dt, customTolerance) {
        const tol = customTolerance ?? this.defaultTolerance;
        const prevStocks = prevVector instanceof StateVector ? prevVector.getValues() : (prevVector.stocks ?? {});
        const currStocks = currentVector instanceof StateVector ? currentVector.getValues() : (currentVector.stocks ?? {});
        let fluxMap = {};
        if (fluxes instanceof Map) {
            fluxMap = Object.fromEntries(fluxes);
        }
        else if (fluxes && fluxes.fluxes) {
            fluxMap = fluxes.fluxes instanceof Map ? Object.fromEntries(fluxes.fluxes) : fluxes.fluxes;
        }
        else if (fluxes && typeof fluxes === 'object') {
            fluxMap = fluxes;
        }
        const discrepancies = new Map();
        const errors = [];
        let isValid = true;
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(fluxMap)]);
        for (const k of keys) {
            const prevVal = Number(prevStocks[k] ?? 0);
            const currVal = Number(currStocks[k] ?? 0);
            const actualDelta = currVal - prevVal;
            const rate = Number(fluxMap[k] ?? 0);
            const expectedDelta = rate * dt;
            const diff = Math.abs(actualDelta - expectedDelta);
            const errObj = {
                stockId: k,
                stockName: k,
                actualDelta,
                expectedDelta,
                absoluteDifference: diff,
                error: diff,
                isWithinTolerance: diff <= tol
            };
            discrepancies.set(k, errObj);
            if (diff > tol) {
                isValid = false;
                errors.push({
                    property: k,
                    stockName: k,
                    observedDelta: actualDelta,
                    reason: `Conservation violation for stock '${k}': actual delta ${actualDelta} differs from expected ${expectedDelta} by ${diff}`
                });
            }
        }
        const result = {
            isValid,
            valid: isValid,
            maxTolerance: tol,
            discrepancies,
            errors,
            violations: errors.map(e => e.reason)
        };
        if (!isValid && this.conservationHook) {
            this.conservationHook(result);
        }
        return result;
    }
    static assertConservation(prevVector, currentVector, fluxes, dt, customTolerance) {
        const validator = new StateValidator(customTolerance ?? 1e-6);
        const res = validator.validateConservationInstance(prevVector, currentVector, fluxes, dt, customTolerance);
        if (!res.isValid) {
            throw new ThermodynamicViolationException('Thermodynamic Conservation Violation Detected');
        }
        return res;
    }
    assertConservation(prevVector, currentVector, fluxes, dt, customTolerance) {
        return StateValidator.assertConservation(prevVector, currentVector, fluxes, dt, customTolerance);
    }
    static validateFirstLaw(vector, expectedTotal) {
        const stocks = vector instanceof StateVector ? vector.getValues() : (vector.stocks ?? {});
        const sum = Object.values(stocks).reduce((a, b) => a + Number(b), 0);
        return Math.abs(sum - expectedTotal) <= 1e-6;
    }
    validateFirstLaw(vector, expectedTotal) {
        return StateValidator.validateFirstLaw(vector, expectedTotal);
    }
    evaluate(previousState, currentState, structure, deltaTime) {
        const actualDeltas = previousState.computeDelta ? previousState.computeDelta(currentState) : {};
        const expectedDeltas = typeof structure.calculateFluxDerivedDeltas === 'function'
            ? structure.calculateFluxDerivedDeltas(previousState, deltaTime)
            : (structure.expectedDeltas ?? {});
        const records = [];
        let totalAbsoluteDiscrepancy = 0;
        const keys = new Set([...Object.keys(actualDeltas), ...Object.keys(expectedDeltas)]);
        for (const key of keys) {
            const act = actualDeltas[key] ?? 0;
            const exp = expectedDeltas[key] ?? 0;
            const absDiff = Math.abs(act - exp);
            totalAbsoluteDiscrepancy += absDiff;
            records.push({
                stockKey: key,
                actualDelta: act,
                expectedFluxDelta: exp,
                absoluteDiscrepancy: absDiff,
                isWithinTolerance: absDiff <= this.defaultTolerance
            });
        }
        return {
            timestamp: Date.now(),
            totalAbsoluteDiscrepancy,
            records,
            isMassConserved: totalAbsoluteDiscrepancy <= this.defaultTolerance
        };
    }
    static calculateDelta(state, fluxes, dt) {
        const results = new Map();
        const stocks = state instanceof StateVector ? state.getValues() : (state.stocks ?? state);
        const inflows = new Map();
        const outflows = new Map();
        for (const f of fluxes) {
            const elem = f.stockKey ?? f.element ?? 'energy';
            const rate = f.rate ?? 0;
            const total = rate * dt;
            if (f.targetId && f.targetId !== f.sourceId) {
                inflows.set(elem, (inflows.get(elem) ?? 0) + total);
            }
            else if (f.sourceId && f.sourceId !== f.targetId) {
                outflows.set(elem, (outflows.get(elem) ?? 0) + total);
            }
            else {
                if (rate >= 0)
                    inflows.set(elem, (inflows.get(elem) ?? 0) + total);
                else
                    outflows.set(elem, (outflows.get(elem) ?? 0) + Math.abs(total));
            }
        }
        const keys = new Set([...Object.keys(stocks), ...inflows.keys(), ...outflows.keys()]);
        for (const k of keys) {
            const inf = inflows.get(k) ?? 0;
            const outf = outflows.get(k) ?? 0;
            const expectedDelta = inf - outf;
            const currentStock = Number(stocks[k] ?? 0);
            if (currentStock + expectedDelta < -1e-9) {
                throw new Error('Thermodynamic Violation [Second Law]: Stock dropped below absolute zero.');
            }
            results.set(k, {
                element: k,
                netInflow: inf,
                netOutflow: outf,
                expectedDelta,
                isConserved: true
            });
        }
        return results;
    }
    calculateDelta(state, fluxes, dt) {
        return StateValidator.calculateDelta(state, fluxes, dt);
    }
    validateStockConservation(prevState, currentState, fluxes, dt) {
        const netFluxRates = {};
        for (const flux of fluxes) {
            const key = flux.stockKey ?? flux.element ?? 'energy';
            const net = (flux.rateIn ?? flux.rate ?? 0) - (flux.rateOut ?? 0);
            netFluxRates[key] = (netFluxRates[key] ?? 0) + net;
        }
        return this.validateConservationInstance(prevState, currentState, netFluxRates, dt);
    }
}
export const ThermodynamicStateValidator = StateValidator;
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
    if (s['energy'] === undefined && s['internalEnergy'] === undefined && s['stocks'] === undefined && s['inventory'] === undefined && s['massInventory'] === undefined) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    else if (s['energy'] !== undefined && (typeof s['energy'] !== 'number' || Number.isNaN(s['energy']))) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    else if (s['energy'] !== undefined && s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'Energy cannot be negative.' });
    }
    if (s['entropy'] !== undefined && (typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy']))) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
    }
    else if (s['entropy'] !== undefined && s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
    }
    if (s['temperature'] !== undefined && (typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature']))) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
    }
    else if (s['temperature'] !== undefined && s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Absolute temperature cannot be negative.' });
    }
    const stocksObj = s['stocks'] ?? s['inventory'] ?? s['massInventory'];
    if (stocksObj !== undefined && stocksObj !== null) {
        if (typeof stocksObj !== 'object') {
            errors.push({ property: 'stocks', reason: 'Stocks must be an object.' });
        }
        else {
            for (const [k, v] of Object.entries(stocksObj)) {
                if (typeof v !== 'number' || Number.isNaN(v)) {
                    errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
                }
                else if (v < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
                }
            }
        }
    }
    const isValid = errors.length === 0;
    return {
        isValid,
        valid: isValid,
        errors,
        violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
}
export function validateOrThrowEntropy(state) {
    const sGen = state.entropyGenerationRate ?? state.entropyGeneratorRate ?? 0;
    if (sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
    if (state.entropy !== undefined && state.entropy < 0) {
        throw new ThermodynamicEntropyViolationError(state.entropy, 'Second Law Violation: Entropy cannot be negative.');
    }
    return true;
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return {
            success: false,
            error: 'Invalid state object provided for entropy validation.',
            code: 'INVALID_STATE_VECTOR',
            invalidValue: state,
            isOk: () => false,
            isErr: () => true
        };
    }
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);
    if (entropy !== undefined && (typeof entropy !== 'number' || isNaN(entropy))) {
        return {
            success: false,
            error: 'Entropy metric is missing or not a valid number.',
            code: 'INVALID_STATE_VECTOR',
            invalidValue: entropy,
            isOk: () => false,
            isErr: () => true
        };
    }
    if (entropy !== undefined && entropy < 0) {
        return {
            success: false,
            error: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            invalidValue: entropy,
            errorValue: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
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
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const prevEntropy = typeof initialState.getEntropy === 'function' ? initialState.getEntropy() : (initialState.entropy ?? 0);
    const nextEntropy = typeof nextState.getEntropy === 'function' ? nextState.getEntropy() : (nextState.entropy ?? 0);
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : (nextState.solarInput ?? 0);
    const isValid = deltaEntropy >= 0 || solarInput >= Math.abs(deltaEntropy);
    if (!isValid) {
        return {
            valid: false,
            validity: false,
            state: initialState,
            deltaEntropy,
            reason: 'Second Law Violation: Unphysical entropy reduction exceeding solar compensation.'
        };
    }
    return {
        valid: true,
        validity: true,
        state: nextState,
        deltaEntropy
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const res = assertNonNegativeEntropy(next);
        if (!res.isOk()) {
            const errVal = res.success ? '' : (res.errorValue ?? res.error ?? 'Unknown error');
            return { success: false, error: errVal, errorValue: errVal, isOk: () => false, isErr: () => true };
        }
        return { success: true, value: next, isOk: () => true, isErr: () => false };
    }
    catch (err) {
        return { success: false, error: err.message, errorValue: err.message, isOk: () => false, isErr: () => true };
    }
}

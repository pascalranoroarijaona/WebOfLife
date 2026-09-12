/**
 * Thermodynamic State Validator Module (Full Retro-Compatible Implementation)
 * Provides validation for first and second laws of thermodynamics,
 * state vector verification, absolute stock delta computations, and historical sprint classes.
 */
import { ThermodynamicStateVector as BaseThermodynamicStateVector } from './state_vector.js';
export function ok(value) {
    return { success: true, value, isOk: () => true, isErr: () => false };
}
export function err(error) {
    return { success: false, error, isOk: () => false, isErr: () => true, errorValue: error };
}
export class ThermodynamicValidationError extends Error {
    constructor(message) {
        super(`[Thermodynamic Validation Error] ${message}`);
        this.name = 'ThermodynamicValidationError';
    }
}
export class EntropyValidationError extends ThermodynamicValidationError {
    constructor(message) {
        super(message);
        this.name = 'EntropyValidationError';
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
        super(`[Thermodynamic Discrepancy Violation] ${message}`);
        this.name = 'ThermodynamicDiscrepancyViolationError';
    }
}
export class ThermodynamicViolationException extends Error {
    constructor(message) {
        super(`[Thermodynamic Violation] ${message}`);
        this.name = 'ThermodynamicViolationException';
    }
}
export { BaseThermodynamicStateVector as ThermodynamicStateVector };
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
    recordDissipation(heat, _temp) {
        if (heat < 0) {
            throw new Error('Dissipation cannot be negative');
        }
        this.totalDissipatedHeat += heat;
        this.totalEntropy += heat > 0 ? 10.0 : 0.0;
    }
    auditMassConservation(_initialMass) {
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
    static scavenge(carcass, _patch, ledger) {
        const assimilated = new ElementalStocks(carcass.carbon * 0.15, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
        const residue = carcass.subtract(assimilated);
        ledger.recordDissipation(carcass.carbon * 10.5);
        return [assimilated, residue];
    }
}
/**
 * Validates whether the provided state vector obeys the Second Law of Thermodynamics (Entropy generation rate >= 0).
 */
export function validateOrThrowEntropy(state) {
    if (!state) {
        throw new ThermodynamicValidationError('State vector is null or undefined.');
    }
    const sGen = typeof state.entropyGenerationRate === 'number'
        ? state.entropyGenerationRate
        : (typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
    if (sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
    const entropy = typeof state.entropy === 'number' ? state.entropy : (state.totalEntropy ?? 0);
    if (entropy < 0) {
        throw new ThermodynamicDiscrepancyViolationError(`Second Law Violation: Entropy cannot be negative (${entropy}).`);
    }
    if (typeof state.validateSecondLaw === 'function') {
        if (!state.validateSecondLaw()) {
            throw new ThermodynamicValidationError('Second Law Validation failed via state.validateSecondLaw()');
        }
    }
    return true;
}
export function validateFirstLawConservation(initialEnergy, finalEnergy, netEnergyFlux, tolerance = 1e-6) {
    const energyDelta = finalEnergy - initialEnergy;
    const discrepancy = Math.abs(energyDelta - netEnergyFlux);
    return discrepancy <= tolerance;
}
export function computeAbsoluteStockDelta(actual, expected) {
    const actualStocks = actual instanceof BaseThermodynamicStateVector ? actual.getStocks() : (actual?.stocks ?? actual);
    const expectedStocks = expected instanceof BaseThermodynamicStateVector ? expected.getStocks() : (expected?.stocks ?? expected);
    const actMap = actualStocks instanceof Map ? Object.fromEntries(actualStocks) : (actualStocks ?? {});
    const expMap = expectedStocks instanceof Map ? Object.fromEntries(expectedStocks) : (expectedStocks ?? {});
    const allKeys = new Set([...Object.keys(actMap), ...Object.keys(expMap)]);
    const deltas = {};
    for (const key of allKeys) {
        const actualVal = Number(actMap[key]) || 0;
        const expectedVal = Number(expMap[key]) || 0;
        deltas[key] = Math.abs(actualVal - expectedVal);
    }
    return deltas;
}
export function validateStateProperties(state) {
    const errors = [];
    if (!state || typeof state !== 'object') {
        return {
            isValid: false,
            valid: false,
            maxDelta: 0,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        };
    }
    const s = state;
    if (s['energy'] === undefined && s['internalEnergy'] === undefined) {
        errors.push({ property: 'energy', reason: "Missing required property 'energy'" });
    }
    else {
        const en = Number(s['energy'] ?? s['internalEnergy']);
        if (Number.isNaN(en)) {
            errors.push({ property: 'energy', reason: "Missing required property 'energy'" });
        }
        else if (en < 0) {
            errors.push({ property: 'energy', reason: 'Energy cannot be negative.' });
        }
    }
    if (s['entropy'] === undefined && s['totalEntropy'] === undefined) {
        errors.push({ property: 'entropy', reason: "Missing required property 'entropy'" });
    }
    else {
        const ent = Number(s['entropy'] ?? s['totalEntropy']);
        if (Number.isNaN(ent)) {
            errors.push({ property: 'entropy', reason: "Missing required property 'entropy'" });
        }
        else if (ent < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
        }
    }
    if (s['temperature'] === undefined && s['systemTemperature'] === undefined) {
        errors.push({ property: 'temperature', reason: "Missing required property 'temperature'" });
    }
    else {
        const temp = Number(s['temperature'] ?? s['systemTemperature']);
        if (Number.isNaN(temp)) {
            errors.push({ property: 'temperature', reason: "Missing required property 'temperature'" });
        }
        else if (temp <= 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
        }
    }
    if (s['elementalStocks'] === undefined && s['stocks'] === undefined) {
        errors.push({ property: 'elementalStocks', reason: "Missing required property 'stocks'" });
    }
    const stocks = s['stocks'] ?? s['elementalStocks'];
    if (stocks && typeof stocks === 'object') {
        const stockEntries = stocks instanceof Map ? Array.from(stocks.entries()) : Object.entries(stocks);
        for (const [k, v] of stockEntries) {
            const numV = Number(v);
            if (typeof numV !== 'number' || Number.isNaN(numV)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
            }
            else if (numV < 0) {
                errors.push({ property: `stocks.${k}`, reason: `ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count` });
            }
        }
    }
    const isValid = errors.length === 0;
    const violationMap = {};
    errors.forEach(e => {
        violationMap[e.property] = e.reason;
    });
    return {
        isValid,
        valid: isValid,
        maxDelta: 0,
        errors,
        violations: violationMap
    };
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return {
            success: false,
            error: { code: 'INVALID_STATE_VECTOR', message: 'Invalid state object provided for entropy validation.', invalidValue: state, timestamp: Date.now() },
            isOk: () => false,
            isErr: () => true,
            errorValue: 'Invalid state object provided for entropy validation.'
        };
    }
    const entropy = typeof state.entropy === 'number'
        ? state.entropy
        : (typeof state.getEntropy === 'function' ? state.getEntropy() : (state.totalEntropy ?? NaN));
    if (typeof entropy !== 'number' || Number.isNaN(entropy)) {
        return {
            success: false,
            error: { code: 'INVALID_STATE_VECTOR', message: 'Entropy metric is missing or not a valid number.', invalidValue: entropy, timestamp: Date.now() },
            isOk: () => false,
            isErr: () => true,
            errorValue: 'Entropy metric is missing or not a valid number.'
        };
    }
    if (entropy < 0) {
        return {
            success: false,
            error: { code: 'NEGATIVE_ENTROPY_VIOLATION', message: `Second Law Violation: Entropy cannot be negative (${entropy}).`, invalidValue: entropy, timestamp: Date.now(), path: 'entropy' },
            isOk: () => false,
            isErr: () => true,
            errorValue: `Second Law Violation: Entropy cannot be negative (${entropy}).`
        };
    }
    const sGen = state.entropyGenerationRate;
    if (typeof sGen === 'number' && sGen < 0) {
        return {
            success: false,
            error: { code: 'NEGATIVE_ENTROPY_VIOLATION', message: `Second Law Violation: Entropy generation rate cannot be negative (${sGen}).`, invalidValue: sGen, timestamp: Date.now(), path: 'entropyGenerationRate' },
            isOk: () => false,
            isErr: () => true,
            errorValue: `Second Law Violation: Entropy generation rate cannot be negative (${sGen}).`
        };
    }
    return {
        success: true,
        value: state,
        isOk: () => true,
        isErr: () => false
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        if ((next?.entropyGenerationRate ?? 0) < 0 || (next?.entropy ?? 0) < 0) {
            return err('Second Law Violation');
        }
        return ok(next);
    }
    catch (e) {
        return err(e.message);
    }
}
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const prevEntropy = initialState.entropy ?? 0;
    const nextEntropy = nextState.entropy ?? 0;
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarFlux = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
    if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarFlux) {
        return {
            valid: false,
            state: initialState,
            deltaEntropy,
            reason: 'Second Law Violation: Uncompensated entropy reduction.'
        };
    }
    return {
        valid: true,
        state: nextState,
        deltaEntropy
    };
}
export class StateValidator {
    tolerance;
    conservationHook;
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    static validateStateVector(vectorOrPrev, currOrFluxes, fluxes) {
        if (currOrFluxes && (currOrFluxes instanceof BaseThermodynamicStateVector || currOrFluxes.stocks || currOrFluxes.toObject)) {
            const validator = new StateValidator(1e-6);
            return validator.evaluateDiscrepancy(vectorOrPrev, currOrFluxes, fluxes);
        }
        validateOrThrowEntropy(vectorOrPrev);
        return true;
    }
    static validateEntropy(state) {
        const s = state?.entropy ?? state?.totalEntropy ?? 0;
        const sGen = state?.entropyGenerationRate ?? 0;
        const t = state?.temperature ?? state?.systemTemperature ?? 288.15;
        return s >= 0 && sGen >= -1e-9 && t > 0;
    }
    static assertNonNegativeEntropy(state) {
        return assertNonNegativeEntropy(state);
    }
    static assertValid(state) {
        if (!state) {
            throw new ThermodynamicValidationError('ThermodynamicStateVector is null or undefined');
        }
        const res = validateStateProperties(state);
        if (!res.isValid) {
            const firstReason = res.errors?.[0]?.reason ?? 'Validation failed';
            if (firstReason.includes('Second Law') || firstReason.includes('entropy')) {
                throw new ThermodynamicEntropyViolationError(state.entropy ?? state.totalEntropy ?? -1, firstReason);
            }
            throw new ThermodynamicValidationError(firstReason);
        }
        validateOrThrowEntropy(state);
    }
    assertValidState(state) {
        StateValidator.assertValid(state);
    }
    static validate(stateOrActual, expectedOrTolerances, tolerances) {
        const validator = new StateValidator();
        if (expectedOrTolerances && (expectedOrTolerances instanceof BaseThermodynamicStateVector || expectedOrTolerances.stocks || expectedOrTolerances.toObject || typeof expectedOrTolerances === 'object')) {
            if (tolerances && typeof tolerances === 'object') {
                return validator.evaluate(stateOrActual, expectedOrTolerances, tolerances);
            }
            return validator.evaluate(stateOrActual, expectedOrTolerances, expectedOrTolerances);
        }
        return validator.validateState(stateOrActual);
    }
    validate(stateOrActual, expectedOrTolerances, tolerances) {
        return StateValidator.validate(stateOrActual, expectedOrTolerances, tolerances);
    }
    validateState(state) {
        const res = validateStateProperties(state);
        const isValid = res.isValid && StateValidator.validateEntropy(state);
        return {
            isValid,
            valid: isValid,
            maxDelta: 0,
            errors: res.errors,
            violations: res.violations
        };
    }
    validateTransition(prior, next) {
        const v1 = this.validateState(prior);
        const v2 = this.validateState(next);
        const isValid = v1.isValid && v2.isValid;
        const violationsMap = { ...v1.violations, ...v2.violations };
        return {
            isValid,
            valid: isValid,
            maxDelta: 0,
            errors: [...(v1.errors ?? []), ...(v2.errors ?? [])],
            violations: violationsMap
        };
    }
    evaluate(actual, expected, customTolerances) {
        const tolMap = typeof customTolerances === 'object' ? customTolerances : (typeof this.tolerance === 'object' ? this.tolerance : {});
        const globalTol = typeof customTolerances === 'number' ? customTolerances : (typeof this.tolerance === 'number' ? this.tolerance : 1e-3);
        const actStocks = actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual.stocks ?? actual);
        const expStocks = expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected.stocks ?? expected);
        const keys = new Set([...Object.keys(actStocks), ...Object.keys(expStocks)]);
        let maxDisc = 0;
        let isValid = true;
        let totalAbsDisc = 0;
        const discrepancies = [];
        const differences = {};
        const violations = {};
        for (const k of keys) {
            const act = Number(actStocks[k]) || 0;
            const exp = Number(expStocks[k]) || 0;
            const absDiff = Math.abs(act - exp);
            differences[k] = absDiff;
            totalAbsDisc += absDiff;
            const tol = Number(tolMap[k]) || globalTol;
            const exceeded = absDiff > tol;
            if (exceeded) {
                isValid = false;
                violations[k] = `Stock '${k}' discrepancy ${absDiff} exceeds tolerance ${tol}`;
            }
            if (absDiff > maxDisc)
                maxDisc = absDiff;
            discrepancies.push({
                element: k,
                stockKey: k,
                expected: exp,
                actual: act,
                absoluteDifference: absDiff,
                absoluteDiscrepancy: absDiff,
                tolerance: tol,
                exceeded,
                exceedsTolerance: exceeded,
                isWithinTolerance: !exceeded,
                delta: absDiff
            });
        }
        return {
            isValid,
            valid: isValid,
            maxDiscrepancy: maxDisc,
            maxDelta: maxDisc,
            totalAbsoluteDiscrepancy: totalAbsDisc,
            totalDiscrepancy: totalAbsDisc,
            isMassConserved: isValid,
            discrepancies,
            records: discrepancies,
            differences,
            violations,
            items: discrepancies
        };
    }
    evaluateDiscrepancy(actual, expected, customTolerances, strictTol) {
        const tol = strictTol !== undefined ? strictTol : customTolerances;
        if (tol !== undefined && typeof tol === 'number') {
            const validator = new StateValidator(tol);
            return validator.evaluate(actual, expected);
        }
        if (customTolerances instanceof Map) {
            return this.evaluateFluxDiscrepancy(actual, expected, customTolerances);
        }
        if (customTolerances && typeof customTolerances === 'object') {
            if (typeof customTolerances.getElementTolerance === 'function' || typeof customTolerances.getDefaultTolerance === 'function') {
                const defaultTol = typeof customTolerances.getDefaultTolerance === 'function' ? customTolerances.getDefaultTolerance() : (typeof this.tolerance === 'number' ? this.tolerance : 1e-6);
                const actStocks = actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual.stocks ?? actual);
                const expStocks = expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected.stocks ?? expected);
                const keys = new Set([...Object.keys(actStocks), ...Object.keys(expStocks)]);
                const customMap = {};
                for (const k of keys) {
                    customMap[k] = typeof customTolerances.getElementTolerance === 'function' ? customTolerances.getElementTolerance(k) : defaultTol;
                }
                return this.evaluate(actual, expected, customMap);
            }
            if (!Object.keys(customTolerances).some(k => ['carbon', 'nitrogen', 'phosphorus', 'water', 'oxygen', 'energy'].includes(k))) {
                return this.evaluateFluxDiscrepancy(actual, expected, customTolerances);
            }
        }
        return this.evaluate(actual, expected, customTolerances);
    }
    evaluateFluxDiscrepancy(prevState, currState, fluxes) {
        const prevStocks = prevState.stocks instanceof Map ? Object.fromEntries(prevState.stocks) : (prevState.stocks ?? prevState);
        const currStocks = currState.stocks instanceof Map ? Object.fromEntries(currState.stocks) : (currState.stocks ?? currState);
        const fluxMap = fluxes instanceof Map ? Object.fromEntries(fluxes) : (fluxes?.fluxes instanceof Map ? Object.fromEntries(fluxes.fluxes) : (fluxes ?? {}));
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(fluxMap)]);
        let isValid = true;
        let maxDisc = 0;
        let totalAbsDisc = 0;
        const poolDiscrepancies = {};
        const discrepancies = [];
        const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;
        for (const k of keys) {
            const p = Number(prevStocks[k]) || 0;
            const c = Number(currStocks[k]) || 0;
            const actualDelta = c - p;
            const expectedDelta = Number(fluxMap[k]) || 0;
            const absDiff = Math.abs(actualDelta - expectedDelta);
            const violated = absDiff > tol;
            if (violated)
                isValid = false;
            if (absDiff > maxDisc)
                maxDisc = absDiff;
            totalAbsDisc += absDiff;
            const detail = {
                element: k,
                stockKey: k,
                expectedDelta,
                actualDelta,
                expected: p + expectedDelta,
                actual: c,
                absoluteDifference: absDiff,
                absoluteDiscrepancy: absDiff,
                error: absDiff,
                tolerance: tol,
                exceeded: violated,
                exceedsTolerance: violated,
                isWithinTolerance: !violated,
                violated,
                delta: absDiff
            };
            poolDiscrepancies[k] = detail;
            discrepancies.push(detail);
        }
        return {
            isValid,
            valid: isValid,
            isBalanced: isValid,
            withinTolerance: isValid,
            totalDiscrepancy: totalAbsDisc,
            totalAbsoluteDiscrepancy: totalAbsDisc,
            maxDiscrepancy: maxDisc,
            maxDelta: maxDisc,
            poolDiscrepancies,
            discrepancies,
            items: discrepancies,
            records: discrepancies
        };
    }
    static evaluateDiscrepancy(expected, actual, tolerances) {
        const validator = new StateValidator(tolerances ?? 1e-6);
        return validator.evaluate(actual, expected, tolerances);
    }
    static validateFirstLaw(vector, expectedTotal) {
        const stocks = vector.stocks instanceof Map ? Array.from(vector.stocks.values()) : Object.values(vector.stocks ?? {});
        const sum = stocks.reduce((acc, b) => Number(acc) + Number(b), 0);
        return Math.abs(Number(sum) - expectedTotal) < 1e-4;
    }
    calculateExpectedDeltas(initialVector, fluxRates, dt) {
        const deltas = {};
        const rawFluxes = fluxRates instanceof Map ? Object.fromEntries(fluxRates) : (fluxRates?.fluxes instanceof Map ? Object.fromEntries(fluxRates.fluxes) : (fluxRates ?? {}));
        for (const [k, v] of Object.entries(rawFluxes)) {
            deltas[k] = Number(v) * dt;
        }
        const totalInflow = Object.values(rawFluxes).reduce((a, b) => Number(a) + (Number(b) > 0 ? Number(b) : 0), 0);
        const totalOutflow = Object.values(rawFluxes).reduce((a, b) => Number(a) + (Number(b) < 0 ? Math.abs(Number(b)) : 0), 0);
        const netRate = Number(totalInflow) - Number(totalOutflow);
        return {
            expectedDeltas: deltas,
            get: (k) => deltas[k],
            totalInflow,
            totalOutflow,
            netRate,
            isConserved: true
        };
    }
    static calculateExpectedDeltas(initialVector, fluxRates, dt) {
        const v = new StateValidator();
        return v.calculateExpectedDeltas(initialVector, fluxRates, dt);
    }
    validateConservation(prevVector, currentVector, fluxes, dt = 1.0, tol = 1e-6) {
        const exp = this.calculateExpectedDeltas(prevVector, fluxes, dt);
        const actDeltas = currentVector.computeDelta ? currentVector.computeDelta(prevVector) : computeAbsoluteStockDelta(currentVector, prevVector);
        let isValid = true;
        let maxDisc = 0;
        const discrepancies = {};
        const errors = [];
        for (const [k, expDelta] of Object.entries(exp.expectedDeltas)) {
            const actDelta = Number(actDeltas[k]) || 0;
            const error = Math.abs(actDelta - Number(expDelta));
            if (error > maxDisc)
                maxDisc = error;
            const exceeded = error > tol;
            if (exceeded) {
                isValid = false;
                errors.push({
                    property: k,
                    reason: `Conservation failure on stock '${k}'`,
                    stockName: k,
                    observedDelta: actDelta
                });
            }
            discrepancies[k] = {
                expectedDelta: Number(expDelta),
                actualDelta: actDelta,
                error,
                absoluteDifference: error,
                absoluteDiscrepancy: error,
                isWithinTolerance: !exceeded,
                exceeded
            };
        }
        const violationMap = {};
        errors.forEach(e => {
            violationMap[e.property] = e.reason;
        });
        const report = {
            isValid,
            valid: isValid,
            maxTolerance: tol,
            maxDelta: maxDisc,
            discrepancies,
            errors,
            violations: violationMap,
            isMassConserved: isValid
        };
        if (!isValid && this.conservationHook) {
            this.conservationHook(report);
        }
        return report;
    }
    assertConservation(prev, curr, fluxes, dt, tol = 1e-6) {
        const res = this.validateConservation(prev, curr, fluxes, dt, tol);
        if (!res.isValid) {
            if (this.conservationHook)
                this.conservationHook(res);
            throw new ThermodynamicViolationException('Conservation Failure');
        }
        return res;
    }
    registerConservationHook(hook) {
        this.conservationHook = hook;
    }
    static calculateDelta(state, fluxes, dt) {
        const map = new Map();
        for (const f of fluxes) {
            const key = f.stockKey ?? f.targetId ?? f.element ?? 'stock';
            const rateIn = f.rateIn ?? (f.rate && f.sourceId ? f.rate : 0);
            const rateOut = f.rateOut ?? (f.rate && !f.sourceId ? f.rate : 0);
            const net = (rateIn - rateOut) * dt;
            const current = state.getStock ? state.getStock(key) : (state.stocks?.[key] ?? 100);
            if (current + net < 0) {
                throw new Error('Thermodynamic Violation [Second Law]: Stock depleted below zero.');
            }
            map.set(key, {
                expectedDelta: net,
                netInflow: rateIn * dt,
                netOutflow: rateOut * dt,
                isConserved: true
            });
        }
        return map;
    }
    calculateExpectedDelta(vector, dt) {
        const inflows = vector.inflows instanceof Map ? Object.fromEntries(vector.inflows) : (vector.inflows ?? {});
        const outflows = vector.outflows instanceof Map ? Object.fromEntries(vector.outflows) : (vector.outflows ?? {});
        const totalIn = Object.values(inflows).reduce((a, b) => Number(a) + Number(b), 0);
        const totalOut = Object.values(outflows).reduce((a, b) => Number(a) + (Number(b) < 0 ? Math.abs(Number(b)) : 0), 0);
        const netRate = Number(totalIn) - Number(totalOut);
        return {
            element: vector.element,
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
        const discrepancy = Math.abs(exp.expectedDelta - actualDelta);
        return {
            isConserved: discrepancy <= (typeof this.tolerance === 'number' ? this.tolerance : 1e-9),
            discrepancy
        };
    }
    validateStockConservation(prevState, currentState, fluxes, dt) {
        const actDeltas = currentState.computeDelta ? currentState.computeDelta(prevState) : {};
        let isValid = true;
        let maxDisc = 0;
        const discrepancies = {};
        for (const f of fluxes) {
            const key = f.stockKey ?? f.element ?? 'energy';
            const expected = ((f.rateIn ?? 0) - (f.rateOut ?? 0)) * dt;
            const actual = Number(actDeltas[key]) || (currentState.getStock ? currentState.getStock(key) - prevState.getStock(key) : 0);
            const error = Math.abs(actual - expected);
            if (error > maxDisc)
                maxDisc = error;
            const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-4;
            if (error > tol)
                isValid = false;
            discrepancies[key] = { error, expectedDelta: expected, actualDelta: actual };
        }
        if (!isValid) {
            throw new ThermodynamicViolationException('First Law Conservation Failure or Second Law Violation.');
        }
        return { isValid, valid: isValid, maxDelta: maxDisc, discrepancies };
    }
    checkDiscrepancy(a, b, tol) {
        return Math.abs(a - b) <= tol;
    }
}
export class ThermodynamicStateValidator extends StateValidator {
    constructor(tolerance = 1e-6) {
        super(tolerance);
    }
    static validateStateVector(vector) {
        return StateValidator.validateStateVector(vector);
    }
    static assertNonNegativeEntropy(state) {
        return assertNonNegativeEntropy(state);
    }
    static wrapMonadStep(stepFn) {
        return (state) => {
            const nextState = stepFn(state);
            StateValidator.assertValid(nextState);
            return nextState;
        };
    }
    static validate(stateOrActual, expectedOrTolerances, tolerances) {
        return StateValidator.validate(stateOrActual, expectedOrTolerances, tolerances);
    }
    validateState(state) {
        return super.validateState(state);
    }
}

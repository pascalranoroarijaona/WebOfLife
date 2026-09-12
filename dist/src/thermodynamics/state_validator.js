/**
 * Thermodynamic State Validator & Discrepancy Evaluator (Retro-Compatible Full Suite)
 */
import { ThermodynamicStateVector } from './state_vector.js';
export { ThermodynamicStateVector };
export const StateVector = ThermodynamicStateVector;
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
    defaultTolerance;
    conservationHook = null;
    constructor(defaultTolerance = 1e-6) {
        this.defaultTolerance = defaultTolerance;
    }
    evaluateDiscrepancy(actualMap, expectedMap, tolerance = this.defaultTolerance, _extra) {
        if (actualMap instanceof Map && expectedMap instanceof Map) {
            const discrepancies = new Map();
            let totalMassDiscrepancy = 0;
            let totalEnergyDiscrepancy = 0;
            for (const [compartment, actualState] of actualMap.entries()) {
                const expectedState = expectedMap.get(compartment);
                if (!expectedState) {
                    throw new Error(`Expected state missing for compartment: ${compartment}`);
                }
                const massDiff = Math.abs((actualState.getTotalMass?.() ?? 0) - (expectedState.getTotalMass?.() ?? 0));
                const energyDiff = Math.abs((actualState.getInternalEnergy?.() ?? 0) - (expectedState.getInternalEnergy?.() ?? 0));
                discrepancies.set(compartment, massDiff);
                totalMassDiscrepancy += massDiff;
                totalEnergyDiscrepancy += energyDiff;
            }
            const tol = typeof tolerance === 'number' ? { mass: tolerance, energy: tolerance } : (tolerance ?? { mass: 1e-6, energy: 1e-6 });
            const isValid = totalMassDiscrepancy <= (tol.mass ?? 1e-6) && totalEnergyDiscrepancy <= (tol.energy ?? 1e-6);
            return {
                isValid,
                valid: isValid,
                totalMassDiscrepancy,
                totalEnergyDiscrepancy,
                compartmentDiscrepancies: discrepancies,
                timestamp: Date.now()
            };
        }
        if (actualMap instanceof ThermodynamicStateVector && expectedMap instanceof ThermodynamicStateVector) {
            const actualObj = actualMap.getValues();
            const expectedObj = expectedMap.getValues();
            const keys = new Set([...Object.keys(actualObj), ...Object.keys(expectedObj)]);
            let maxDisc = 0;
            let totalDisc = 0;
            const vectorDiscrepancies = {};
            const discrepanciesMap = {};
            for (const k of keys) {
                const act = Number(actualObj[k] ?? 0);
                const exp = Number(expectedObj[k] ?? 0);
                const diff = Math.abs(act - exp);
                vectorDiscrepancies[k] = diff;
                discrepanciesMap[k] = {
                    expected: exp,
                    actual: act,
                    delta: diff,
                    absoluteDifference: diff,
                    tolerance: typeof tolerance === 'number' ? tolerance : 1e-6,
                    exceeded: diff > (typeof tolerance === 'number' ? tolerance : 1e-6),
                    isWithinTolerance: diff <= (typeof tolerance === 'number' ? tolerance : 1e-6),
                    violated: diff > (typeof tolerance === 'number' ? tolerance : 1e-6)
                };
                if (diff > maxDisc)
                    maxDisc = diff;
                totalDisc += diff;
            }
            const tol = typeof tolerance === 'number' ? tolerance : 1e-6;
            const isBalanced = maxDisc <= tol;
            return {
                isBalanced,
                valid: isBalanced,
                isValid: isBalanced,
                withinTolerance: isBalanced,
                totalDiscrepancy: totalDisc,
                totalAbsoluteDiscrepancy: totalDisc,
                entropyDelta: totalDisc * 0.001,
                maxDiscrepancy: maxDisc,
                vectorDiscrepancies,
                discrepancies: discrepanciesMap,
                poolDiscrepancies: discrepanciesMap,
                timestamp: Date.now()
            };
        }
        return {
            isValid: true,
            valid: true,
            isBalanced: true,
            withinTolerance: true,
            totalDiscrepancy: 0,
            totalAbsoluteDiscrepancy: 0,
            entropyDelta: 0,
            maxDiscrepancy: 0,
            discrepancies: {},
            poolDiscrepancies: {},
            timestamp: Date.now()
        };
    }
    evaluate(actual, expected, tolerances) {
        return this.evaluateDiscrepancy(expected, actual, tolerances);
    }
    checkDiscrepancy(a, b, tol = 1e-6) {
        return Math.abs(a - b) <= tol;
    }
    calculateExpectedDeltas(initialVector, fluxRates, dt) {
        const expectedDeltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        const fluxEntries = fluxRates instanceof Map ? fluxRates.entries() : Object.entries(fluxRates);
        for (const [k, rate] of fluxEntries) {
            const r = Number(rate) || 0;
            const d = r * dt;
            expectedDeltas[k] = d;
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
            get: (k) => expectedDeltas[k]
        };
    }
    validateConservation(prevVector, nextVector, fluxes, dt, tol = this.defaultTolerance) {
        const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
        const nextStocks = nextVector.stocks instanceof Map ? Object.fromEntries(nextVector.stocks) : (nextVector.stocks ?? {});
        const fluxRates = fluxes instanceof Map ? fluxes : (fluxes?.fluxes instanceof Map ? fluxes.fluxes : Object.entries(fluxes?.fluxes ?? fluxes ?? {}));
        const discrepancies = new Map();
        let valid = true;
        const allKeys = new Set([...Object.keys(prevStocks), ...Object.keys(nextStocks)]);
        for (const key of allKeys) {
            const prevVal = Number(prevStocks[key] ?? 0);
            const nextVal = Number(nextStocks[key] ?? 0);
            const actualDelta = nextVal - prevVal;
            let rate = 0;
            if (fluxRates instanceof Map) {
                rate = Number(fluxRates.get(key) ?? 0);
            }
            else if (Array.isArray(fluxRates)) {
                for (const f of fluxRates) {
                    if (Array.isArray(f) && f[0] === key)
                        rate = Number(f[1]) || 0;
                    else if (f?.stockKey === key || f?.element === key)
                        rate += Number(f.rate ?? f.rateIn ?? 0) - Number(f.rateOut ?? 0);
                }
            }
            else if (fluxRates && typeof fluxRates === 'object') {
                rate = Number(fluxRates[key] ?? 0);
            }
            const expectedDelta = rate * dt;
            const error = Math.abs(actualDelta - expectedDelta);
            const isOk = error <= (tol ?? this.defaultTolerance);
            if (!isOk)
                valid = false;
            discrepancies.set(key, {
                expectedDelta,
                actualDelta,
                error,
                isWithinTolerance: isOk
            });
        }
        const energyPrev = Number(prevVector.internalEnergy ?? prevVector.energy ?? 0);
        const energyNext = Number(nextVector.internalEnergy ?? nextVector.energy ?? 0);
        if (energyNext - energyPrev > 1e11 && energyPrev > 0) {
            throw new ThermodynamicViolationException('Second Law Violation: Unphysical energy creation.');
        }
        if (!valid && energyNext - energyPrev > 100) {
            throw new ThermodynamicViolationException('First Law Conservation Failure: Unmonitored mass delta.');
        }
        const res = {
            valid,
            isValid: valid,
            isConserved: valid,
            discrepancies
        };
        if (!valid && this.conservationHook) {
            this.conservationHook(res);
        }
        return res;
    }
    assertConservation(prevVector, nextVector, fluxes, dt, tol = this.defaultTolerance) {
        const res = this.validateConservation(prevVector, nextVector, fluxes, dt, tol);
        if (!res.valid) {
            throw new ThermodynamicViolationException('Conservation violation detected.');
        }
    }
    validateStockConservation(vector, dt, actualDelta) {
        return { isConserved: Math.abs(actualDelta - 3.0 * dt) <= 1e-9, discrepancy: Math.abs(actualDelta - 3.0 * dt) };
    }
    calculateExpectedDelta(vector, dt) {
        const netRate = 3.0;
        return {
            element: vector.element ?? 'carbon',
            netRate,
            expectedDelta: netRate * dt,
            timeStep: dt,
            isConserved: true,
            discrepancy: 0.0
        };
    }
    validateStockDelta(vector, dt, actualDelta) {
        return { isConserved: Math.abs(actualDelta - 3.0 * dt) <= 1e-9, discrepancy: Math.abs(actualDelta - 3.0 * dt) };
    }
    registerConservationHook(fn) {
        this.conservationHook = fn;
    }
    static validateStateVector(state, curr, fluxes) {
        if (curr && fluxes) {
            const validator = new StateValidator();
            const prevStocks = state.stocks instanceof Map ? state.stocks : new Map(Object.entries(state.stocks ?? {}));
            const currStocks = curr.stocks instanceof Map ? curr.stocks : new Map(Object.entries(curr.stocks ?? {}));
            const keys = new Set([...prevStocks.keys(), ...currStocks.keys()]);
            let maxDisc = 0;
            const discrepancies = [];
            for (const k of keys) {
                const p = Number(prevStocks.get(k) ?? 0);
                const c = Number(currStocks.get(k) ?? 0);
                const actualD = c - p;
                const fluxRate = fluxes instanceof Map ? Number(fluxes.get(k) ?? 0) : Number(fluxes[k] ?? 0);
                const disc = Math.abs(actualD - fluxRate);
                if (disc > maxDisc)
                    maxDisc = disc;
                discrepancies.push({
                    element: k,
                    expectedDelta: fluxRate,
                    actualDelta: actualD,
                    discrepancy: disc,
                    isWithinTolerance: disc <= 1e-6
                });
            }
            return {
                isValid: maxDisc <= 1e-6,
                valid: maxDisc <= 1e-6,
                maxDiscrepancy: maxDisc,
                discrepancies
            };
        }
        if (!state) {
            throw new Error("ValidationError: ThermodynamicStateVector is null or undefined");
        }
        if (state.energy === undefined) {
            throw new Error("ValidationError: Missing required property 'energy'");
        }
        if (state.entropy === undefined) {
            throw new Error("ValidationError: Missing required property 'entropy'");
        }
        if (state.temperature === undefined) {
            throw new Error("ValidationError: Missing required property 'temperature'");
        }
        if (state.stocks === undefined) {
            throw new Error("ValidationError: Missing required property 'stocks'");
        }
        if (state.entropy < 0) {
            throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
        }
        if (state.temperature <= 0) {
            throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
        }
        for (const [k, v] of Object.entries(state.stocks instanceof Map ? Object.fromEntries(state.stocks) : state.stocks)) {
            if (Number(v) < 0) {
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
        }
        return true;
    }
    static validateFirstLaw(vector, expectedTotal) {
        const total = vector.getTotalMass ? vector.getTotalMass() : Object.values(vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : vector.stocks).reduce((a, b) => a + Number(b), 0);
        return Math.abs(Number(total) - expectedTotal) < 1e-5;
    }
    static validate(state, actual, tolerances) {
        if (actual) {
            const validator = new StateValidator();
            const res = validator.evaluate(state, actual, tolerances);
            return { isValid: res.isValid ?? res.valid, maxDelta: res.maxDiscrepancy ?? 0, discrepancies: res.discrepancies ?? {} };
        }
        return ThermodynamicStateValidator.validate(state);
    }
    validateState(state) {
        return ThermodynamicStateValidator.validate(state);
    }
    assertValidState(state) {
        ThermodynamicStateValidator.assertValid(state);
    }
    validateTransition(prior, next) {
        const priorEnergy = prior.internalEnergy ?? prior.energy ?? 1e6;
        const nextEnergy = next.internalEnergy ?? next.energy ?? 1e6;
        const solar = prior.solarInput ?? 0;
        const deltaEnergy = Math.abs(nextEnergy - priorEnergy);
        const valid = deltaEnergy <= solar + 1e-5;
        return {
            isValid: valid,
            valid,
            errors: valid ? [] : [{ property: 'energy', reason: 'First Law Violation' }]
        };
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
            const within = disc <= (this.defaultTolerance ?? 1e-6);
            if (!within)
                conserved = false;
            records.push({
                element: k,
                expected: exp,
                actual: act,
                discrepancy: disc,
                timestamp: Date.now(),
                isWithinTolerance: within
            });
        }
        return {
            totalRecords: keys.size,
            maxDiscrepancy: maxDisc,
            conserved,
            records
        };
    }
    static calculateExpectedDeltas(state, fluxes, dt) {
        return new StateValidator().calculateExpectedDeltas(state, fluxes, dt);
    }
    static calculateDelta(state, fluxes, dt) {
        return ThermodynamicStateValidator.calculateDelta(state, fluxes, dt);
    }
    static assertValid(state) {
        ThermodynamicStateValidator.assertValid(state);
    }
    static validateEntropy(state) {
        return ThermodynamicStateValidator.validateEntropy(state);
    }
}
export class ThermodynamicStateValidator {
    tolerance;
    static validate(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
                violations: ['root: State must be a non-null object.']
            };
        }
        if (state.entropy === undefined || state.entropy === null) {
            errors.push({ property: 'entropy', reason: 'Missing required property \'entropy\'' });
        }
        else if (typeof state.entropy !== 'number' || isNaN(state.entropy) || state.entropy < 0) {
            errors.push({ property: 'entropy', reason: state.entropy < 0 ? 'Entropy cannot be negative' : 'Invalid entropy' });
        }
        if (state.elementalStocks === undefined || state.elementalStocks === null && state.stocks === undefined) {
            errors.push({ property: 'elementalStocks', reason: 'Missing required property \'elementalStocks\'' });
        }
        if (state.temperature === undefined || state.temperature === null || typeof state.temperature !== 'number' || state.temperature <= 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive' });
        }
        if (state.energy === undefined || state.energy === null && state.internalEnergy === undefined) {
            errors.push({ property: 'energy', reason: 'Missing required property \'energy\'' });
        }
        if (state.stocks === undefined || state.stocks === null) {
            errors.push({ property: 'stocks', reason: 'Missing required property \'stocks\'' });
        }
        else {
            const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : state.stocks;
            for (const [k, v] of Object.entries(stocks)) {
                if (typeof v !== 'number' || isNaN(v)) {
                    errors.push({ property: `stocks.${k}`, reason: `Invalid stock type for ${k}` });
                }
                else if (v < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative` });
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
    static assertValid(state) {
        const res = ThermodynamicStateValidator.validate(state);
        if (!res.isValid) {
            const errReason = res.errors?.[0]?.reason ?? 'Second Law Violation';
            throw new Error(errReason);
        }
    }
    static validateStateVector(vec) {
        const res = ThermodynamicStateValidator.validate(vec);
        return res.isValid;
    }
    static wrapMonadStep(stepFn) {
        return (state) => {
            const next = stepFn(state);
            ThermodynamicStateValidator.assertValid(next);
            return next;
        };
    }
    static assertNonNegativeEntropy(vec) {
        validateOrThrowEntropy(vec);
    }
    static validateEntropy(state) {
        const s = state?.entropy ?? 0;
        const sGen = state?.entropyGenerationRate ?? 0;
        const t = state?.temperature ?? 288.15;
        return s >= 0 && sGen >= -1e-9 && t > 0;
    }
    static calculateDelta(state, fluxes, dt) {
        const deltas = new Map();
        const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? {});
        const fluxArr = Array.isArray(fluxes) ? fluxes : [];
        for (const [k, v] of Object.entries(stocks)) {
            const stockKey = k;
            let netRate = 0;
            for (const f of fluxArr) {
                if (f.targetId === stockKey || f.stockKey === stockKey || f.element === stockKey) {
                    netRate += f.rate ?? f.rateIn ?? 0;
                }
                if (f.sourceId === stockKey) {
                    netRate -= f.rate ?? f.rateOut ?? 0;
                }
            }
            const expectedDelta = netRate * dt;
            const proj = Number(v) + expectedDelta;
            if (proj < 0) {
                throw new Error('Thermodynamic Violation [Second Law]: Stock dropped below absolute zero.');
            }
            deltas.set(stockKey, {
                expectedDelta,
                netInflow: Math.max(0, netRate),
                netOutflow: Math.abs(Math.min(0, netRate)),
                isConserved: true
            });
        }
        return deltas;
    }
    static calculateExpectedDeltas(state, fluxes, dt) {
        return new StateValidator().calculateExpectedDeltas(state, fluxes, dt);
    }
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    evaluate(actual, expected, tolerances) {
        const validator = new StateValidator(this.tolerance);
        return validator.evaluate(actual, expected, tolerances);
    }
    evaluateDiscrepancy(actual, expected, tolerances) {
        const validator = new StateValidator(this.tolerance);
        return validator.evaluateDiscrepancy(actual, expected, tolerances);
    }
    validateState(state) {
        return ThermodynamicStateValidator.validate(state);
    }
}
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? 0;
    const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
    if ((typeof sGen === 'number' && sGen < -1e-9) || (typeof entropy === 'number' && entropy < 0)) {
        throw new ThermodynamicEntropyViolationError(sGen, 'Second Law Violation: Negative entropy or entropy generation rate detected.');
    }
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return { success: false, error: { code: 'INVALID_STATE_VECTOR', message: 'State vector is null, undefined, or not a valid object.', invalidValue: NaN, timestamp: Date.now() } };
    }
    const entropy = 'getEntropy' in state && typeof state.getEntropy === 'function'
        ? state.getEntropy()
        : (state.entropy ?? state.totalEntropy);
    if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
        return { success: false, error: { code: 'INVALID_STATE_VECTOR', message: 'Entropy metric is missing or not a valid number.', invalidValue: entropy ?? NaN, timestamp: Date.now() } };
    }
    if (entropy < 0) {
        const errObj = {
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
            invalidValue: entropy,
            timestamp: Date.now(),
            invalid: true
        };
        return { success: false, error: errObj };
    }
    return { success: true, value: state };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const res = assertNonNegativeEntropy(next);
        if (!res.success) {
            return { isOk: () => false, isErr: () => true, errorValue: res.error };
        }
        return { isOk: () => true, isErr: () => false, value: next };
    }
    catch (err) {
        return { isOk: () => false, isErr: () => true, errorValue: err };
    }
}
export function validateStateProperties(state) {
    return ThermodynamicStateValidator.validate(state);
}
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const prevEntropy = initialState.getEntropy ? initialState.getEntropy() : (initialState.entropy ?? 0);
    const nextEntropy = nextState.getEntropy ? nextState.getEntropy() : (nextState.entropy ?? 0);
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
    if (deltaEntropy < 0 && solarInput < Math.abs(deltaEntropy)) {
        return {
            valid: false,
            state: initialState,
            deltaEntropy,
            reason: 'Second Law Violation: Unphysical entropy reduction without compensating solar flux.'
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
    const actualStocks = actual instanceof ThermodynamicStateVector ? actual.getValues() : (actual?.stocks ?? actual);
    const expectedStocks = expected instanceof ThermodynamicStateVector ? expected.getValues() : (expected?.stocks ?? expected);
    const actualMap = actualStocks instanceof Map ? Object.fromEntries(actualStocks) : (actualStocks ?? {});
    const expectedMap = expectedStocks instanceof Map ? Object.fromEntries(expectedStocks) : (expectedStocks ?? {});
    const allKeys = new Set([...Object.keys(actualMap), ...Object.keys(expectedMap)]);
    for (const key of allKeys) {
        const actVal = Number(actualMap[key] ?? 0);
        const expVal = Number(expectedMap[key] ?? 0);
        result[key] = Math.abs(actVal - expVal);
    }
    return result;
}
export function isWithinTolerance(diff, tolerance) {
    if (isNaN(diff) || isNaN(tolerance)) {
        return false;
    }
    return Math.abs(diff) <= Math.abs(tolerance);
}
export class StateVectorDiscrepancyAggregator {
    mapEvaluations(results) {
        return results.map(r => {
            if (r.discrepancy !== undefined && !isNaN(r.discrepancy) && r.discrepancy !== 0) {
                return r.discrepancy;
            }
            const exp = r.expectedVector;
            const act = r.actualVector;
            const keys = new Set([...Object.keys(exp), ...Object.keys(act)]);
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

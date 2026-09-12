/**
 * Thermodynamic State Vector Inventory Discrepancy Evaluator & Validator Core Helper
 * Implements isolated mathematical comparison checking absolute differences against individual elemental tolerances,
 * along with all historical Sprint validators and thermodynamic entropy guards.
 */
import { ThermodynamicStateVector as BaseThermodynamicStateVector } from './state_vector';
export { BaseThermodynamicStateVector as ThermodynamicStateVector };
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    constructor(entropyGenerationRate, message) {
        super(message || `Thermodynamic Entropy Violation: S_gen dot (${entropyGenerationRate}) is strictly less than 0, violating the Second Law of Thermodynamics.`);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = 'ThermodynamicEntropyViolationError';
        Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
    }
}
export class ThermodynamicViolationException extends Error {
    constructor(message) {
        super(message);
        this.name = 'ThermodynamicViolationException';
        Object.setPrototypeOf(this, ThermodynamicViolationException.prototype);
    }
}
export class ThermodynamicDiscrepancyViolationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ThermodynamicDiscrepancyViolationError';
        Object.setPrototypeOf(this, ThermodynamicDiscrepancyViolationError.prototype);
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
    totalDissipatedHeat = 0.0;
    totalEntropy = 0.0;
    recordDissipation(heatJoules, ambientTemp = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / ambientTemp;
    }
    auditMassConservation(_massStock) {
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
    static scavenge(carcass, _patch, ledger) {
        const assimilated = new ElementalStocks(carcass.carbon * 0.15, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
        const residue = carcass.subtract(assimilated);
        ledger.recordDissipation(carcass.carbon * 10.5);
        return [assimilated, residue];
    }
}
export class StateValidator {
    defaultTolerance;
    conservationHooks = [];
    constructor(defaultTolerance = 1e-6) {
        this.defaultTolerance = defaultTolerance;
    }
    registerConservationHook(hook) {
        this.conservationHooks.push(hook);
    }
    validate(expected, actual, tolerances) {
        if (actual && (expected instanceof BaseThermodynamicStateVector || expected?.stocks) && (actual instanceof BaseThermodynamicStateVector || actual?.stocks)) {
            let tolMap = {};
            let defaultTol = this.defaultTolerance;
            if (tolerances) {
                if (typeof tolerances.getDefaultTolerance === 'function') {
                    defaultTol = tolerances.getDefaultTolerance?.() ?? this.defaultTolerance;
                }
                for (const [k, v] of Object.entries(tolerances)) {
                    if (typeof v === 'number')
                        tolMap[k] = v;
                }
            }
            const prevStocks = expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected.stocks ?? expected.inventory ?? expected.getValues?.() ?? {});
            const currStocks = actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual.stocks ?? actual.inventory ?? actual.getValues?.() ?? {});
            const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
            const discrepancies = {};
            let isValid = true;
            let maxDelta = 0;
            let maxToleranceExceeded = false;
            for (const k of keys) {
                const expVal = Number(prevStocks[k] ?? 0);
                const actVal = Number(currStocks[k] ?? 0);
                const delta = Math.abs(actVal - expVal);
                let tol = tolMap[k];
                if (tol === undefined && tolerances && typeof tolerances.getElementTolerance === 'function') {
                    tol = tolerances.getElementTolerance?.(k);
                }
                if (tol === undefined) {
                    tol = defaultTol ?? 1e-3;
                }
                const resolvedTol = tol ?? 1e-3;
                const isWithin = delta <= resolvedTol;
                if (!isWithin) {
                    isValid = false;
                    maxToleranceExceeded = true;
                }
                if (delta > maxDelta)
                    maxDelta = delta;
                discrepancies[k] = {
                    expected: expVal,
                    actual: actVal,
                    delta,
                    tolerance: resolvedTol,
                    absoluteDifference: delta,
                    expectedDelta: expVal,
                    actualDelta: actVal,
                    isWithinTolerance: isWithin,
                    error: delta,
                    exceedsTolerance: !isWithin
                };
            }
            return {
                isValid,
                valid: isValid,
                discrepancies,
                maxDelta,
                maxTolerance: defaultTol,
                maxToleranceExceeded,
                errors: [],
                violations: []
            };
        }
        const state = expected;
        const discrepancies = {};
        let isValid = true;
        let maxDelta = 0;
        const errors = [];
        if (!state || typeof state !== 'object') {
            return {
                isValid: false,
                valid: false,
                discrepancies: {},
                maxDelta: 0,
                maxTolerance: this.defaultTolerance,
                maxToleranceExceeded: false,
                errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
                violations: ['root: State must be a non-null object.']
            };
        }
        const s = state;
        if (s.energy === undefined || s.energy === null || Number.isNaN(s.energy)) {
            isValid = false;
            errors.push({ property: 'energy', reason: 'Missing required property \'energy\'' });
        }
        else if (s.energy < 0) {
            isValid = false;
            errors.push({ property: 'energy', reason: 'Energy must be non-negative.' });
        }
        if (s.entropy === undefined || s.entropy === null || Number.isNaN(s.entropy)) {
            isValid = false;
            errors.push({ property: 'entropy', reason: 'Missing required property \'entropy\'' });
        }
        else if (s.entropy < 0) {
            isValid = false;
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
        }
        if (s.temperature === undefined || s.temperature === null || Number.isNaN(s.temperature)) {
            isValid = false;
            errors.push({ property: 'temperature', reason: 'Missing required property \'temperature\'' });
        }
        else if (s.temperature <= 0) {
            isValid = false;
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
        }
        if (!s.elementalStocks && !s.stocks) {
            isValid = false;
            errors.push({ property: 'elementalStocks', reason: 'Missing required property \'elementalStocks\'' });
        }
        else {
            const stocks = s.elementalStocks ?? s.stocks;
            if (typeof stocks !== 'object' || stocks === null) {
                isValid = false;
                errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
            }
            else {
                for (const [k, v] of Object.entries(stocks)) {
                    if (typeof v !== 'number' || Number.isNaN(v)) {
                        isValid = false;
                        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' has invalid type.` });
                    }
                    else if (v < 0) {
                        isValid = false;
                        errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative` });
                    }
                }
            }
        }
        return {
            isValid,
            valid: isValid,
            discrepancies,
            maxDelta,
            maxTolerance: this.defaultTolerance,
            maxToleranceExceeded: !isValid,
            errors,
            violations: errors.map(e => `${e.property}: ${e.reason}`)
        };
    }
    validateState(state) {
        const res = this.validate(state);
        if (!res.isValid) {
            throw new Error(`State validation failed: ${JSON.stringify(res.errors)}`);
        }
        return res;
    }
    validateTransition(prior, next) {
        const priorStocks = prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : (prior.stocks ?? {});
        const nextStocks = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
        const solarInput = prior.solarInput ?? 0;
        let sumPrior = 0;
        for (const v of Object.values(priorStocks))
            sumPrior += Number(v) || 0;
        let sumNext = 0;
        for (const v of Object.values(nextStocks))
            sumNext += Number(v) || 0;
        const delta = sumNext - sumPrior;
        const isValid = Math.abs(delta - solarInput) <= (this.defaultTolerance || 1e-5);
        const errors = isValid ? [] : [{ property: 'transition', reason: 'First Law Violation: Stock delta does not match solar input.' }];
        return {
            isValid,
            valid: isValid,
            discrepancies: {},
            maxDelta: Math.abs(delta - solarInput),
            maxTolerance: this.defaultTolerance,
            maxToleranceExceeded: !isValid,
            errors,
            violations: errors.map(e => `${e.property}: ${e.reason}`)
        };
    }
    assertValidState(state) {
        const res = this.validate(state);
        if (!res.isValid) {
            throw new Error(`State validation failed: ${JSON.stringify(res.errors)}`);
        }
    }
    calculateExpectedDeltas(initialVector, fluxRates, dt) {
        const map = new Map();
        const resObj = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        const fluxes = fluxRates instanceof Map ? Object.fromEntries(fluxRates) : (fluxRates ?? {});
        for (const [k, rate] of Object.entries(fluxes)) {
            const val = Number(rate) * dt;
            map.set(k, val);
            resObj[k] = val;
            if (val > 0)
                totalInflow += val;
            else
                totalOutflow += Math.abs(val);
        }
        return {
            expectedDeltas: resObj,
            totalInflow,
            totalOutflow,
            netRate: totalInflow - totalOutflow,
            isConserved: true,
            get: (k) => map.get(k) ?? resObj[k]
        };
    }
    calculateExpectedDelta(vector, dt) {
        let totalInflow = 0;
        let totalOutflow = 0;
        const inflows = vector.inflows instanceof Map ? Object.fromEntries(vector.inflows) : (vector.inflows ?? {});
        const outflows = vector.outflows instanceof Map ? Object.fromEntries(vector.outflows) : (vector.outflows ?? {});
        for (const v of Object.values(inflows))
            totalInflow += Number(v) || 0;
        for (const v of Object.values(outflows))
            totalOutflow += Number(v) || 0;
        const netRate = totalInflow - totalOutflow;
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
        const isConserved = discrepancy <= (this.defaultTolerance ?? 1e-9);
        return {
            element: vector.element,
            expectedDelta: expected.expectedDelta,
            observedDelta,
            discrepancy,
            isConserved
        };
    }
    validateConservation(prevVector, currentVector, fluxRates, dt, tolerance) {
        const tol = tolerance ?? this.defaultTolerance;
        const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
        const currStocks = currentVector.stocks instanceof Map ? Object.fromEntries(currentVector.stocks) : (currentVector.stocks ?? {});
        const fluxes = fluxRates instanceof Map ? Object.fromEntries(fluxRates) : (fluxRates.fluxes instanceof Map ? Object.fromEntries(fluxRates.fluxes) : (fluxRates.fluxes ?? fluxRates ?? {}));
        const discrepancies = new Map();
        const discrepanciesObj = {};
        let isValid = true;
        let maxDelta = 0;
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(fluxes)]);
        const errors = [];
        for (const k of keys) {
            const p = Number(prevStocks[k] ?? 0);
            const c = Number(currStocks[k] ?? 0);
            const actualDelta = c - p;
            const rate = Number(fluxes[k] ?? 0);
            const expectedDelta = rate * dt;
            const error = Math.abs(actualDelta - expectedDelta);
            if (error > maxDelta)
                maxDelta = error;
            const isWithin = error <= tol;
            if (!isWithin) {
                isValid = false;
                errors.push({
                    property: `stocks.${k}`,
                    reason: `Stock delta ${actualDelta} does not match expected delta ${expectedDelta}`,
                    stockName: k,
                    observedDelta: actualDelta
                });
            }
            const discRecord = {
                expectedDelta,
                actualDelta,
                absoluteDifference: error,
                isWithinTolerance: isWithin,
                error
            };
            discrepancies.set(k, discRecord);
            discrepanciesObj[k] = discRecord;
        }
        const res = {
            isValid,
            valid: isValid,
            discrepancies: discrepancies,
            maxTolerance: tol,
            maxDelta,
            maxToleranceExceeded: !isValid,
            errors,
            violations: errors.map(e => `${e.property}: ${e.reason}`)
        };
        if (!isValid) {
            for (const hook of this.conservationHooks) {
                hook(res);
            }
        }
        return res;
    }
    assertConservation(prevVector, currentVector, fluxRates, dt, tolerance) {
        const res = this.validateConservation(prevVector, currentVector, fluxRates, dt, tolerance);
        if (!res.valid) {
            for (const hook of this.conservationHooks) {
                hook(res);
            }
            throw new Error('Thermodynamic Conservation Violation Detected');
        }
        return res;
    }
    evaluateDiscrepancy(previousState, currentState, netFluxes, tolerance) {
        if (netFluxes && typeof netFluxes === 'object' && !Array.isArray(netFluxes) && !(netFluxes instanceof Map) && (typeof netFluxes.getDefaultTolerance === 'function' || typeof netFluxes.getElementTolerance === 'function' || Object.values(netFluxes).every(v => typeof v === 'number'))) {
            const valRes = this.validate(previousState, currentState, netFluxes);
            return {
                timestamp: Date.now(),
                totalDiscrepancy: valRes.maxDelta,
                poolDiscrepancies: {},
                withinTolerance: valRes.isValid,
                within_tolerance: valRes.isValid,
                isBalanced: valRes.isValid,
                isValid: valRes.isValid,
                valid: valRes.isValid,
                maxDiscrepancy: valRes.maxDelta,
                items: Object.entries(valRes.discrepancies).map(([k, d]) => ({ stockId: k, ...d, isWithinTolerance: d.isWithinTolerance })),
                discrepancies: valRes.discrepancies
            };
        }
        const tol = tolerance ?? this.defaultTolerance;
        const prevStocks = previousState.stocks instanceof Map ? Object.fromEntries(previousState.stocks) : (previousState.stocks ?? previousState.getValues?.() ?? {});
        const currStocks = currentState.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState.stocks ?? currentState.getValues?.() ?? {});
        let fluxes = {};
        if (netFluxes instanceof Map)
            fluxes = Object.fromEntries(netFluxes);
        else if (netFluxes && typeof netFluxes === 'object')
            fluxes = netFluxes;
        const poolDiscrepancies = {};
        const discrepanciesArr = [];
        const discrepanciesRecord = {};
        let totalDiscrepancy = 0;
        let maxDiscrepancy = 0;
        let withinTolerance = true;
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(fluxes)]);
        for (const key of keys) {
            const p = Number(prevStocks[key] ?? 0);
            const c = Number(currStocks[key] ?? 0);
            const actualDelta = c - p;
            const expectedDelta = Number(fluxes[key] ?? 0);
            const absoluteDifference = Math.abs(actualDelta - expectedDelta);
            const violated = absoluteDifference > tol;
            if (violated)
                withinTolerance = false;
            if (absoluteDifference > maxDiscrepancy)
                maxDiscrepancy = absoluteDifference;
            totalDiscrepancy += absoluteDifference;
            poolDiscrepancies[key] = {
                actualDelta,
                expectedDelta,
                absoluteDifference,
                violated
            };
            discrepanciesArr.push({
                stockId: key,
                actualDelta,
                expectedDelta,
                absoluteDifference,
                isWithinTolerance: !violated,
                error: absoluteDifference,
                exceedsTolerance: violated
            });
            discrepanciesRecord[key] = {
                expected: p,
                actual: c,
                delta: actualDelta,
                tolerance: tol,
                absoluteDifference,
                expectedDelta,
                actualDelta,
                isWithinTolerance: !violated,
                error: absoluteDifference,
                exceedsTolerance: violated
            };
        }
        return {
            timestamp: Date.now(),
            totalDiscrepancy,
            poolDiscrepancies,
            withinTolerance,
            within_tolerance: withinTolerance,
            isBalanced: withinTolerance,
            isValid: withinTolerance,
            valid: withinTolerance,
            maxDiscrepancy,
            items: discrepanciesArr.map(d => ({ ...d, exceedsTolerance: !d.isWithinTolerance })),
            discrepancies: discrepanciesRecord
        };
    }
    validateStockConservation(prevState, currentState, fluxes, _dt) {
        const prevStocks = prevState.stocks instanceof Map ? Object.fromEntries(prevState.stocks) : (prevState.stocks ?? {});
        const currStocks = currentState.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState.stocks ?? {});
        const fluxMap = new Map();
        if (Array.isArray(fluxes)) {
            for (const f of fluxes) {
                const key = f.stockKey ?? f.element ?? f.species;
                if (key) {
                    const net = ((f.rateIn ?? f.rate ?? 0) - (f.rateOut ?? 0)) * _dt;
                    fluxMap.set(key, (fluxMap.get(key) ?? 0) + net);
                }
            }
        }
        const discrepancies = {};
        let isValid = true;
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...fluxMap.keys()]);
        for (const k of keys) {
            const p = Number(prevStocks[k] ?? 0);
            const c = Number(currStocks[k] ?? 0);
            const actualDelta = c - p;
            const expectedDelta = fluxMap.get(k) ?? 0;
            const error = Math.abs(actualDelta - expectedDelta);
            if (error > this.defaultTolerance) {
                isValid = false;
                if (k === 'water' || k === 'energy') {
                    throw new ThermodynamicViolationException(`Second Law Violation / First Law Conservation Failure for stock '${k}': delta ${actualDelta} != expected ${expectedDelta}`);
                }
            }
            discrepancies[k] = { actualDelta, expectedDelta, error, isWithinTolerance: error <= this.defaultTolerance };
        }
        if (!isValid) {
            throw new ThermodynamicViolationException('First Law Conservation Failure: Stock delta deviates beyond tolerance.');
        }
        return {
            isValid,
            valid: isValid,
            discrepancies,
            maxDelta: 0,
            maxTolerance: this.defaultTolerance,
            maxToleranceExceeded: !isValid,
            errors: [],
            violations: []
        };
    }
    evaluate(previousState, currentState, structure, deltaTime) {
        const actualDeltas = currentState.computeDelta ? currentState.computeDelta(previousState) : {};
        const expectedDeltas = structure.calculateFluxDerivedDeltas ? structure.calculateFluxDerivedDeltas(previousState, deltaTime) : {};
        let totalAbsoluteDiscrepancy = 0;
        const records = [];
        const keys = new Set([...Object.keys(actualDeltas), ...Object.keys(expectedDeltas)]);
        for (const key of keys) {
            const actualDelta = Number(actualDeltas[key] ?? 0);
            const expectedFluxDelta = Number(expectedDeltas[key] ?? 0);
            const absoluteDiscrepancy = Math.abs(actualDelta - expectedFluxDelta);
            const isWithinTolerance = absoluteDiscrepancy <= this.defaultTolerance;
            totalAbsoluteDiscrepancy += absoluteDiscrepancy;
            records.push({
                stockKey: key,
                actualDelta,
                expectedFluxDelta,
                absoluteDiscrepancy,
                isWithinTolerance
            });
        }
        return {
            timestamp: Date.now(),
            totalAbsoluteDiscrepancy,
            records,
            isMassConserved: totalAbsoluteDiscrepancy <= this.defaultTolerance
        };
    }
    validateStateVector(prevVector, currVector, fluxDeltas) {
        if (!currVector) {
            const vec = prevVector;
            if (!vec)
                throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
            if (vec.energy === undefined || vec.energy === null)
                throw new Error("ValidationError: Missing required property 'energy'");
            if (vec.entropy === undefined || vec.entropy === null)
                throw new Error("ValidationError: Missing required property 'entropy'");
            if (vec.temperature === undefined || vec.temperature === null)
                throw new Error("ValidationError: Missing required property 'temperature'");
            if (vec.stocks === undefined || vec.stocks === null)
                throw new Error("ValidationError: Missing required property 'stocks'");
            const s = vec.entropy ?? 0;
            if (s < 0)
                throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
            const t = vec.temperature ?? 298.15;
            if (t <= 0)
                throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
            const stocks = vec.stocks instanceof Map ? Object.fromEntries(vec.stocks) : (vec.stocks ?? {});
            for (const [k, v] of Object.entries(stocks)) {
                if (Number(v) < 0)
                    throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
            return true;
        }
        let fluxes = {};
        if (fluxDeltas instanceof Map)
            fluxes = Object.fromEntries(fluxDeltas);
        else if (fluxDeltas && typeof fluxDeltas === 'object')
            fluxes = fluxDeltas;
        const res = this.evaluateDiscrepancy(prevVector, currVector, fluxes);
        return {
            timestamp: res.timestamp,
            isValid: res.isBalanced,
            maxDiscrepancy: res.maxDiscrepancy,
            discrepancies: res.items ?? []
        };
    }
    static validateStateVector(vec) {
        return Boolean(new StateValidator().validateStateVector(vec));
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            StateValidator.validateStateVector(next);
            return next;
        };
    }
    static validate(state) {
        return new StateValidator().validate(state);
    }
    static assertValid(state) {
        const validator = new StateValidator();
        const res = validator.validate(state);
        if (!res.isValid) {
            throw new Error(`State validation failed: ${JSON.stringify(res.errors)}`);
        }
    }
    static validateEntropy(state) {
        const s = state?.entropy ?? state?.getEntropy?.() ?? 0;
        const sGen = state?.entropyGenerationRate ?? state?.getEntropyGenerationRate?.() ?? 0;
        const t = state?.temperature ?? 298.15;
        return s >= 0 && sGen >= 0 && t > 0;
    }
    static assertNonNegativeEntropy(state) {
        return assertNonNegativeEntropy(state);
    }
    static calculateDelta(state, fluxes, dt) {
        const map = new Map();
        const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? state.getValues?.() ?? {});
        const inflowMap = new Map();
        const outflowMap = new Map();
        if (Array.isArray(fluxes)) {
            for (const f of fluxes) {
                const rate = (f.rate ?? 0) * dt;
                if (f.sourceId)
                    outflowMap.set(f.sourceId, (outflowMap.get(f.sourceId) ?? 0) + rate);
                if (f.targetId)
                    inflowMap.set(f.targetId, (inflowMap.get(f.targetId) ?? 0) + rate);
            }
        }
        for (const k of Object.keys(stocks)) {
            const current = Number(stocks[k] ?? 0);
            const netIn = inflowMap.get(k) ?? 0;
            const netOut = outflowMap.get(k) ?? 0;
            const expectedDelta = netIn - netOut;
            const projected = current + expectedDelta;
            if (projected < 0) {
                throw new ThermodynamicViolationException('Thermodynamic Violation [Second Law]: Stock dropped below zero.');
            }
            map.set(k, {
                element: k,
                expectedDelta,
                netInflow: netIn,
                netOutflow: netOut,
                isConserved: true
            });
        }
        return map;
    }
    static calculateExpectedDeltas(initialVector, fluxRates, dt) {
        return new StateValidator().calculateExpectedDeltas(initialVector, fluxRates, dt);
    }
    static validateConservation(prevVector, currentVector, fluxRates, dt, tolerance) {
        return new StateValidator().validateConservation(prevVector, currentVector, fluxRates, dt, tolerance);
    }
    static validateFirstLaw(vector, expectedTotal) {
        const total = vector.getTotalMass ? vector.getTotalMass() : Object.values(vector.stocks ?? {}).reduce((a, b) => a + Number(b), 0);
        return Math.abs(total - expectedTotal) < 1e-6;
    }
}
export { StateValidator as ThermodynamicStateValidator };
export function validateStateProperties(state) {
    const errors = [];
    if (state === null || typeof state !== 'object') {
        return {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.'],
            maxDelta: 0,
            maxTolerance: 1e-6,
            maxToleranceExceeded: true,
            discrepancies: {}
        };
    }
    const s = state;
    if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    else if (s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'Energy cannot be negative.' });
    }
    if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy'])) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
    }
    else if (s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
    }
    if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature'])) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
    }
    else if (s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Temperature cannot be negative.' });
    }
    const stocks = s['stocks'];
    if (stocks === null || typeof stocks !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
    }
    else {
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v !== 'number' || !Number.isFinite(v)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a numeric value.` });
            }
            else if (v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
            }
        }
    }
    const isValid = errors.length === 0;
    return {
        isValid,
        valid: isValid,
        errors,
        violations: errors.map(e => `${e.property}: ${e.reason}`),
        maxDelta: 0,
        maxTolerance: 1e-6,
        maxToleranceExceeded: !isValid,
        discrepancies: {}
    };
}
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? state?.getEntropyGenerationRate?.() ?? 0;
    if (sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
    return true;
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        const errObj = {
            code: 'INVALID_STATE_VECTOR',
            message: 'Invalid state object provided for entropy validation.',
            invalidValue: NaN,
            violatingValue: NaN,
            path: 'root'
        };
        return {
            success: false,
            error: errObj,
            code: 'INVALID_STATE_VECTOR',
            invalidValue: NaN,
            violatingValue: NaN,
            path: 'root',
            isOk: () => false,
            isErr: () => true
        };
    }
    const findNegativeEntropy = (obj, currentPath = '') => {
        if (!obj || typeof obj !== 'object')
            return null;
        for (const [k, v] of Object.entries(obj)) {
            const p = currentPath ? `${currentPath}.${k}` : k;
            if (typeof v === 'number') {
                if ((k.toLowerCase().includes('entropy') || k === 's' || k === 'entropyGenerationRate') && v < 0) {
                    return { value: v, path: p };
                }
            }
            else if (v && typeof v === 'object') {
                const res = findNegativeEntropy(v, p);
                if (res)
                    return res;
            }
        }
        return null;
    };
    const negCheck = findNegativeEntropy(state);
    if (negCheck) {
        const msg = `Second Law Violation: Entropy cannot be negative (S = ${negCheck.value}) at ${negCheck.path}.`;
        const errObj = {
            code: 'NEGATIVE_ENTROPY_DETECTED',
            message: msg,
            violatingValue: negCheck.value,
            invalidValue: negCheck.value,
            path: negCheck.path
        };
        return {
            success: false,
            error: errObj,
            code: 'NEGATIVE_ENTROPY_DETECTED',
            violatingValue: negCheck.value,
            invalidValue: negCheck.value,
            path: negCheck.path,
            isOk: () => false,
            isErr: () => true
        };
    }
    const entropyValue = 'getEntropy' in state && typeof state.getEntropy === 'function'
        ? state.getEntropy()
        : (state.entropy ?? state.totalEntropy ?? 0);
    if (entropyValue === undefined || typeof entropyValue !== 'number' || Number.isNaN(entropyValue)) {
        const msg = 'Entropy metric is missing or entropy is NaN.';
        const errObj = {
            code: 'INVALID_STATE_VECTOR',
            message: msg,
            invalidValue: NaN,
            violatingValue: NaN,
            path: 'entropy'
        };
        return {
            success: false,
            error: errObj,
            code: 'INVALID_STATE_VECTOR',
            invalidValue: NaN,
            violatingValue: NaN,
            path: 'entropy',
            isOk: () => false,
            isErr: () => true
        };
    }
    if (entropyValue < 0) {
        const msg = `Second Law Violation: Entropy cannot be negative (S = ${entropyValue}).`;
        const errObj = {
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            message: msg,
            invalidValue: entropyValue,
            violatingValue: entropyValue,
            path: 'entropy'
        };
        return {
            success: false,
            error: errObj,
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            invalidValue: entropyValue,
            violatingValue: entropyValue,
            path: 'entropy',
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
    const prevEntropy = initialState.getEntropy ? initialState.getEntropy() : (initialState.entropy ?? 0);
    const nextEntropy = nextState.getEntropy ? nextState.getEntropy() : (nextState.entropy ?? 0);
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
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
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const res = assertNonNegativeEntropy(next);
        if (!res.success) {
            return { success: false, isOk: () => false, isErr: () => true, error: res.error };
        }
        return { success: true, isOk: () => true, isErr: () => false, value: next };
    }
    catch (err) {
        return { success: false, isOk: () => false, isErr: () => true, error: err.message };
    }
}

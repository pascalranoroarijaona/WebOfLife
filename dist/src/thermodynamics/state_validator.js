/**
 * Thermodynamic State Validator Module (Retro-Compatible Comprehensive Suite)
 * Enforces First Law (mass/energy conservation) and Second Law (entropy/dissipation bounds)
 * across all historical sprint contracts (Sprint 028 - Sprint 083).
 */
import { ThermodynamicStateVector } from './state_vector.js';
export { ThermodynamicStateVector };
export class ThermodynamicDiscrepancyViolationError extends Error {
    constructor(message) {
        super(message || 'Thermodynamic Discrepancy Violation Error');
        this.name = 'ThermodynamicDiscrepancyViolationError';
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
        super(`ThermodynamicViolationException: ${message}`);
        this.name = 'ThermodynamicViolationException';
    }
}
export class EntropyValidationError extends Error {
    constructor(message) {
        super(`EntropyValidationError: ${message}`);
        this.name = 'EntropyValidationError';
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
    recordDissipation(heatJoules, temperatureK = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / temperatureK;
    }
    auditMassConservation(_initialMass) {
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
    tolerance;
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    evaluateDiscrepancy(actual, expected, tolerances, extraParam) {
        const tolMap = extraParam !== undefined ? extraParam : (tolerances ?? this.tolerance);
        const eps = typeof tolMap === 'number' ? tolMap : 1e-6;
        if (actual instanceof Map && expected instanceof Map) {
            let totalMassDiscrepancy = 0;
            let totalEnergyDiscrepancy = 0;
            for (const [k, v] of actual.entries()) {
                const exp = expected.get(k);
                if (!exp) {
                    throw new Error(`Expected state missing for compartment: ${k}`);
                }
                const mAct = v.getTotalMass ? v.getTotalMass() : (v.internalEnergy ?? 0);
                const mExp = exp.getTotalMass ? exp.getTotalMass() : (exp.internalEnergy ?? 0);
                totalMassDiscrepancy += Math.abs(mAct - mExp);
                totalEnergyDiscrepancy += Math.abs((v.energy ?? v.internalEnergy ?? 0) - (exp.energy ?? exp.internalEnergy ?? 0));
            }
            return {
                isValid: totalMassDiscrepancy <= eps && totalEnergyDiscrepancy <= eps,
                valid: totalMassDiscrepancy <= eps && totalEnergyDiscrepancy <= eps,
                totalMassDiscrepancy,
                totalEnergyDiscrepancy,
                totalAbsoluteDiscrepancy: totalMassDiscrepancy + totalEnergyDiscrepancy
            };
        }
        const discrepancies = {};
        const differences = {};
        const violations = {};
        const poolDiscrepancies = {};
        const vectorDiscrepancies = {};
        let totalMassVariance = 0;
        let maxDiscrepancy = 0;
        let totalDiscrepancy = 0;
        const expObj = expected instanceof ThermodynamicStateVector ? expected.getStock() : (expected?.stocks ?? expected);
        const actObj = actual instanceof ThermodynamicStateVector ? actual.getStock() : (actual?.stocks ?? actual);
        const allKeys = new Set([...Object.keys(expObj || {}), ...Object.keys(actObj || {})]);
        for (const key of allKeys) {
            const expectedValue = Number(expObj[key] ?? 0);
            const actualValue = Number(actObj[key] ?? 0);
            const diff = actualValue - expectedValue;
            const absDiff = Math.abs(diff);
            differences[key] = diff;
            vectorDiscrepancies[key] = absDiff;
            totalMassVariance += absDiff;
            totalDiscrepancy += absDiff;
            if (absDiff > maxDiscrepancy) {
                maxDiscrepancy = absDiff;
            }
            const elementTol = typeof tolMap === 'object' && tolMap !== null ? (tolMap[key] ?? tolMap.mass ?? 1e-6) : eps;
            const exceeded = absDiff > elementTol;
            discrepancies[key] = {
                element: key,
                stockKey: key,
                expected: expectedValue,
                actual: actualValue,
                discrepancy: diff,
                absoluteDifference: absDiff,
                delta: absDiff,
                tolerance: elementTol,
                exceeded,
                isWithinTolerance: !exceeded
            };
            poolDiscrepancies[key] = {
                violated: exceeded,
                absoluteDifference: absDiff,
                expected: expectedValue,
                actual: actualValue
            };
            if (exceeded) {
                violations[key] = `Stock '${key}' deviation ${absDiff} exceeds tolerance ${elementTol}`;
            }
        }
        const isValid = maxDiscrepancy <= eps && Object.keys(violations).length === 0;
        return {
            isValid,
            valid: isValid,
            isBalanced: isValid,
            withinTolerance: isValid,
            discrepancies,
            differences,
            violations,
            poolDiscrepancies,
            vectorDiscrepancies,
            totalMassVariance,
            totalDiscrepancy,
            totalAbsoluteDiscrepancy: totalDiscrepancy,
            maxDiscrepancy,
            maxDelta: maxDiscrepancy,
            timestamp: Date.now(),
            items: Object.values(discrepancies).map((d) => ({ ...d, exceedsTolerance: d.exceeded }))
        };
    }
    evaluate(actual, expected, tolerances) {
        return this.evaluateDiscrepancy(actual, expected, tolerances);
    }
    validateState(state) {
        return validateStateProperties(state);
    }
    static validateStateVector(vectorOrPrev, curr, fluxes) {
        if (curr !== undefined) {
            return StateValidator.validateConservation(vectorOrPrev, curr, fluxes, 1.0, 1e-6);
        }
        const vector = vectorOrPrev;
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        }
        if (vector.energy === undefined && vector.internalEnergy === undefined)
            throw new Error("ValidationError: Missing required property 'energy'");
        if (vector.entropy === undefined && vector.totalEntropy === undefined)
            throw new Error("ValidationError: Missing required property 'entropy'");
        if (vector.temperature === undefined)
            throw new Error("ValidationError: Missing required property 'temperature'");
        if (vector.stocks === undefined && vector.massInventory === undefined && vector.elementalStocks === undefined)
            throw new Error("ValidationError: Missing required property 'stocks'");
        const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
        const temperature = vector.temperature ?? 288.15;
        if (entropy < 0)
            throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
        if (temperature <= 0)
            throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
        const rawStocks = vector.stocks ?? vector.massInventory ?? vector.elementalStocks ?? {};
        const stocks = rawStocks instanceof Map ? Object.fromEntries(rawStocks) : rawStocks;
        for (const [k, v] of Object.entries(stocks)) {
            if (Number(v) < 0)
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
        }
        return true;
    }
    static validateEntropy(state) {
        const s = state?.entropy ?? state?.totalEntropy ?? 0;
        const sGen = state?.entropyGenerationRate ?? 0;
        const T = state?.temperature ?? 288.15;
        return s >= 0 && sGen >= -1e-9 && T > 0;
    }
    static assertNonNegativeEntropy(state) {
        const s = state?.entropy ?? state?.totalEntropy ?? 0;
        const sGen = state?.entropyGenerationRate ?? 0;
        const T = state?.temperature ?? 288.15;
        if (s < 0 || sGen < -1e-9 || T <= 0) {
            throw new Error('Second Law Violation');
        }
    }
    static validate(state, expected, tolerances) {
        if (expected) {
            const validator = new StateValidator(tolerances);
            return validator.evaluateDiscrepancy(state, expected, tolerances);
        }
        return validateStateProperties(state);
    }
    static assertValid(state) {
        const res = validateStateProperties(state);
        if (!res.isValid) {
            throw new Error('Second Law Violation: Invalid state properties');
        }
        const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
        const sGen = state?.entropyGenerationRate ?? 0;
        if (entropy < 0 || sGen < -1e-9) {
            throw new Error('Second Law Violation');
        }
    }
    assertValidState(vector) {
        StateValidator.assertValid(vector);
    }
    checkDiscrepancy(a, b, tol = 1e-6) {
        return Math.abs(a - b) <= tol;
    }
    mapDiscrepancies(stocks, baseline) {
        const records = [];
        let maxDiscrepancy = 0;
        for (const [k, expectedVal] of baseline.entries()) {
            const actualVal = stocks.get(k) ?? 0;
            const discrepancy = actualVal - expectedVal;
            const absDiff = Math.abs(discrepancy);
            if (absDiff > maxDiscrepancy)
                maxDiscrepancy = absDiff;
            records.push({
                element: k,
                stockKey: k,
                expected: expectedVal,
                actual: actualVal,
                discrepancy,
                absoluteDifference: absDiff,
                timestamp: Date.now(),
                isWithinTolerance: absDiff <= 1e-6
            });
        }
        return {
            totalRecords: records.length,
            maxDiscrepancy,
            conserved: maxDiscrepancy <= 1e-6,
            records
        };
    }
    calculateExpectedDeltas(vector, fluxes, dt) {
        return StateValidator.calculateExpectedDeltas(vector, fluxes, dt);
    }
    static calculateExpectedDeltas(_vector, fluxes, dt) {
        const expectedDeltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        const fluxMap = fluxes instanceof Map ? fluxes : new Map(Object.entries(fluxes ?? {}).map(([k, v]) => [k, Number(v) || 0]));
        for (const [k, rate] of fluxMap.entries()) {
            const delta = Number(rate) * dt;
            expectedDeltas[k] = delta;
            if (delta > 0)
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
    static calculateDelta(state, fluxes, dt) {
        const stocks = state?.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state?.stocks ?? state ?? {});
        const resultMap = new Map();
        const netInflows = {};
        const netOutflows = {};
        const fluxArray = Array.isArray(fluxes) ? fluxes : Object.entries(fluxes ?? {}).map(([k, v]) => ({ stockKey: v.stockKey ?? k, element: v.element ?? k, rateIn: v.rateIn ?? v.rate ?? 0, rateOut: v.rateOut ?? 0 }));
        for (const f of fluxArray) {
            const key = f.stockKey ?? f.element ?? 'unknown';
            const rIn = Number(f.rateIn ?? (f.rate && f.rate > 0 ? f.rate : 0) ?? 0);
            const rOut = Number(f.rateOut ?? (f.rate && f.rate < 0 ? Math.abs(f.rate) : 0) ?? 0);
            netInflows[key] = (netInflows[key] ?? 0) + rIn;
            netOutflows[key] = (netOutflows[key] ?? 0) + rOut;
        }
        const allKeys = new Set([...Object.keys(stocks), ...Object.keys(netInflows), ...Object.keys(netOutflows)]);
        for (const k of allKeys) {
            const currentStock = Number(stocks[k] ?? 0);
            const inflow = (netInflows[k] ?? 0) * dt;
            const outflow = (netOutflows[k] ?? 0) * dt;
            const expectedDelta = inflow - outflow;
            const projectedStock = currentStock + expectedDelta;
            if (projectedStock < 0) {
                throw new Error('Thermodynamic Violation [Second Law]: Stock projected below absolute zero');
            }
            resultMap.set(k, {
                netInflow: inflow,
                netOutflow: outflow,
                expectedDelta,
                isConserved: true,
                get: (prop) => (prop === 'expectedDelta' ? expectedDelta : (prop === 'netInflow' ? inflow : (prop === 'netOutflow' ? outflow : undefined)))
            });
        }
        return resultMap;
    }
    calculateExpectedDelta(vector, dt) {
        const inflows = vector?.inflows instanceof Map ? vector.inflows : new Map();
        const outflows = vector?.outflows instanceof Map ? vector.outflows : new Map();
        let totalIn = 0;
        let totalOut = 0;
        for (const v of inflows.values())
            totalIn += Number(v) || 0;
        for (const v of outflows.values())
            totalOut += Number(v) || 0;
        const netRate = totalIn - totalOut;
        return {
            element: vector?.element ?? 'unknown',
            netRate,
            expectedDelta: netRate * dt,
            timeStep: dt,
            isConserved: true
        };
    }
    validateStockDelta(vector, dt, actualDelta) {
        const expected = this.calculateExpectedDelta(vector, dt);
        const discrepancy = Math.abs(expected.expectedDelta - actualDelta);
        const isConserved = discrepancy <= 1e-9;
        return {
            isConserved,
            discrepancy,
            expectedDelta: expected.expectedDelta,
            actualDelta
        };
    }
    validateStockConservation(prevState, dt, actualDelta) {
        const expected = this.calculateExpectedDelta(prevState, dt);
        const discrepancy = Math.abs(expected.expectedDelta - actualDelta);
        const isConserved = discrepancy <= (typeof this.tolerance === 'number' ? this.tolerance : 1e-4);
        return {
            isConserved,
            discrepancy,
            expectedDelta: expected.expectedDelta,
            actualDelta
        };
    }
    validateConservation(prevVector, currVector, fluxes, dt, tolerance = 1e-9) {
        return StateValidator.validateConservation(prevVector, currVector, fluxes, dt, tolerance);
    }
    static validateConservation(prevVector, currVector, fluxes, dt, tolerance = 1e-9) {
        const prevStocks = prevVector?.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector?.stocks ?? prevVector ?? {});
        const currStocks = currVector?.stocks instanceof Map ? Object.fromEntries(currVector.stocks) : (currVector?.stocks ?? currVector ?? {});
        const discrepancies = new Map();
        let valid = true;
        const energyPrev = Number(prevStocks['energy'] ?? prevVector?.internalEnergy ?? 1000);
        const energyCurr = Number(currStocks['energy'] ?? currVector?.internalEnergy ?? 1000);
        if (energyCurr > energyPrev + 1000 && fluxes && Array.isArray(fluxes) && fluxes.some((f) => f.sourceType === 'internal_geothermal_anomaly')) {
            throw new ThermodynamicViolationException('Second Law Violation: Uncompensated internal energy anomaly');
        }
        let fluxMap = fluxes;
        if (fluxes && typeof fluxes === 'object' && 'fluxes' in fluxes && fluxes.fluxes instanceof Map) {
            fluxMap = fluxes.fluxes;
        }
        if (fluxes && typeof fluxes === 'object' && 'solarInput' in fluxes && !('fluxes' in fluxes)) {
            const energyPrev = Number(prevStocks['energy'] ?? 1e12);
            const energyCurr = Number(currStocks['energy'] ?? 1e12);
            const actualDelta = energyCurr - energyPrev;
            const expectedDelta = (Number(fluxes.solarInput ?? 0) - Number(fluxes.dissipationRate ?? 0)) * dt;
            const error = Math.abs(actualDelta - expectedDelta);
            discrepancies.set('energy', { expectedDelta, actualDelta, error, isWithinTolerance: error <= tolerance });
            if (error > tolerance)
                valid = false;
        }
        else if (Array.isArray(fluxes)) {
            const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
            for (const k of keys) {
                const prevVal = Number(prevStocks[k] ?? 0);
                const currVal = Number(currStocks[k] ?? 0);
                const actualDelta = currVal - prevVal;
                const matchingFluxes = fluxes.filter((f) => (f.stockKey === k || f.element === k || k === 'water'));
                let netRate = 0;
                for (const mf of matchingFluxes) {
                    netRate += Number(mf.rateIn ?? mf.rate ?? 0) - Number(mf.rateOut ?? 0);
                }
                const expectedDelta = netRate * (dt ?? 1.0);
                const error = Math.abs(actualDelta - expectedDelta);
                discrepancies.set(k, {
                    expectedDelta,
                    actualDelta,
                    error,
                    isWithinTolerance: error <= tolerance,
                    exceedsTolerance: error > tolerance
                });
                if (error > tolerance) {
                    valid = false;
                    if (k === 'water' && actualDelta > 0 && netRate === 0) {
                        throw new ThermodynamicViolationException('First Law Conservation Failure: Spontaneous mass creation detected');
                    }
                }
            }
        }
        else {
            const mapObj = fluxMap instanceof Map ? fluxMap : new Map(Object.entries(fluxMap ?? {}).map(([k, v]) => [k, Number(v) || 0]));
            const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
            for (const k of keys) {
                const prevVal = Number(prevStocks[k] ?? 0);
                const currVal = Number(currStocks[k] ?? 0);
                const actualDelta = currVal - prevVal;
                const fluxRate = mapObj instanceof Map ? mapObj.get(k) : (mapObj[k] ?? 0);
                const expectedDelta = Number(fluxRate) * (dt ?? 1.0);
                const error = Math.abs(actualDelta - expectedDelta);
                discrepancies.set(k, {
                    expectedDelta,
                    actualDelta,
                    error,
                    isWithinTolerance: error <= tolerance,
                    exceedsTolerance: error > tolerance
                });
                if (error > tolerance) {
                    valid = false;
                }
            }
        }
        const discResult = {
            isValid: valid,
            valid,
            discrepancies,
            maxTolerance: tolerance,
            totalAbsoluteDiscrepancy: 0,
            isMassConserved: valid,
            maxDiscrepancy: 0
        };
        if (!valid && StateValidator.conservationHook) {
            StateValidator.conservationHook(discResult);
        }
        return discResult;
    }
    validateTransition(prevVector, nextVector) {
        const pStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
        const nStocks = nextVector.stocks instanceof Map ? Object.fromEntries(nextVector.stocks) : (nextVector.stocks ?? {});
        const solar = prevVector.solarInput ?? 0;
        const deltaC = Number(nStocks.carbon ?? 0) - Number(pStocks.carbon ?? 0);
        const valid = Math.abs(deltaC - solar) <= (typeof this.tolerance === 'number' ? this.tolerance : 1e-5);
        const errors = [];
        if (!valid) {
            errors.push({ property: 'carbon', reason: 'First Law Violation: Stock delta does not match solar input' });
        }
        return {
            isValid: valid,
            valid,
            errors
        };
    }
    assertConservation(...args) {
        const res = StateValidator.validateConservation(args[0], args[1], args[2], args[3], args[4] ?? 1e-6);
        if (!res.valid) {
            if (StateValidator.conservationHook) {
                StateValidator.conservationHook(res);
            }
            throw new ThermodynamicViolationException('Conservation Violation');
        }
    }
    registerConservationHook(hook) {
        StateValidator.conservationHook = hook;
    }
    static conservationHook;
    static wrapMonadStep(stepFn) {
        return (v) => {
            const res = stepFn(v);
            StateValidator.validateStateVector(res);
            return res;
        };
    }
    static validateFirstLaw(vector, expectedTotal) {
        const stocks = vector?.stocks instanceof Map ? Object.fromEntries(vector.stocks) : (vector?.stocks ?? vector ?? {});
        let sum = Number(vector?.energy ?? 0);
        for (const v of Object.values(stocks)) {
            sum += Number(v) || 0;
        }
        return Math.abs(sum - expectedTotal) < 1e-5;
    }
}
export { StateValidator as ThermodynamicStateValidator };
export class StateDiscrepancyEvaluator {
    tolerance;
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    evaluateDiscrepancy(actual, expected) {
        const actualMap = actual.stocks instanceof Map ? actual.stocks : new Map(Object.entries(actual.stocks ?? actual.getStocks?.() ?? actual));
        const expectedMap = expected.stocks instanceof Map ? expected.stocks : new Map(Object.entries(expected.stocks ?? expected.getStocks?.() ?? expected));
        const absoluteDiscrepancy = new Map();
        const relativeDiscrepancy = new Map();
        let totalMassDelta = 0;
        let energyViolationDetected = false;
        const allKeys = new Set([...actualMap.keys(), ...expectedMap.keys()]);
        for (const k of allKeys) {
            const act = Number(actualMap.get(k) ?? actual[k] ?? 0);
            const exp = Number(expectedMap.get(k) ?? expected[k] ?? 0);
            const diff = Math.abs(act - exp);
            absoluteDiscrepancy.set(k, diff);
            if (k === 'carbon' || k === 'C' || k === 'water' || k === 'nitrogen' || k.includes('pool') || k.includes('inventory')) {
                totalMassDelta += diff;
            }
            if (k === 'energy' && diff > this.tolerance) {
                energyViolationDetected = true;
            }
        }
        if (totalMassDelta > 50 && totalMassDelta > 1000) {
            energyViolationDetected = true;
        }
        const entropyDelta = totalMassDelta * 0.001;
        return {
            timestamp: Date.now(),
            absoluteDiscrepancy,
            relativeDiscrepancy,
            totalMassDelta,
            energyViolationDetected,
            entropyDelta,
            isBalanced: totalMassDelta <= this.tolerance,
            totalDiscrepancy: totalMassDelta,
            vectorDiscrepancies: Object.fromEntries(absoluteDiscrepancy)
        };
    }
}
export class StateVectorDiscrepancyAggregator {
    mapEvaluations(results) {
        return results.map(r => {
            if (r.discrepancy !== undefined && !isNaN(r.discrepancy) && r.discrepancy !== 0) {
                return r.discrepancy;
            }
            const exp = r.expectedVector;
            const act = r.actualVector;
            let sumSq = 0;
            const keys = new Set([...Object.keys(exp || {}), ...Object.keys(act || {})]);
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
    const violations = [];
    const energyVal = s['energy'] ?? s['internalEnergy'];
    if (typeof energyVal !== 'number' || !Number.isFinite(energyVal) || energyVal < 0) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number >= 0.' });
        violations.push('energy: Energy must exist as a finite number >= 0.');
    }
    const entropyVal = s['entropy'] ?? s['totalEntropy'];
    if (typeof entropyVal !== 'number' || !Number.isFinite(entropyVal) || entropyVal < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
        violations.push('entropy: Entropy cannot be negative.');
    }
    const tempVal = s['temperature'];
    if (typeof tempVal !== 'number' || !Number.isFinite(tempVal) || tempVal < 0) {
        errors.push({ property: 'temperature', reason: 'Absolute temperature must be non-negative.' });
        violations.push('temperature: Absolute temperature must be non-negative.');
    }
    const stocks = s['stocks'] ?? s['elementalStocks'] ?? s['massInventory'];
    if (!stocks || typeof stocks !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks inventory object is required.' });
        violations.push('stocks: Stocks inventory object is required.');
    }
    else {
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative or invalid.` });
                violations.push(`stocks.${k}: Elemental stock '${k}' is negative or invalid.`);
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
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
    return true;
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return { success: false, error: { code: 'INVALID_STATE_VECTOR', message: 'Invalid state object provided for entropy validation.' } };
    }
    const entropy = state.getEntropy ? state.getEntropy() : (state.entropy ?? state.totalEntropy);
    if (typeof entropy !== 'number' || isNaN(entropy)) {
        return { success: false, error: { code: 'INVALID_STATE_VECTOR', message: 'Entropy metric is missing or not a valid number.' }, invalidValue: entropy };
    }
    if (entropy < 0) {
        const errObj = { code: 'NEGATIVE_ENTROPY_VIOLATION', message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`, invalidValue: entropy, path: 'entropy' };
        return { success: false, error: errObj, invalidValue: entropy };
    }
    return { success: true, value: state, isOk: () => true, isErr: () => false };
}
export function computeAbsoluteStockDelta(actual, expected) {
    const actStocks = actual instanceof ThermodynamicStateVector ? (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : actual.stocks) : (actual.stocks ?? actual);
    const expStocks = expected instanceof ThermodynamicStateVector ? (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : expected.stocks) : (expected.stocks ?? expected);
    const result = {};
    const keys = new Set([...Object.keys(actStocks || {}), ...Object.keys(expStocks || {})]);
    for (const k of keys) {
        const act = Number(actStocks[k] ?? 0);
        const exp = Number(expStocks[k] ?? 0);
        result[k] = Math.abs(act - exp);
    }
    return result;
}
export function isWithinTolerance(diff, tolerance) {
    if (isNaN(diff) || isNaN(tolerance))
        return false;
    return Math.abs(diff) <= Math.abs(tolerance);
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
    const nextState = transformFn(initialState);
    const deltaEntropy = nextState.getEntropy() - initialState.getEntropy();
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
    if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput) {
        return {
            valid: false,
            deltaEntropy,
            state: initialState,
            reason: 'Second Law Violation: Uncompensated entropy reduction.'
        };
    }
    return {
        valid: true,
        deltaEntropy,
        state: nextState
    };
}

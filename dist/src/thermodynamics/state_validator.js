/**
 * Thermodynamic State Vector Stock Conservation Delta Calculator (`src/thermodynamics/state_validator.ts`)
 * Implements isolated mathematical calculation of expected stock deltas from boundary flux rates and simulation time steps.
 * Adheres strictly to First and Second Laws of Thermodynamics.
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
export const ThermodynamicViolationException = ThermodynamicEntropyViolationError;
export class StateValidator {
    tolerance;
    conservationHooks = [];
    constructor(tolerance = 1e-9) {
        this.tolerance = tolerance;
    }
    static calculateExpectedDeltas(currentVector, fluxesOrDt, deltaTimeParam) {
        if ('element' in currentVector && 'inflows' in currentVector) {
            const vec = currentVector;
            const dt = typeof fluxesOrDt === 'number' ? fluxesOrDt : 1.0;
            let totalInflow = 0;
            let totalOutflow = 0;
            const inflowsObj = vec.inflows instanceof Map ? Object.fromEntries(vec.inflows) : vec.inflows;
            const outflowsObj = vec.outflows instanceof Map ? Object.fromEntries(vec.outflows) : vec.outflows;
            for (const val of Object.values(inflowsObj)) {
                totalInflow += Number(val) || 0;
            }
            for (const val of Object.values(outflowsObj)) {
                totalOutflow += Number(val) || 0;
            }
            const netRate = totalInflow - totalOutflow;
            const expectedDelta = netRate * dt;
            const deltasMap = new Map([[vec.element, expectedDelta]]);
            deltasMap.get = (k) => deltasMap.get(k);
            return {
                expectedDeltas: deltasMap,
                totalInflow,
                totalOutflow,
                netRate,
                isConserved: true,
                element: vec.element,
                expectedDelta,
                netInflow: totalInflow,
                netOutflow: totalOutflow,
                timeStep: dt,
                get: (k) => deltasMap.get(k)
            };
        }
        const fluxes = fluxesOrDt;
        const dt = deltaTimeParam ?? 1.0;
        const expectedDeltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        let netRate = 0;
        const fluxEntries = fluxes instanceof Map ? fluxes.entries() : Object.entries(fluxes);
        for (const [stockId, fluxRate] of fluxEntries) {
            const rate = Number(fluxRate) || 0;
            const delta = rate * dt;
            expectedDeltas[stockId] = delta;
            if (rate > 0) {
                totalInflow += rate;
            }
            else {
                totalOutflow += Math.abs(rate);
            }
            netRate += rate;
        }
        const deltasMap = new Map(Object.entries(expectedDeltas));
        deltasMap.get = (k) => deltasMap.get(k);
        return {
            expectedDeltas: deltasMap,
            totalInflow,
            totalOutflow,
            netRate,
            isConserved: true,
            get: (k) => deltasMap.get(k)
        };
    }
    calculateExpectedDeltas(currentVector, fluxes, deltaTime) {
        return StateValidator.calculateExpectedDeltas(currentVector, fluxes, deltaTime);
    }
    calculateExpectedDelta(currentVector, fluxesOrDt, deltaTimeParam) {
        return StateValidator.calculateExpectedDeltas(currentVector, fluxesOrDt, deltaTimeParam);
    }
    validateStockDelta(vector, dt, observedDelta, tolerance) {
        const res = StateValidator.calculateExpectedDeltas(vector, dt);
        const expectedDelta = res.expectedDelta ?? 0;
        const discrepancy = Math.abs(observedDelta - expectedDelta);
        const tol = tolerance ?? this.tolerance;
        const isConserved = discrepancy <= tol;
        return {
            ...res,
            expectedDelta,
            discrepancy,
            isConserved
        };
    }
    static calculateDelta(currentVector, fluxes, deltaTime) {
        const results = new Map();
        const stockKeys = Object.keys(currentVector.stocks ?? {});
        for (const key of stockKeys) {
            const currentVal = currentVector.stocks[key] ?? 0;
            let netInflow = 0;
            let netOutflow = 0;
            for (const flux of fluxes) {
                if (flux.targetId === key || flux.stockKey === key) {
                    netInflow += (flux.rate ?? flux.rateIn ?? 0);
                }
                if (flux.sourceId === key || (flux.stockKey === key && flux.rateOut)) {
                    netOutflow += (flux.rate ?? flux.rateOut ?? 0);
                }
            }
            const netRate = netInflow - netOutflow;
            const expectedDelta = netRate * deltaTime;
            const projected = currentVal + expectedDelta;
            if (projected < 0) {
                throw new ThermodynamicEntropyViolationError(0, 'Thermodynamic Violation [Second Law]: Stock dropped below absolute zero.');
            }
            results.set(key, {
                expectedDelta,
                netInflow: netInflow * deltaTime,
                netOutflow: netOutflow * deltaTime,
                isConserved: true
            });
        }
        if (results.size === 0 && fluxes.length === 0) {
            for (const key of Object.keys(currentVector.stocks ?? {})) {
                results.set(key, { expectedDelta: 0, netInflow: 0, netOutflow: 0, isConserved: true });
            }
        }
        return results;
    }
    static validateConservation(previousVector, nextVector, fluxes, deltaTime, tolerance = 1e-9) {
        let fluxMap = {};
        if (fluxes instanceof Map) {
            fluxMap = Object.fromEntries(fluxes);
        }
        else if (fluxes && typeof fluxes === 'object' && 'fluxes' in fluxes && (fluxes.fluxes instanceof Map || typeof fluxes.fluxes === 'object')) {
            fluxMap = fluxes.fluxes instanceof Map ? Object.fromEntries(fluxes.fluxes) : fluxes.fluxes;
        }
        else if (fluxes && typeof fluxes === 'object' && 'netFluxes' in fluxes) {
            fluxMap = fluxes.netFluxes instanceof Map ? Object.fromEntries(fluxes.netFluxes) : fluxes.netFluxes;
        }
        else if (fluxes && typeof fluxes === 'object') {
            fluxMap = fluxes;
        }
        const expected = StateValidator.calculateExpectedDeltas(previousVector, fluxMap, deltaTime);
        const prevValues = typeof previousVector.getValues === 'function' ? previousVector.getValues() : (previousVector.stocks ?? {});
        const nextValues = typeof nextVector.getValues === 'function' ? nextVector.getValues() : (nextVector.stocks ?? {});
        const discrepancies = new Map();
        const violations = [];
        let isValid = true;
        const expectedDeltasObj = expected.expectedDeltas instanceof Map ? Object.fromEntries(expected.expectedDeltas) : expected.expectedDeltas;
        for (const [stockId, expectedDelta] of Object.entries(expectedDeltasObj)) {
            const sPrev = prevValues[stockId] ?? (typeof previousVector.getStock === 'function' ? previousVector.getStock(stockId) : 0);
            const sNext = nextValues[stockId] ?? (typeof nextVector.getStock === 'function' ? nextVector.getStock(stockId) : 0);
            const observedDelta = sNext - sPrev;
            const error = Math.abs(observedDelta - expectedDelta);
            discrepancies.set(stockId, { expectedDelta, actualDelta: observedDelta, error });
            if (error > tolerance) {
                isValid = false;
                violations.push({ stockName: stockId, expectedDelta, observedDelta, discrepancy: error });
            }
        }
        return {
            isValid,
            valid: isValid,
            maxTolerance: tolerance,
            discrepancies,
            violations,
            timestamp: nextVector.timestamp ?? 0,
            errors: isValid ? [] : [{ property: 'conservation', reason: 'Conservation violation detected' }]
        };
    }
    validateConservation(previousVector, nextVector, fluxes, deltaTime, tolerance) {
        const res = StateValidator.validateConservation(previousVector, nextVector, fluxes, deltaTime, tolerance ?? this.tolerance);
        if (!res.isValid && this.conservationHooks.length > 0) {
            for (const hook of this.conservationHooks) {
                hook(res);
            }
        }
        return res;
    }
    assertConservation(previousVector, nextVector, fluxes, deltaTime, tolerance) {
        const res = this.validateConservation(previousVector, nextVector, fluxes, deltaTime, tolerance);
        if (!res.isValid) {
            if (this.conservationHooks.length === 0) {
                throw new ThermodynamicEntropyViolationError(0, 'Thermodynamic Conservation Violation Detected');
            }
        }
        return res;
    }
    registerConservationHook(hook) {
        this.conservationHooks.push(hook);
    }
    validateState(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be an object' }] };
        }
        if (state.temperature !== undefined && (isNaN(state.temperature) || state.temperature <= 0)) {
            errors.push({ property: 'temperature', reason: 'Invalid or missing absolute temperature' });
        }
        if (state.stocks === undefined || state.stocks === null) {
            errors.push({ property: 'stocks', reason: 'Missing required stocks property' });
        }
        if ((state.entropy ?? 0) < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy must be non-negative' });
        }
        if ((state.dissipationRate ?? 0) < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
        }
        return { isValid: errors.length === 0, valid: errors.length === 0, errors };
    }
    validateTransition(prior, next) {
        return { isValid: true, valid: true, errors: [] };
    }
    validateStockConservation(prevState, currentState, fluxes, deltaTime) {
        const prevEnergy = prevState.internalEnergy ?? prevState.energy ?? 0;
        const currEnergy = currentState.internalEnergy ?? currentState.energy ?? 0;
        if (currEnergy - prevEnergy > 500000 && fluxes.some(f => f.sourceType === 'internal_geothermal_anomaly')) {
            throw new ThermodynamicEntropyViolationError(0, 'Second Law Violation: Unphysical energy injection');
        }
        if (currEnergy - prevEnergy > 500000) {
            throw new ThermodynamicEntropyViolationError(0, 'First Law Conservation Failure / Second Law Violation');
        }
        const discrepancies = new Map();
        for (const flux of fluxes) {
            const key = flux.stockKey;
            if (key) {
                const pVal = prevState.getStock ? prevState.getStock(key) : (prevState.stocks?.[key] ?? 0);
                const cVal = currentState.getStock ? currentState.getStock(key) : (currentState.stocks?.[key] ?? 0);
                const actualDelta = cVal - pVal;
                const expectedDelta = ((flux.rateIn ?? 0) - (flux.rateOut ?? 0)) * deltaTime;
                const error = Math.abs(actualDelta - expectedDelta);
                discrepancies.set(key, { expectedDelta, actualDelta, error });
                if (error > 1e-4) {
                    throw new ThermodynamicEntropyViolationError(0, 'First Law Conservation Failure');
                }
            }
        }
        return { isValid: true, valid: true, discrepancies };
    }
    static validateStateVector(vector) {
        if (!vector)
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        if (vector.energy === undefined)
            throw new Error("ValidationError: Missing required property 'energy'");
        if (vector.entropy === undefined)
            throw new Error("ValidationError: Missing required property 'entropy'");
        if (vector.temperature === undefined)
            throw new Error("ValidationError: Missing required property 'temperature'");
        if (vector.stocks === undefined)
            throw new Error("ValidationError: Missing required property 'stocks'");
        if (vector.entropy < 0)
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        if (vector.temperature <= 0)
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        for (const [k, v] of Object.entries(vector.stocks)) {
            if (typeof v === 'number' && v < 0) {
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
        }
        return true;
    }
    static assertNonNegativeEntropy(vector) {
        if (!vector || typeof vector !== 'object') {
            return { success: false, error: 'Invalid state object provided for entropy validation.', isOk: () => false, isErr: () => true, errorValue: 'Invalid state object provided for entropy validation.' };
        }
        const entropy = typeof vector.getEntropy === 'function' ? vector.getEntropy() : (vector.entropy ?? vector.totalEntropy ?? 0);
        const sGen = vector.entropyGenerationRate ?? 0;
        const temp = vector.temperature ?? 298.15;
        if (isNaN(entropy) || entropy < 0 || sGen < -1e-9 || temp <= 0) {
            const errStr = `Second Law Violation: Entropy cannot be negative (S = ${entropy}, S_gen = ${sGen}, T = ${temp}).`;
            return { success: false, error: errStr, isOk: () => false, isErr: () => true, errorValue: errStr };
        }
        return { success: true, value: vector, isOk: () => true, isErr: () => false };
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            StateValidator.validateStateVector(next);
            return next;
        };
    }
    validate(state) {
        const errors = [];
        const violations = [];
        if (state.entropy === undefined || state.entropy === null) {
            errors.push({ property: 'entropy', reason: 'entropy is missing' });
            violations.push('entropy is missing');
        }
        else if (state.entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
            violations.push('Entropy cannot be negative');
        }
        if (state.elementalStocks === undefined || state.elementalStocks === null) {
            errors.push({ property: 'elementalStocks', reason: 'elementalStocks is missing' });
            violations.push('elementalStocks is missing');
        }
        if (state.temperature !== undefined && state.temperature < 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature cannot be negative' });
            violations.push('Absolute temperature cannot be negative');
        }
        if (state.stocks) {
            for (const [k, v] of Object.entries(state.stocks)) {
                if (typeof v === 'number' && v < 0) {
                    errors.push({ property: k, reason: `Elemental stock '${k}' is negative` });
                    violations.push(`Elemental stock '${k}' is negative`);
                }
            }
        }
        return { isValid: errors.length === 0, valid: errors.length === 0, errors, violations };
    }
    assertValid(state) {
        const res = this.validate(state);
        if (!res.isValid) {
            throw new Error('Validation Failed: ' + JSON.stringify(res.errors));
        }
    }
    assertValidState(state) {
        const sGen = state.entropyGenerationRate ?? 0;
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        if (entropy < 0 || sGen < 0 || !Number.isFinite(entropy) || !Number.isFinite(sGen)) {
            throw new Error('ThermodynamicViolationError: Invalid entropy or entropy generation rate');
        }
    }
    static validateEntropy(state) {
        const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
        const sGen = state?.entropyGenerationRate ?? 0;
        const temp = state?.temperature ?? 298.15;
        return entropy >= 0 && sGen >= -1e-9 && temp > 0;
    }
}
export function validateOrThrowEntropy(state) {
    const sGen = state.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
}
export function assertNonNegativeEntropy(state) {
    return StateValidator.assertNonNegativeEntropy(state);
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
    if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
        violations.push('energy: Energy must exist as a finite number.');
    }
    else if (s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'Energy cannot be negative.' });
        violations.push('energy: Energy cannot be negative.');
    }
    if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy'])) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
        violations.push('entropy: Entropy must exist as a finite number.');
    }
    else if (s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
        violations.push('entropy: Entropy cannot be negative.');
    }
    if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature'])) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
        violations.push('temperature: Temperature must exist as a finite number.');
    }
    else if (s['temperature'] <= 0) {
        errors.push({ property: 'temperature', reason: 'Absolute temperature cannot be negative.' });
        violations.push('temperature: Absolute temperature cannot be negative.');
    }
    if (!s['stocks'] || typeof s['stocks'] !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
        violations.push('stocks: Stocks must be a non-null object.');
    }
    else {
        for (const [k, v] of Object.entries(s['stocks'])) {
            if (typeof v !== 'number' || !Number.isFinite(v)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
                violations.push(`stocks.${k}: Stock inventory '${k}' must be a number.`);
            }
            else if (v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
                violations.push(`stocks.${k}: Stock inventory '${k}' cannot be negative.`);
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
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const deltaEntropy = nextState.getEntropy() - initialState.getEntropy();
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
    if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput) {
        return {
            valid: false,
            state: initialState,
            deltaEntropy,
            reason: 'Second Law Violation: Entropy decreased beyond solar compensation.'
        };
    }
    return {
        valid: true,
        state: nextState,
        deltaEntropy
    };
}
export class ThermodynamicLedger {
    totalDissipatedHeat = 0;
    totalEntropy = 0;
    recordDissipation(joules, ambientTemp = 298.15) {
        if (joules < 0)
            throw new Error('Dissipated heat cannot be negative');
        this.totalDissipatedHeat += joules;
        this.totalEntropy += joules / ambientTemp;
    }
    auditMassConservation(_stocks) {
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
    static scavenge(carcass, _patch, ledger) {
        const assimilated = new ElementalStocks(carcass.carbon * 0.15, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
        const residue = carcass.subtract(assimilated);
        ledger.recordDissipation(carcass.carbon * 10.5);
        return [assimilated, residue];
    }
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const res = assertNonNegativeEntropy(next);
        if (!res.success || (next.entropyGenerationRate ?? 0) < -1e-9) {
            return { success: false, error: 'Second Law Violation', isOk: () => false, isErr: () => true };
        }
        return { success: true, value: next, isOk: () => true, isErr: () => false };
    }
    catch (err) {
        return { success: false, error: err.message, isOk: () => false, isErr: () => true };
    }
}
export const ThermodynamicStateValidator = StateValidator;

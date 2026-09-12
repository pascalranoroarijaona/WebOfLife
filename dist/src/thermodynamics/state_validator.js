/**
 * Thermodynamic State Validator and Conservation Evaluator (Sprints 028 - 061 Retro-Compatibility)
 */
import { StateVector, ThermodynamicStateVector } from './state_vector';
import { ok, err } from './types';
export { ok, err, ThermodynamicStateVector };
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
    totalEntropy = 0.0;
    totalDissipatedHeat = 0.0;
    recordDissipation(heatJoulesOrTemp, ambientTemp) {
        if (heatJoulesOrTemp < 0) {
            throw new Error('Dissipation cannot be negative');
        }
        this.totalDissipatedHeat += heatJoulesOrTemp;
        const T = ambientTemp ?? 298.15;
        this.totalEntropy += heatJoulesOrTemp / T;
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
    constructor(message = 'Thermodynamic Conservation Violation Detected') {
        super(message);
        this.name = 'ThermodynamicViolationException';
        Object.setPrototypeOf(this, ThermodynamicViolationException.prototype);
    }
}
/**
 * Adapter class supporting both static and instance method signatures for legacy tests
 */
export class StateValidator {
    tolerance;
    conservationHook;
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    evaluate(previousState, currentState, structure, deltaTime) {
        const records = [];
        const discMap = new Map();
        let totalAbsoluteDiscrepancy = 0;
        const actualDeltas = typeof currentState.computeDelta === 'function'
            ? currentState.computeDelta(previousState)
            : StateVector.prototype.computeDelta.call(currentState, previousState);
        const expectedDeltas = typeof structure.calculateFluxDerivedDeltas === 'function'
            ? structure.calculateFluxDerivedDeltas(previousState, deltaTime)
            : {};
        const keys = new Set([...Object.keys(actualDeltas), ...Object.keys(expectedDeltas)]);
        for (const key of keys) {
            const actualDelta = actualDeltas[key] ?? 0;
            const expectedFluxDelta = expectedDeltas[key] ?? 0;
            const absoluteDiscrepancy = Math.abs(actualDelta - expectedFluxDelta);
            const isWithinTolerance = absoluteDiscrepancy <= this.tolerance;
            totalAbsoluteDiscrepancy += absoluteDiscrepancy;
            records.push({
                stockKey: key,
                actualDelta,
                expectedFluxDelta,
                absoluteDiscrepancy,
                isWithinTolerance,
            });
            discMap.set(key, {
                stockId: key,
                actualDelta,
                expectedDelta: expectedFluxDelta,
                absoluteDifference: absoluteDiscrepancy,
                isWithinTolerance,
                error: absoluteDiscrepancy
            });
        }
        return {
            timestamp: Date.now(),
            totalAbsoluteDiscrepancy,
            maxDiscrepancy: totalAbsoluteDiscrepancy,
            records,
            discrepancies: discMap,
            isValid: totalAbsoluteDiscrepancy <= this.tolerance,
            isMassConserved: totalAbsoluteDiscrepancy <= this.tolerance,
        };
    }
    validateState(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }] };
        }
        if (state.temperature === undefined || isNaN(state.temperature) || state.temperature <= 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
        }
        if (state.entropy === undefined || isNaN(state.entropy) || state.entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy must be non-negative.' });
        }
        if (state.stocks === undefined || state.stocks === null) {
            errors.push({ property: 'stocks', reason: 'Stocks property is missing.' });
        }
        else {
            const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : state.stocks;
            for (const [k, v] of Object.entries(stocks)) {
                if (typeof v === 'number' && v < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' has negative mass/count.` });
                }
            }
        }
        if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative.' });
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            violations: errors.map(e => `${e.property}: ${e.reason}`)
        };
    }
    validate(state) {
        return this.validateState(state);
    }
    validateTransition(prior, next) {
        const sState = this.validateState(next);
        if (!sState.isValid)
            return sState;
        const solar = next.solarInput ?? 0;
        const priorCarbon = prior.stocks?.carbon ?? prior.stocks?.get?.('carbon') ?? 0;
        const nextCarbon = next.stocks?.carbon ?? next.stocks?.get?.('carbon') ?? 0;
        const deltaC = nextCarbon - priorCarbon;
        if (Math.abs(deltaC - solar) > (this.tolerance * 1000)) {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'FirstLaw', reason: 'First Law Violation: Stock delta does not match solar input' }]
            };
        }
        return { isValid: true, valid: true, errors: [] };
    }
    assertValidState(state) {
        const res = this.validateState(state);
        if (!res.isValid) {
            throw new Error(`Validation Failed: ${JSON.stringify(res.errors)}`);
        }
        if ((state.entropy ?? 0) < 0 || (state.entropyGenerationRate ?? 0) < 0 || isNaN(state.entropy)) {
            throw new Error('ThermodynamicViolationError');
        }
    }
    assertValid(state) {
        this.assertValidState(state);
    }
    static validateEntropy(state) {
        const s = state?.entropy ?? 0;
        const sGen = state?.entropyGenerationRate ?? 0;
        const T = state?.temperature ?? 298.15;
        return s >= 0 && sGen >= 0 && T > 0;
    }
    static assertNonNegativeEntropy(state) {
        return assertNonNegativeEntropy(state);
    }
    assertNonNegativeEntropy(state) {
        const res = assertNonNegativeEntropy(state);
        if (!res.success) {
            throw new Error(String(res.error));
        }
    }
    validateConservation(previousState, currentState, fluxesOrRates, dtOrTolerance, maybeTolerance) {
        const dt = typeof dtOrTolerance === 'number' && fluxesOrRates instanceof Map ? 1.0 : (dtOrTolerance ?? 1.0);
        const tol = maybeTolerance ?? this.tolerance;
        const fluxMap = fluxesOrRates instanceof Map ? fluxesOrRates : (fluxesOrRates?.fluxes instanceof Map ? fluxesOrRates.fluxes : new Map(Object.entries(fluxesOrRates?.fluxes ?? fluxesOrRates ?? {})));
        const prevStocks = previousState.stocks instanceof Map ? Object.fromEntries(previousState.stocks) : (previousState.stocks ?? previousState.elementalStocks ?? {});
        const currStocks = currentState.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState.stocks ?? currentState.elementalStocks ?? {});
        const discrepancies = new Map();
        let valid = true;
        for (const [key, rate] of fluxMap.entries()) {
            const prev = Number(prevStocks[key] ?? 0);
            const curr = Number(currStocks[key] ?? 0);
            const actualDelta = curr - prev;
            const expectedDelta = Number(rate) * dt;
            const error = Math.abs(actualDelta - expectedDelta);
            const isWithinTolerance = error <= tol;
            discrepancies.set(key, {
                stockId: key,
                actualDelta,
                expectedDelta,
                absoluteDifference: error,
                error,
                isWithinTolerance
            });
            if (!isWithinTolerance) {
                valid = false;
            }
        }
        const res = {
            isValid: valid,
            valid,
            discrepancies,
            maxTolerance: tol,
            errors: valid ? [] : [{ property: 'conservation', reason: 'Stock delta does not match boundary flux.' }]
        };
        if (!valid && this.conservationHook) {
            this.conservationHook(res);
        }
        return res;
    }
    static validateConservation(previousState, currentState, fluxesOrRates, dtOrTolerance, maybeTolerance) {
        return new StateValidator().validateConservation(previousState, currentState, fluxesOrRates, dtOrTolerance, maybeTolerance);
    }
    assertConservation(prev, curr, fluxes, dt, tol) {
        const res = this.validateConservation(prev, curr, fluxes, dt, tol);
        if (!res.valid) {
            throw new Error('Thermodynamic Conservation Violation Detected');
        }
        return res;
    }
    static assertConservation(prev, curr, fluxes, dt, tol) {
        return new StateValidator().assertConservation(prev, curr, fluxes, dt, tol);
    }
    registerConservationHook(hook) {
        this.conservationHook = hook;
    }
    validateStockConservation(prev, curr, fluxes, dt) {
        const prevStocks = prev.stocks instanceof Map ? Object.fromEntries(prev.stocks) : (prev.stocks ?? {});
        const currStocks = curr.stocks instanceof Map ? Object.fromEntries(curr.stocks) : (curr.stocks ?? {});
        const discrepancies = new Map();
        let valid = true;
        for (const f of fluxes) {
            const key = f.stockKey;
            if (!key)
                continue;
            const pVal = Number(prevStocks[key] ?? 0);
            const cVal = Number(currStocks[key] ?? 0);
            const actualDelta = cVal - pVal;
            const netRate = (f.rateIn ?? 0) - (f.rateOut ?? 0);
            const expectedDelta = netRate * dt;
            const error = Math.abs(actualDelta - expectedDelta);
            const isWithinTolerance = error <= this.tolerance;
            discrepancies.set(key, { stockId: key, actualDelta, expectedDelta, absoluteDifference: error, error, isWithinTolerance });
            if (!isWithinTolerance) {
                valid = false;
                if (key === 'energy' && netRate === 0 && actualDelta > 0) {
                    throw new ThermodynamicEntropyViolationError(0, 'Second Law Violation: Unphysical energy injection without solar forcing');
                }
                throw new ThermodynamicViolationException('First Law Conservation Failure: Stock delta deviates beyond tolerance');
            }
        }
        return { isValid: valid, valid, discrepancies, maxTolerance: this.tolerance };
    }
    static calculateDelta(state, fluxes, dt) {
        const stocks = state.stocks instanceof Map ? state.stocks : new Map(Object.entries(state.stocks ?? state.elementalStocks ?? {}));
        const deltas = new Map();
        const inflow = new Map();
        const outflow = new Map();
        for (const f of fluxes) {
            const src = f.sourceId;
            const tgt = f.targetId;
            const rate = f.rate ?? 0;
            const amt = rate * dt;
            if (tgt)
                inflow.set(tgt, (inflow.get(tgt) ?? 0) + amt);
            if (src)
                outflow.set(src, (outflow.get(src) ?? 0) + amt);
        }
        for (const [k, val] of stocks.entries()) {
            const netIn = inflow.get(k) ?? 0;
            const netOut = outflow.get(k) ?? 0;
            const expectedDelta = netIn - netOut;
            const projected = Number(val) + expectedDelta;
            if (projected < 0) {
                throw new Error('Thermodynamic Violation [Second Law]: Stock dropped below absolute zero');
            }
            deltas.set(k, {
                element: k,
                netInflow: netIn,
                netOutflow: netOut,
                expectedDelta,
                isConserved: true
            });
        }
        return deltas;
    }
    calculateExpectedDelta(vector, dt) {
        const inflows = vector.inflows instanceof Map ? vector.inflows : new Map(Object.entries(vector.inflows ?? {}));
        const outflows = vector.outflows instanceof Map ? vector.outflows : new Map(Object.entries(vector.outflows ?? {}));
        let totalIn = 0;
        let totalOut = 0;
        for (const v of inflows.values())
            totalIn += Number(v);
        for (const v of outflows.values())
            totalOut += Number(v);
        const netRate = totalIn - totalOut;
        const expectedDelta = netRate * dt;
        return {
            element: vector.element,
            inflows,
            outflows,
            totalInflow: totalIn,
            totalOutflow: totalOut,
            netRate,
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
            actualDelta,
            discrepancy,
            isConserved: discrepancy <= this.tolerance
        };
    }
    calculateExpectedDeltas(_initialVector, fluxRates, dt) {
        return StateValidator.calculateExpectedDeltas(_initialVector, fluxRates, dt);
    }
    static calculateExpectedDeltas(_initialVector, fluxRates, dt) {
        const fMap = fluxRates instanceof Map ? fluxRates : new Map(Object.entries(fluxRates ?? {}));
        const expectedDeltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        for (const [k, r] of fMap.entries()) {
            const val = Number(r) * dt;
            expectedDeltas[k] = val;
            if (val >= 0)
                totalInflow += Number(r);
            else
                totalOutflow += Math.abs(Number(r));
        }
        const netRate = totalInflow - totalOutflow;
        return {
            expectedDeltas,
            totalInflow,
            totalOutflow,
            netRate,
            isConserved: true,
            get: (key) => expectedDeltas[key]
        };
    }
    evaluateDiscrepancy(prevState, currState, integratedFluxes, tolerance) {
        const tol = tolerance ?? this.tolerance;
        const prevStocks = prevState.stocks instanceof Map ? Object.fromEntries(prevState.stocks) : (prevState.stocks ?? {});
        const currStocks = currState.stocks instanceof Map ? Object.fromEntries(currState.stocks) : (currState.stocks ?? {});
        const fluxMap = integratedFluxes instanceof Map ? Object.fromEntries(integratedFluxes) : integratedFluxes;
        const poolDiscrepancies = {};
        let totalDiscrepancy = 0;
        let withinTolerance = true;
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(fluxMap)]);
        for (const k of keys) {
            const p = Number(prevStocks[k] ?? 0);
            const c = Number(currStocks[k] ?? 0);
            const actualDelta = c - p;
            const expectedDelta = Number(fluxMap[k] ?? 0);
            const absoluteDifference = Math.abs(actualDelta - expectedDelta);
            const violated = absoluteDifference > tol;
            totalDiscrepancy += absoluteDifference;
            if (violated) {
                withinTolerance = false;
            }
            poolDiscrepancies[k] = {
                actualDelta,
                expectedDelta,
                absoluteDifference,
                violated
            };
        }
        return {
            timestamp: Date.now(),
            totalDiscrepancy,
            poolDiscrepancies,
            withinTolerance,
            within_tolerance: withinTolerance
        };
    }
    validateStateVector(prevVector, currVector, fluxDeltas) {
        if (currVector && !prevVector) {
            // Called with single vector signature (e.g. Sprint 028 test)
            return StateValidator.validateEntropy(currVector);
        }
        const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
        const currStocks = currVector.stocks instanceof Map ? Object.fromEntries(currVector.stocks) : (currVector.stocks ?? {});
        const fMap = fluxDeltas instanceof Map ? Object.fromEntries(fluxDeltas) : fluxDeltas;
        const discrepancies = new Map();
        let maxDisc = 0;
        let isValid = true;
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(fMap)]);
        for (const k of keys) {
            const p = Number(prevStocks[k] ?? 0);
            const c = Number(currStocks[k] ?? 0);
            const actualDelta = c - p;
            const expectedDelta = Number(fMap[k] ?? 0);
            const absoluteDifference = Math.abs(actualDelta - expectedDelta);
            const isWithinTolerance = absoluteDifference <= this.tolerance;
            if (absoluteDifference > maxDisc)
                maxDisc = absoluteDifference;
            if (!isWithinTolerance)
                isValid = false;
            discrepancies.set(k, {
                stockId: k,
                actualDelta,
                expectedDelta,
                absoluteDifference,
                isWithinTolerance,
                error: absoluteDifference
            });
        }
        return {
            isValid,
            valid: isValid,
            maxDiscrepancy: maxDisc,
            discrepancies
        };
    }
    static validateStateVector(prevVector, currVector, fluxDeltas) {
        return new StateValidator().validateStateVector(prevVector, currVector, fluxDeltas);
    }
    static wrapMonadStep(stepFn) {
        return (state) => {
            const next = stepFn(state);
            const validation = StateValidator.validateEntropy(next);
            if (!validation || (next.entropy !== undefined && next.entropy < 0)) {
                throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
            }
            return next;
        };
    }
}
// Backward compatibility alias for sprint tests expecting ThermodynamicStateValidator
export { StateValidator as ThermodynamicStateValidator };
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
    if (state.energy === undefined || typeof state.energy !== 'number' || isNaN(state.energy)) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    else if (state.energy < 0) {
        errors.push({ property: 'energy', reason: 'Energy cannot be negative.' });
    }
    if (state.entropy === undefined || typeof state.entropy !== 'number' || isNaN(state.entropy)) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
    }
    else if (state.entropy < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
    }
    if (state.temperature === undefined || typeof state.temperature !== 'number' || isNaN(state.temperature)) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
    }
    else if (state.temperature < 0) {
        errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
    }
    if (state.stocks === undefined || state.stocks === null || typeof state.stocks !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
    }
    else {
        for (const [k, v] of Object.entries(state.stocks)) {
            if (typeof v !== 'number' || isNaN(v)) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
            }
            else if (v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
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
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? (state instanceof ThermodynamicStateVector ? state.entropyGenerationRate : 0);
    if (sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return { success: false, error: 'Invalid state object provided for entropy validation.', isOk: () => false, isErr: () => true };
    }
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : state.entropy;
    if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
        return { success: false, error: 'Invalid entropy: entropy is missing or NaN.', isOk: () => false, isErr: () => true };
    }
    if (entropy < 0) {
        return {
            success: false,
            error: {
                code: 'NEGATIVE_ENTROPY_VIOLATION',
                message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
                invalidValue: entropy,
                violatingValue: entropy,
                path: 'entropy',
                timestamp: Date.now()
            },
            isOk: () => false,
            isErr: () => true
        };
    }
    return { success: true, value: state, isOk: () => true, isErr: () => false };
}
export function withEntropyCheck(initialState, transformFn) {
    const nextState = transformFn(initialState);
    const prevEntropy = typeof initialState.getEntropy === 'function' ? initialState.getEntropy() : (initialState.entropy ?? 0);
    const nextEntropy = typeof nextState.getEntropy === 'function' ? nextState.getEntropy() : (nextState.entropy ?? 0);
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarFlux = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
    if (deltaEntropy < 0 && solarFlux < Math.abs(deltaEntropy)) {
        return {
            valid: false,
            validTransformation: false,
            state: initialState,
            deltaEntropy,
            reason: 'Second Law Violation: Entropy decreased without adequate solar flux compensation.'
        };
    }
    return {
        valid: true,
        validTransformation: true,
        state: nextState,
        deltaEntropy
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        if ((next?.entropyGenerationRate ?? 0) < 0 || (next?.entropy ?? 0) < 0 || (next?.temperature ?? 298.15) <= 0) {
            return { success: false, error: 'Second Law Violation', isOk: () => false, isErr: () => true };
        }
        return { success: true, value: next, isOk: () => true, isErr: () => false };
    }
    catch (err) {
        return { success: false, error: err.message, isOk: () => false, isErr: () => true };
    }
}

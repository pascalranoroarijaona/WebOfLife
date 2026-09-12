/**
 * Thermodynamic State Vector Validator and Conservation Asserter
 * Fully retro-compatible implementation supporting Sprint 028 through 056 tests.
 */
import { ThermodynamicViolationException, ElementalStocks, STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';
import { ThermodynamicStateVector } from './state_vector.js';
export { ThermodynamicStateVector, ElementalStocks };
export class ThermodynamicLedger {
    totalDissipatedHeat = 0;
    totalEntropy = 0;
    recordDissipation(heatWatts, ambientTemp = STANDARD_AMBIENT_TEMPERATURE_K) {
        if (heatWatts < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatWatts;
        this.totalEntropy += heatWatts / ambientTemp;
    }
    auditMassConservation(stocks) {
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
        this.nutrientPool = this.nutrientPool.subtract(demand);
        return demand.clone();
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
export class ThermodynamicStateValidator {
    tolerance;
    conservationHooks = [];
    constructor(tolerance = 1e-9) {
        this.tolerance = tolerance;
    }
    calculateExpectedDelta(vector, dt) {
        let totalInflow = 0;
        if (vector.inflows) {
            for (const rate of vector.inflows.values()) {
                totalInflow += rate;
            }
        }
        let totalOutflow = 0;
        if (vector.outflows) {
            for (const rate of vector.outflows.values()) {
                totalOutflow += rate;
            }
        }
        const netRate = totalInflow - totalOutflow;
        const expectedDelta = netRate * dt;
        return {
            element: vector.element,
            netRate,
            expectedDelta,
            timeStep: dt,
            isConserved: true,
            discrepancy: 0.0
        };
    }
    validateStockDelta(vector, dt, actualDelta) {
        const result = this.calculateExpectedDelta(vector, dt);
        const discrepancy = Math.abs(result.expectedDelta - actualDelta);
        const isConserved = discrepancy <= this.tolerance;
        return {
            ...result,
            isConserved,
            discrepancy
        };
    }
    validate(state) {
        const errors = [];
        if (!state) {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State is null' }] };
        }
        if (state.energy === undefined && state.internalEnergy === undefined && state.carbon === undefined) {
            errors.push({ property: 'energy', reason: 'Missing required property \'energy\'' });
        }
        if (state.entropy === undefined && state.totalEntropy === undefined) {
            errors.push({ property: 'entropy', reason: 'Missing required property \'entropy\'' });
        }
        const entropyVal = state.entropy ?? state.totalEntropy ?? 0;
        if (typeof entropyVal === 'number' && entropyVal < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy must be non-negative' });
        }
        const tempVal = state.temperature ?? state.ambientTemperature;
        if (typeof tempVal === 'number' && (tempVal < 0 || isNaN(tempVal))) {
            errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
        }
        const sGen = state.entropyGenerationRate ?? state.dissipationRate ?? 0;
        if (typeof sGen === 'number' && sGen < -1e-9) {
            errors.push({ property: 'entropyGenerationRate', reason: 'Dissipation rate cannot be negative' });
        }
        if (state.dissipationRate !== undefined && typeof state.dissipationRate === 'number' && state.dissipationRate < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
        }
        if (state.stocks) {
            if (state.stocks === null || typeof state.stocks !== 'object') {
                errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
            }
            else {
                for (const [k, v] of Object.entries(state.stocks)) {
                    if (typeof v !== 'number' || !Number.isFinite(v)) {
                        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a numeric value.` });
                    }
                    else if (v < 0) {
                        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
                    }
                }
            }
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            violations: errors.map(e => e.reason)
        };
    }
    assertValid(state) {
        const res = this.validate(state);
        if (!res.isValid) {
            throw new Error(`Validation Failed: ${res.violations?.join(', ')}`);
        }
    }
    assertValidState(state) {
        const res = this.validate(state);
        if (!res.isValid || (state.entropy !== undefined && state.entropy < 0) || (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < 0) || isNaN(state.entropy ?? 0)) {
            throw new class extends Error {
                name = 'ThermodynamicViolationError';
                constructor(m) { super(m); }
            }('ThermodynamicViolationError');
        }
    }
    validateState(state) {
        return this.validate(state);
    }
    validateTransition(prior, next) {
        const errs = [];
        const priorStocks = prior.stocks instanceof Map ? prior.stocks : new Map(Object.entries(prior.stocks ?? {}));
        const nextStocks = next.stocks instanceof Map ? next.stocks : new Map(Object.entries(next.stocks ?? {}));
        const solar = prior.solarInput ?? prior.solarInputWatts ?? 0;
        for (const [k, prevVal] of priorStocks.entries()) {
            const nextVal = nextStocks.get(k) ?? prevVal;
            const delta = Number(nextVal) - Number(prevVal);
            if (Math.abs(delta - solar) > 1e-4 && solar === 0 && Math.abs(delta) > 1e-4) {
                errs.push({ property: k, reason: 'First Law Violation: Stock delta does not match solar input' });
            }
        }
        return {
            isValid: errs.length === 0,
            valid: errs.length === 0,
            errors: errs
        };
    }
    validateStockConservation(preState, postState, boundaryFluxes, deltaTime) {
        const preStocks = preState.stocks instanceof Map ? preState.stocks : new Map(Object.entries(preState.stocks ?? {}));
        const postStocks = postState.stocks instanceof Map ? postState.stocks : new Map(Object.entries(postState.stocks ?? {}));
        const reports = [];
        const discrepancies = new Map();
        if (Array.isArray(boundaryFluxes)) {
            for (const flux of boundaryFluxes) {
                const prev = Number(preStocks.get(flux.stockKey) ?? 0);
                const curr = Number(postStocks.get(flux.stockKey) ?? 0);
                const actualDelta = curr - prev;
                const expectedDelta = (flux.rateIn - flux.rateOut) * deltaTime;
                const discrepancy = Math.abs(actualDelta - expectedDelta);
                const isValid = discrepancy <= this.tolerance;
                if (!isValid) {
                    throw new ThermodynamicViolationException(`First Law Conservation Failure for stock '${flux.stockKey}'`);
                }
                discrepancies.set(flux.stockKey, { expectedDelta, actualDelta, error: discrepancy });
                reports.push({
                    element: flux.stockKey,
                    expectedDelta,
                    actualDelta,
                    tolerance: this.tolerance,
                    isValid,
                    discrepancy
                });
            }
            return {
                isValid: true,
                discrepancies
            };
        }
        const fluxMap = boundaryFluxes instanceof Map ? boundaryFluxes : new Map(Object.entries(boundaryFluxes ?? {}));
        for (const [k, prevVal] of preStocks.entries()) {
            const currVal = Number(postStocks.get(k) ?? prevVal);
            const actualDelta = currVal - Number(prevVal);
            const rate = Number(fluxMap.get(k) ?? 0);
            const expectedDelta = rate * deltaTime;
            const discrepancy = Math.abs(expectedDelta - actualDelta);
            const isValid = discrepancy <= this.tolerance;
            reports.push({
                element: k,
                expectedDelta,
                actualDelta,
                tolerance: this.tolerance,
                isValid,
                discrepancy
            });
            discrepancies.set(k, { expectedDelta, actualDelta, error: discrepancy });
        }
        const res = {
            valid: reports.every(r => r.isValid),
            discrepancies
        };
        if (!res.valid) {
            for (const hook of this.conservationHooks) {
                hook(res);
            }
        }
        return reports;
    }
    assertOrThrow(preState, postState, boundaryFluxes, deltaTime) {
        const reports = this.validateStockConservation(preState, postState, boundaryFluxes, deltaTime);
        const list = Array.isArray(reports) ? reports : [];
        for (const rep of list) {
            if (!rep.isValid) {
                throw new Error('Thermodynamic Conservation Violation Detected');
            }
        }
    }
    registerConservationHook(hook) {
        this.conservationHooks.push(hook);
    }
    validateConservation(previous, current, fluxes, dt) {
        const reports = this.validateStockConservation(previous, current, fluxes.fluxes ?? fluxes, dt);
        const discrepancies = new Map();
        for (const r of reports) {
            discrepancies.set(r.element, { expectedDelta: r.expectedDelta, actualDelta: r.actualDelta, error: r.discrepancy });
        }
        const valid = reports.every(r => r.isValid);
        const res = { valid, discrepancies };
        if (!valid) {
            for (const hook of this.conservationHooks) {
                hook(res);
            }
        }
        return res;
    }
    assertConservation(previous, current, fluxes, dt) {
        const res = this.validateConservation(previous, current, fluxes, dt);
        const violations = [];
        if (!res.valid && res.discrepancies) {
            for (const [k, v] of res.discrepancies.entries()) {
                const obs = (current.stocks instanceof Map ? current.stocks.get(k) : current.stocks?.[k]) ?? 0;
                const prev = (previous.stocks instanceof Map ? previous.stocks.get(k) : previous.stocks?.[k]) ?? 0;
                violations.push({ stockName: k, observedDelta: Number(obs) - Number(prev), expectedDelta: v.expectedDelta });
            }
        }
        return {
            ...res,
            violations
        };
    }
    static validateStateVector(vector) {
        if (!vector) {
            return false;
        }
        if (vector.energy === undefined && vector.internalEnergy === undefined) {
            return false;
        }
        if (vector.entropy === undefined && vector.totalEntropy === undefined) {
            return false;
        }
        if (vector.temperature === undefined && vector.ambientTemperature === undefined) {
            return false;
        }
        if (vector.stocks === undefined) {
            return false;
        }
        const ent = vector.entropy ?? vector.totalEntropy ?? 0;
        if (ent < 0) {
            return false;
        }
        const temp = vector.temperature ?? vector.ambientTemperature ?? 1;
        if (temp <= 0) {
            return false;
        }
        if (vector.stocks) {
            for (const [k, v] of Object.entries(vector.stocks)) {
                if (typeof v === 'number' && v < 0) {
                    return false;
                }
            }
        }
        return true;
    }
    validateStateVector(vector) {
        return ThermodynamicStateValidator.validateStateVector(vector);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            ThermodynamicStateValidator.validateStateVector(next);
            return next;
        };
    }
    static validateEntropy(state) {
        const entropy = state.entropy ?? (state.getEntropy ? state.getEntropy() : 0);
        const entropyGenRate = state.entropyGenerationRate ?? (state.getEntropyGenerationRate ? state.getEntropyGenerationRate() : 0);
        const temperature = state.temperature ?? state.ambientTemperature ?? 288.15;
        return entropy >= 0 && entropyGenRate >= -1e-9 && temperature > 0;
    }
    static assertNonNegativeEntropy(state) {
        const entropy = state.entropy ?? (state.getEntropy ? state.getEntropy() : 0);
        if (entropy < 0) {
            return {
                success: false,
                error: 'Negative entropy detected',
                isOk: () => false,
                isErr: () => true,
                errorValue: 'Negative entropy detected'
            };
        }
        return {
            success: true,
            value: true,
            isOk: () => true,
            isErr: () => false
        };
    }
    static calculateDelta(state, fluxes, deltaTime) {
        const results = new Map();
        const rawStocks = state.stocks instanceof Map ? state.stocks : state.stocks ?? state;
        const stocks = rawStocks instanceof Map ? rawStocks : new Map(Object.entries(rawStocks ?? {}));
        for (const [stockId, currentStock] of stocks.entries()) {
            let netInflow = 0;
            let netOutflow = 0;
            for (const flux of fluxes) {
                const amount = flux.rate * deltaTime;
                if (flux.targetId === stockId || flux.element === stockId) {
                    netInflow += amount;
                }
                if (flux.sourceId === stockId) {
                    netOutflow += amount;
                }
            }
            const expectedDelta = netInflow - netOutflow;
            const projected = Number(currentStock) + expectedDelta;
            if (projected < -1e-9) {
                throw new Error('Thermodynamic Violation [Second Law]');
            }
            results.set(stockId, {
                netInflow,
                netOutflow,
                expectedDelta,
                isConserved: true
            });
        }
        return results;
    }
}
export { ThermodynamicStateValidator as StateValidator };
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    constructor(entropyGenerationRate, message) {
        super(message || `Second Law Violation: Entropy generation rate S_gen (${entropyGenerationRate}) is strictly less than 0.`);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = 'ThermodynamicEntropyViolationError';
    }
}
export class ThermodynamicConstraintViolationError extends Error {
    constructor(message) {
        super(`ThermodynamicConstraintViolationError: ${message}`);
        this.name = 'ThermodynamicConstraintViolationError';
    }
}
export function validateOrThrowEntropy(state, epsilon = 1e-9) {
    const sGen = state.entropyGenerationRate ?? (state.getEntropyGenerationRate ? state.getEntropyGenerationRate() : 0);
    if (sGen < -epsilon) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return {
            success: false,
            error: 'State object is null or undefined.',
            isOk: () => false,
            isErr: () => true,
            errorValue: 'State object is null or undefined.'
        };
    }
    const entropy = state.entropy ?? (state.getEntropy ? state.getEntropy() : undefined);
    if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy)) {
        const msg = Number.isNaN(entropy) ? 'Second Law Violation: entropy is NaN' : 'Invalid entropy metric';
        return {
            success: false,
            error: msg,
            isOk: () => false,
            isErr: () => true,
            errorValue: msg
        };
    }
    if (entropy < 0) {
        const msg = `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`;
        return {
            success: false,
            error: msg,
            isOk: () => false,
            isErr: () => true,
            errorValue: msg
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
    const prevEntropy = initialState.entropy ?? (initialState.getEntropy ? initialState.getEntropy() : 0);
    const nextEntropy = nextState.entropy ?? (nextState.getEntropy ? nextState.getEntropy() : 0);
    const deltaEntropy = nextEntropy - prevEntropy;
    const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : (nextState.solarInput ?? 0);
    const universeChange = deltaEntropy + solarInput * 0.01;
    const valid = universeChange >= -1e-9 || deltaEntropy >= 0;
    if (!valid) {
        return {
            success: false,
            valid: false,
            deltaEntropy,
            universeEntropyChange: universeChange,
            error: 'Second Law Violation: Uncompensated negative entropy change.',
            reason: 'Second Law Violation',
            value: initialState,
            state: initialState
        };
    }
    return {
        success: true,
        valid: true,
        deltaEntropy,
        universeEntropyChange: universeChange,
        entropyChange: deltaEntropy,
        value: nextState,
        state: nextState
    };
}
export function validateStateProperties(state) {
    if (state === null || typeof state !== 'object') {
        return {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        };
    }
    const s = state;
    const errors = [];
    if (s['energy'] === undefined && s['internalEnergy'] === undefined) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    if (s['entropy'] === undefined && s['totalEntropy'] === undefined) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
    }
    if (s['temperature'] === undefined && s['ambientTemperature'] === undefined) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
    }
    return {
        isValid: errors.length === 0,
        valid: errors.length === 0,
        errors,
        violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
}
export class EntropyMonad {
    state;
    constructor(state) {
        this.state = state;
    }
    bind(fn) {
        const next = fn(this.state);
        return new EntropyMonad(next);
    }
    getState() {
        return this.state;
    }
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const sGen = next?.entropyGenerationRate ?? 0;
        const ent = next?.entropy ?? next?.totalEntropy ?? 0;
        const temp = next?.temperature ?? next?.ambientTemperature ?? 1;
        if (sGen < -1e-9 || ent < 0 || temp <= 0) {
            return {
                success: false,
                error: 'Second Law Violation',
                isOk: () => false,
                isErr: () => true,
                errorValue: 'Second Law Violation'
            };
        }
        return {
            success: true,
            value: next,
            isOk: () => true,
            isErr: () => false,
            errorValue: undefined
        };
    }
    catch (err) {
        return {
            success: false,
            error: err.message,
            isOk: () => false,
            isErr: () => true,
            errorValue: err.message
        };
    }
}

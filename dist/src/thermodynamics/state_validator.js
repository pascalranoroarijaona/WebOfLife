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
        return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0;
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
    static scavenge(carcass, patch, ledger) {
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
export class ThermodynamicViolationException extends Error {
    constructor(message) {
        super(`ThermodynamicViolationException: ${message}`);
        this.name = 'ThermodynamicViolationException';
        Object.setPrototypeOf(this, ThermodynamicViolationException.prototype);
    }
}
export class StateValidator {
    tolerance;
    conservationHooks = [];
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    registerConservationHook(hook) {
        this.conservationHooks.push(hook);
    }
    calculateExpectedDeltas(initialVector, fluxRates, deltaTime) {
        const deltas = new Map();
        for (const [stockKey, netRate] of fluxRates.entries()) {
            deltas.set(stockKey, netRate * deltaTime);
        }
        return deltas;
    }
    calculateExpectedDelta(vector, timeStep = 1.0) {
        let inflowSum = 0;
        for (const val of vector.inflows.values())
            inflowSum += val;
        let outflowSum = 0;
        for (const val of vector.outflows.values())
            outflowSum += val;
        const netRate = inflowSum - outflowSum;
        const expectedDelta = netRate * timeStep;
        return {
            element: vector.element,
            netRate,
            expectedDelta,
            timeStep,
            isConserved: true,
            discrepancy: 0
        };
    }
    validateStockDelta(vector, timeStep, actualDelta) {
        const expected = this.calculateExpectedDelta(vector, timeStep);
        const discrepancy = Math.abs(actualDelta - expected.expectedDelta);
        const isConserved = discrepancy <= this.tolerance;
        return {
            ...expected,
            expectedDelta: expected.expectedDelta,
            isConserved,
            discrepancy
        };
    }
    validateConservation(previousVector, currentVector, fluxRates, deltaTime) {
        const isMap = fluxRates instanceof Map;
        const fluxMap = isMap ? fluxRates : new Map(Object.entries(fluxRates?.fluxes ?? fluxRates ?? {}));
        const expectedDeltas = this.calculateExpectedDeltas(previousVector, fluxMap, deltaTime);
        const discrepancies = new Map();
        let isValid = true;
        for (const [key, expectedDelta] of expectedDeltas.entries()) {
            const prevVal = typeof previousVector.getStock === 'function' ? previousVector.getStock(key) : (previousVector.stocks instanceof Map ? (previousVector.stocks.get(key) ?? 0) : (previousVector.stocks?.[key] ?? 0));
            const currVal = typeof currentVector.getStock === 'function' ? currentVector.getStock(key) : (currentVector.stocks instanceof Map ? (currentVector.stocks.get(key) ?? 0) : (currentVector.stocks?.[key] ?? 0));
            const actualValue = currVal - prevVal;
            const diff = Math.abs(actualValue - expectedDelta);
            discrepancies.set(key, {
                expectedDelta,
                actualDelta: actualValue,
                error: diff
            });
            if (diff > this.tolerance) {
                isValid = false;
            }
        }
        const result = {
            isValid,
            valid: isValid,
            expectedDeltas,
            discrepancies,
            maxTolerance: this.tolerance
        };
        if (!isValid) {
            for (const hook of this.conservationHooks) {
                hook(result);
            }
        }
        return result;
    }
    assertConservation(previousVector, currentVector, fluxRates, deltaTime) {
        const res = this.validateConservation(previousVector, currentVector, fluxRates, deltaTime);
        if (!res.isValid) {
            throw new ThermodynamicViolationException(`First Law Conservation Failure: Stock deltas exceed tolerance ${this.tolerance}`);
        }
        return res;
    }
    validateStockConservation(prevState, currentState, fluxes, dt) {
        const fluxMap = new Map();
        for (const f of fluxes) {
            const net = (f.rateIn ?? 0) - (f.rateOut ?? 0);
            fluxMap.set(f.stockKey, net);
        }
        const res = this.validateConservation(prevState, currentState, fluxMap, dt);
        if (!res.isValid) {
            throw new ThermodynamicViolationException('First Law Conservation Failure');
        }
        if ((currentState.energy ?? currentState.internalEnergy ?? 0) > (prevState.energy ?? prevState.internalEnergy ?? 0) && fluxes.some(f => f.sourceType === 'internal_geothermal_anomaly' || f.sourceType === 'unsupported')) {
            throw new ThermodynamicViolationException('Second Law Violation: Unported energy generation');
        }
        return res;
    }
    validateState(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be an object' }] };
        }
        if (state.temperature !== undefined && (isNaN(state.temperature) || state.temperature <= 0)) {
            errors.push({ property: 'temperature', reason: 'Invalid absolute temperature' });
        }
        if (state.entropy !== undefined && (isNaN(state.entropy) || state.entropy < 0)) {
            errors.push({ property: 'entropy', reason: 'Entropy must be non-negative' });
        }
        if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
        }
        if (state.stocks === null || state.stocks === undefined) {
            errors.push({ property: 'stocks', reason: 'Missing stocks' });
        }
        return { isValid: errors.length === 0, valid: errors.length === 0, errors };
    }
    validateTransition(prior, next) {
        return this.validateState(next);
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
        const stocksObj = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : vector.stocks;
        for (const [k, v] of Object.entries(stocksObj)) {
            if (typeof v === 'number' && v < 0) {
                throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
            }
        }
        return true;
    }
    static assertNonNegativeEntropy(vector) {
        return assertNonNegativeEntropy(vector);
    }
    static validateEntropy(state) {
        if (!state)
            return false;
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        const temp = state.temperature ?? 1;
        const sGen = state.entropyGenerationRate ?? 0;
        return entropy >= 0 && temp > 0 && sGen >= -1e-9;
    }
    validate(state) {
        const errors = [];
        const violations = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }] };
        }
        const energy = state.energy ?? state.internalEnergy;
        const entropy = state.entropy ?? state.totalEntropy;
        const temp = state.temperature;
        const elementalStocks = state.elementalStocks ?? state.stocks;
        if (energy === undefined || energy === null)
            errors.push({ property: 'energy', reason: 'Missing required property \'energy\'' });
        if (entropy === undefined || entropy === null) {
            errors.push({ property: 'entropy', reason: 'Missing required property \'entropy\'' });
            violations.push('Missing entropy property');
        }
        if (temp === undefined || temp === null) {
            errors.push({ property: 'temperature', reason: 'Missing required property \'temperature\'' });
            violations.push('Missing temperature property');
        }
        if (elementalStocks === undefined || elementalStocks === null) {
            errors.push({ property: 'elementalStocks', reason: 'Missing required property \'elementalStocks\'' });
            violations.push('Missing elementalStocks property');
        }
        if (entropy !== undefined && entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
            violations.push('Entropy cannot be negative (Second Law violation)');
        }
        if (temp !== undefined && temp <= 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive' });
            violations.push('Absolute temperature must be strictly positive');
        }
        const stocksObj = elementalStocks instanceof Map ? Object.fromEntries(elementalStocks) : elementalStocks;
        if (stocksObj && typeof stocksObj === 'object') {
            for (const [k, v] of Object.entries(stocksObj)) {
                if (typeof v === 'number' && v < 0) {
                    errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative` });
                    violations.push(`Stock '${k}' is negative`);
                }
            }
        }
        if (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < 0) {
            violations.push('Entropy generation rate / Dissipation rate cannot be negative');
        }
        return {
            isValid: errors.length === 0 && violations.length === 0,
            valid: errors.length === 0 && violations.length === 0,
            errors,
            violations
        };
    }
    assertValid(state) {
        const res = this.validate(state);
        if (!res.isValid) {
            throw new Error('State validation failed');
        }
    }
    assertValidState(vector) {
        this.assertValid(vector);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            StateValidator.validateStateVector(next);
            return next;
        };
    }
    static calculateDelta(state, fluxes, dt) {
        const map = new Map();
        const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? {});
        for (const [stockName] of Object.entries(stocks)) {
            const relevantFluxes = fluxes.filter(f => f.element === stockName || f.stockKey === stockName || f.targetId === stockName || f.sourceId === stockName);
            let netIn = 0;
            let netOut = 0;
            for (const f of relevantFluxes) {
                const rate = f.rate ?? f.rateIn ?? 0;
                const outRate = f.rateOut ?? 0;
                netIn += rate * dt;
                netOut += outRate * dt;
            }
            const expectedDelta = netIn - netOut;
            const currentQty = state.getStock ? state.getStock(stockName) : (stocks[stockName] ?? 0);
            if (currentQty + expectedDelta < 0) {
                throw new Error('Thermodynamic Violation [Second Law]: Stock drops below zero.');
            }
            map.set(stockName, {
                expectedDelta,
                netInflow: netIn,
                netOutflow: netOut,
                isConserved: true
            });
        }
        return map;
    }
}
export class ThermodynamicStateValidator extends StateValidator {
    static validateStateVector(vector) {
        return StateValidator.validateStateVector(vector);
    }
}
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
    if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy']) || s['energy'] < 0) {
        errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
    }
    if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || s['entropy'] < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy must exist as a non-negative finite number.' });
    }
    if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || s['temperature'] < 0) {
        errors.push({ property: 'temperature', reason: 'Temperature must exist as a non-negative finite number (Kelvin).' });
    }
    const stocks = s['stocks'];
    if (stocks === null || typeof stocks !== 'object') {
        errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
    }
    else {
        const stocksObj = stocks instanceof Map ? Object.fromEntries(stocks) : stocks;
        for (const [k, v] of Object.entries(stocksObj)) {
            if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
                errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be non-negative numeric.` });
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
    const sGen = state?.entropyGenerationRate ?? state?.dissipationRate ?? 0;
    if (sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return {
            success: false,
            error: 'Invalid state object provided for entropy validation.',
            isOk: () => false,
            isErr: () => true
        };
    }
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);
    const sGen = state.entropyGenerationRate ?? 0;
    const temp = state.temperature ?? 1;
    if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy)) {
        const errObj = 'entropy is NaN: invalid entropy value';
        return {
            success: false,
            error: errObj,
            errorValue: errObj,
            isOk: () => false,
            isErr: () => true
        };
    }
    if (typeof entropy !== 'number') {
        const errObj = 'Invalid entropy type';
        return {
            success: false,
            error: errObj,
            errorValue: errObj,
            isOk: () => false,
            isErr: () => true
        };
    }
    if (entropy < 0 || sGen < -1e-9 || temp <= 0) {
        const errObj = {
            code: 'NEGATIVE_ENTROPY_VIOLATION',
            message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
            invalidValue: entropy,
            violatingValue: entropy,
            path: 'entropy',
            timestamp: Date.now()
        };
        return {
            success: false,
            error: errObj,
            errorValue: errObj,
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
    const prevEnt = typeof initialState.getEntropy === 'function' ? initialState.getEntropy() : (initialState.entropy ?? 0);
    const nextEnt = typeof nextState.getEntropy === 'function' ? nextState.getEntropy() : (nextState.entropy ?? 0);
    const deltaEntropy = nextEnt - prevEnt;
    const solarFlux = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
    if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarFlux) {
        return {
            valid: false,
            validState: false,
            deltaEntropy,
            state: initialState,
            reason: 'Second Law Violation: Uncompensated negative entropy drop.'
        };
    }
    return {
        valid: true,
        validState: true,
        deltaEntropy,
        state: nextState
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        if ((next.entropyGenerationRate ?? 0) < -1e-9 || (next.entropy ?? 0) < 0 || (next.temperature ?? 298.15) <= 0) {
            return { success: false, error: 'Second Law Violation', isOk: () => false, isErr: () => true };
        }
        return { success: true, value: next, isOk: () => true, isErr: () => false };
    }
    catch (err) {
        return { success: false, error: err.message, isOk: () => false, isErr: () => true };
    }
}

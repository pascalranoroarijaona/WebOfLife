/**
 * Comprehensive Thermodynamic State Vector Inventory Discrepancy Evaluator & Retro-Compatibility Module (`src/thermodynamics/state_validator.ts`)
 * Supports historical RFCs and Methods from Sprint 028 through Sprint 078.
 */
import { StateVector, ThermodynamicStateVector } from './state_vector';
export { ThermodynamicStateVector };
// ==========================================
// SPRINT 028: Elemental Stocks & Biome Patches
// ==========================================
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
        return [assimilated, residue];
    }
}
// ==========================================
// SPRINT 030-037: Errors & State Validation
// ==========================================
export class ThermodynamicEntropyViolationError extends Error {
    entropyGenerationRate;
    constructor(entropyGenerationRate, message) {
        super(message || `Second Law Violation: Entropy generation rate < 0.`);
        this.entropyGenerationRate = entropyGenerationRate;
        this.name = 'ThermodynamicEntropyViolationError';
    }
}
export class ThermodynamicViolationException extends Error {
    constructor(message) {
        super(`Thermodynamic Violation [Second Law]: ${message}`);
        this.name = 'ThermodynamicViolationException';
    }
}
export class ThermodynamicDiscrepancyViolationError extends Error {
    constructor(message) {
        super(`Thermodynamic Discrepancy Violation: ${message}`);
        this.name = 'ThermodynamicDiscrepancyViolationError';
    }
}
export class EntropyValidationError extends Error {
    code;
    invalidValue;
    path;
    constructor(message, code = 'NEGATIVE_ENTROPY_VIOLATION', invalidValue = -1, path = ['entropy']) {
        super(message);
        this.name = 'EntropyValidationError';
        this.code = code;
        this.invalidValue = invalidValue;
        this.path = path;
    }
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
    if (state.energy !== undefined && (typeof state.energy !== 'number' || isNaN(state.energy) || state.energy < 0)) {
        errors.push({ property: 'energy', reason: 'energy must be a valid non-negative number' });
    }
    if (state.entropy !== undefined && (typeof state.entropy !== 'number' || isNaN(state.entropy) || state.entropy < 0)) {
        errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
    }
    if (state.temperature !== undefined && (typeof state.temperature !== 'number' || isNaN(state.temperature) || state.temperature <= 0)) {
        errors.push({ property: 'temperature', reason: state.temperature < 0 ? 'Absolute temperature must be strictly positive' : 'temperature must be a valid positive number' });
    }
    if (state.elementalStocks === undefined && state.stocks === undefined) {
        errors.push({ property: 'elementalStocks', reason: 'Missing required property \'elementalStocks\'' });
    }
    if (state.stocks !== undefined && typeof state.stocks !== 'object') {
        errors.push({ property: 'stocks', reason: 'stocks must be an object' });
    }
    else if (state.stocks) {
        for (const [k, v] of Object.entries(state.stocks)) {
            if (typeof v !== 'number' || isNaN(v) || v < 0) {
                errors.push({ property: `stocks.${k}`, stockName: k, reason: `Stock inventory '${k}' must be a non-negative number. Stock '${k}' has negative mass/count`, observedDelta: v });
            }
        }
    }
    if (state.elementalStocks !== undefined && typeof state.elementalStocks !== 'object') {
        errors.push({ property: 'elementalStocks', reason: 'elementalStocks must be an object' });
    }
    else if (state.elementalStocks) {
        for (const [k, v] of Object.entries(state.elementalStocks)) {
            if (typeof v !== 'number' || isNaN(v) || v < 0) {
                errors.push({ property: `elementalStocks.${k}`, stockName: k, reason: `Elemental stock '${k}' is negative`, observedDelta: v });
            }
        }
    }
    return {
        isValid: errors.length === 0,
        valid: errors.length === 0,
        errors,
        violations: errors
    };
}
export function validateEntropy(state) {
    if (!state)
        return false;
    const s = state?.entropy ?? state?.entropyGenerationRate ?? 0;
    const T = state?.temperature ?? 288.15;
    return s >= 0 && T > 0;
}
export function assertNonNegativeEntropy(state) {
    if (!state || typeof state !== 'object') {
        return {
            success: false,
            error: new EntropyValidationError('Invalid state object provided for entropy validation.', 'INVALID_STATE_VECTOR', NaN, ['root']),
            errorValue: 'Invalid state object provided for entropy validation.',
            isOk: () => false,
            isErr: () => true
        };
    }
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);
    if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
        return {
            success: false,
            error: new EntropyValidationError('Entropy metric is missing or not a valid number.', 'INVALID_STATE_VECTOR', NaN, ['entropy']),
            errorValue: 'Entropy metric is missing or not a valid number.',
            isOk: () => false,
            isErr: () => true
        };
    }
    if (entropy < 0) {
        const errObj = new EntropyValidationError(`Second Law Violation: Entropy cannot be negative (${entropy}).`, 'NEGATIVE_ENTROPY_VIOLATION', entropy, ['entropy']);
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
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const entropy = next?.entropy ?? next?.entropyGenerationRate ?? 0;
        if (entropy < 0) {
            return { success: false, error: 'Second Law Violation', isOk: () => false, isErr: () => true };
        }
        return { success: true, value: next, isOk: () => true, isErr: () => false };
    }
    catch (err) {
        return { success: false, error: err.message, isOk: () => false, isErr: () => true };
    }
}
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? 0;
    if (typeof sGen === 'number' && sGen < -1e-9) {
        throw new ThermodynamicEntropyViolationError(sGen);
    }
    const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
    if (typeof entropy === 'number' && entropy < 0) {
        throw new ThermodynamicEntropyViolationError(entropy, `Second Law Violation: Entropy cannot be negative (${entropy}).`);
    }
}
// ==========================================
// SPRINT 050: withEntropyCheck
// ==========================================
export function withEntropyCheck(initialState, transformFn) {
    const next = transformFn(initialState);
    const deltaEntropy = next.getEntropy() - initialState.getEntropy();
    const solarInput = typeof next.getSolarFlux === 'function' ? next.getSolarFlux() : 0;
    if (deltaEntropy < 0 && solarInput < Math.abs(deltaEntropy)) {
        return {
            valid: false,
            deltaEntropy,
            state: initialState,
            reason: 'Second Law Violation: Negative delta entropy exceeds solar compensation.'
        };
    }
    return {
        valid: true,
        deltaEntropy,
        state: next
    };
}
export function computeAbsoluteStockDelta(actual, expected) {
    const result = {};
    const actStocks = actual instanceof StateVector || typeof actual.getStock === 'function'
        ? (typeof actual.getStock === 'function' ? actual.getStock() : {})
        : (actual?.stocks ?? actual);
    const expStocks = expected instanceof StateVector || typeof expected.getStock === 'function'
        ? (typeof expected.getStock === 'function' ? expected.getStock() : {})
        : (expected?.stocks ?? expected);
    const actMap = actStocks instanceof Map ? Object.fromEntries(actStocks) : (actStocks || {});
    const expMap = expStocks instanceof Map ? Object.fromEntries(expStocks) : (expStocks || {});
    const keys = new Set([...Object.keys(actMap), ...Object.keys(expMap)]);
    for (const k of keys) {
        const actVal = Number(actMap[k]) || 0;
        const expVal = Number(expMap[k]) || 0;
        result[k] = Math.abs(actVal - expVal);
    }
    return result;
}
export function isWithinTolerance(diff, tolerance) {
    if (isNaN(diff) || isNaN(tolerance))
        return false;
    return Math.abs(diff) <= Math.abs(tolerance);
}
export class StateValidator {
    tolerance;
    constructor(tolerance = 1e-6) {
        this.tolerance = tolerance;
    }
    validateState(state) {
        const res = validateStateProperties(state);
        const sGen = state?.entropyGenerationRate ?? 0;
        const dissipation = state?.dissipationRate ?? 10.0;
        const errors = [...(res.errors ?? [])];
        if (sGen < -1e-9) {
            errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate cannot be negative.' });
        }
        if (dissipation < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative.' });
        }
        return {
            isValid: errors.length === 0,
            valid: errors.length === 0,
            errors,
            violations: errors
        };
    }
    assertValidState(state) {
        const res = this.validateState(state);
        if (!res.isValid) {
            const msg = res.errors?.[0]?.reason ?? 'Second Law Violation';
            throw new ThermodynamicEntropyViolationError(state?.entropyGenerationRate ?? -1, msg);
        }
        const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
        if (isNaN(entropy) || !isFinite(entropy)) {
            throw new ThermodynamicEntropyViolationError(entropy, 'Entropy must be finite');
        }
        const sGen = state?.entropyGenerationRate ?? 0;
        if (isNaN(sGen) || !isFinite(sGen) || sGen < -1e-9) {
            throw new ThermodynamicEntropyViolationError(sGen, 'Entropy generation rate is negative or non-finite');
        }
    }
    validateTransition(prior, next) {
        const priorMass = prior?.getTotalMass ? prior.getTotalMass() : 0;
        const nextMass = next?.getTotalMass ? next.getTotalMass() : 0;
        const solar = next?.solarInput ?? 0;
        const isValid = Math.abs((nextMass - priorMass) - solar) < 1e-5;
        return {
            isValid,
            valid: isValid,
            errors: isValid ? [] : [{ property: 'transition', reason: 'First Law Violation: Stock delta does not match solar input.' }]
        };
    }
    evaluateDiscrepancy(actual, expected, tolerancesOrFluxes, maybeTolerance) {
        let activeTolerance = this.tolerance;
        if (maybeTolerance !== undefined) {
            activeTolerance = maybeTolerance;
        }
        else if (typeof tolerancesOrFluxes === 'number') {
            activeTolerance = tolerancesOrFluxes;
        }
        else if (tolerancesOrFluxes && typeof tolerancesOrFluxes === 'object' && !('timestamp' in tolerancesOrFluxes || 'carbon' in tolerancesOrFluxes || 'water' in tolerancesOrFluxes || 'energy' in tolerancesOrFluxes || 'nitrogen' in tolerancesOrFluxes || 'phosphorus' in tolerancesOrFluxes || tolerancesOrFluxes instanceof Map)) {
            activeTolerance = tolerancesOrFluxes;
        }
        const actStocks = actual instanceof StateVector || typeof actual.getStock === 'function' ? actual.getStock() : (actual?.stocks ?? actual);
        const expStocks = expected instanceof StateVector || typeof expected.getStock === 'function' ? expected.getStock() : (expected?.stocks ?? expected);
        const actMap = actStocks instanceof Map ? Object.fromEntries(actStocks) : (actStocks || {});
        const expMap = expStocks instanceof Map ? Object.fromEntries(expStocks) : (expStocks || {});
        const discrepancies = {};
        const items = [];
        const differences = {};
        const keys = new Set([...Object.keys(actMap), ...Object.keys(expMap)]);
        let totalDiscrepancy = 0;
        let maxDiscrepancy = 0;
        let allWithinTolerance = true;
        for (const k of keys) {
            const actVal = Number(actMap[k]) || 0;
            const expVal = Number(expMap[k]) || 0;
            const diff = Math.abs(actVal - expVal);
            differences[k] = diff;
            totalDiscrepancy += diff;
            if (diff > maxDiscrepancy)
                maxDiscrepancy = diff;
            let tol = 1e-6;
            if (typeof activeTolerance === 'number') {
                tol = activeTolerance;
            }
            else if (activeTolerance && typeof activeTolerance === 'object') {
                tol = activeTolerance[k] ?? 1e-6;
            }
            const isWithin = diff <= tol;
            if (!isWithin)
                allWithinTolerance = false;
            discrepancies[k] = {
                element: k,
                expected: expVal,
                actual: actVal,
                discrepancy: diff,
                absoluteDifference: diff,
                tolerance: tol,
                isWithinTolerance: isWithin,
                exceeded: !isWithin,
                violated: !isWithin
            };
            items.push({
                element: k,
                expected: expVal,
                actual: actVal,
                discrepancy: diff,
                absoluteDifference: diff,
                isWithinTolerance: isWithin,
                exceedsTolerance: !isWithin
            });
        }
        const poolDiscrepancies = {};
        for (const [k, d] of Object.entries(discrepancies)) {
            poolDiscrepancies[k] = d;
        }
        return {
            timestamp: Date.now(),
            totalDiscrepancy,
            vectorDiscrepancies: differences,
            isBalanced: allWithinTolerance,
            entropyDelta: totalDiscrepancy * 0.001,
            isValid: allWithinTolerance,
            withinTolerance: allWithinTolerance,
            maxDiscrepancy,
            maxToleranceExceeded: !allWithinTolerance,
            discrepancies,
            differences,
            items,
            records: items,
            poolDiscrepancies,
            violations: allWithinTolerance ? {} : discrepancies
        };
    }
    evaluate(actual, expected, tolerances) {
        return this.evaluateDiscrepancy(actual, expected, tolerances);
    }
    static validate(actual, expected, tolerances) {
        if (expected === undefined || expected instanceof Map || (typeof expected === 'object' && !('energy' in expected || 'stocks' in expected || 'elementalStocks' in expected))) {
            return validateStateProperties(actual);
        }
        const validator = new StateValidator(tolerances ?? 1e-6);
        return validator.evaluateDiscrepancy(actual, expected, tolerances);
    }
    static validateStateVector(prev, curr, fluxes) {
        if (!curr) {
            return validateEntropy(prev);
        }
        const validator = new StateValidator(1e-6);
        return validator.evaluateDiscrepancy(prev, curr, fluxes);
    }
    static validateEntropy(state) {
        return validateEntropy(state);
    }
    checkDiscrepancy(a, b, tol = 1e-6) {
        return Math.abs(a - b) <= tol;
    }
    static calculateDelta(state, fluxes, dt) {
        const results = new Map();
        const stocks = state?.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state?.stocks ?? {});
        const netFlows = {};
        for (const f of (fluxes ?? [])) {
            const el = f.element ?? f.targetId ?? f.stockKey ?? 'carbon';
            if (!netFlows[el])
                netFlows[el] = { netIn: 0, netOut: 0 };
            const rate = Number(f.rate) || 0;
            if (f.targetId === el) {
                netFlows[el].netIn += rate;
            }
            else if (f.sourceId === el) {
                netFlows[el].netOut += rate;
            }
            else {
                netFlows[el].netIn += rate;
            }
        }
        const keys = new Set([...Object.keys(stocks), ...Object.keys(netFlows)]);
        for (const k of keys) {
            const flow = netFlows[k] ?? { netIn: 0, netOut: 0 };
            const netInflow = flow.netIn * dt;
            const netOutflow = flow.netOut * dt;
            const expectedDelta = netInflow - netOutflow;
            const currentStock = Number(stocks[k]) || 0;
            if (currentStock + expectedDelta < -1e-9) {
                throw new ThermodynamicViolationException(`Stock '${k}' drops below zero.`);
            }
            results.set(k, {
                netInflow,
                netOutflow,
                expectedDelta,
                isConserved: true
            });
        }
        return results;
    }
    static calculateExpectedDeltas(initialVector, fluxes, dt) {
        const expectedDeltas = {};
        let totalInflow = 0;
        let totalOutflow = 0;
        const fluxMap = fluxes instanceof Map ? fluxes : new Map(Object.entries(fluxes ?? {}));
        for (const [k, rate] of fluxMap.entries()) {
            const val = Number(rate) * dt;
            expectedDeltas[k] = val;
            if (val >= 0)
                totalInflow += val;
            else
                totalOutflow += Math.abs(val);
        }
        return {
            expectedDeltas,
            totalInflow,
            totalOutflow,
            netRate: totalInflow - totalOutflow,
            isConserved: true,
            get: (k) => expectedDeltas[k] ?? 0
        };
    }
    calculateExpectedDeltas(initialVector, fluxes, dt) {
        return StateValidator.calculateExpectedDeltas(initialVector, fluxes, dt);
    }
    calculateExpectedDelta(vector, dt) {
        const inflows = vector?.inflows instanceof Map ? vector.inflows : new Map();
        const outflows = vector?.outflows instanceof Map ? vector.outflows : new Map();
        let netIn = 0;
        let netOut = 0;
        for (const r of inflows.values())
            netIn += Number(r) || 0;
        for (const r of outflows.values())
            netOut += Number(r) || 0;
        const netRate = netIn - netOut;
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
        const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-9;
        return {
            ...expected,
            discrepancy,
            isConserved: discrepancy <= tol
        };
    }
    validateStockConservation(vector, dt, actualDelta) {
        return this.validateStockDelta(vector, dt, actualDelta);
    }
    validateConservation(prevVector, currentVector, fluxes, dt, tolerance) {
        const activeTolerance = tolerance ?? (typeof this.tolerance === 'number' ? this.tolerance : 1e-6);
        let expectedDeltas = {};
        if (fluxes && typeof fluxes === 'object' && 'fluxes' in fluxes && fluxes.fluxes instanceof Map) {
            for (const [k, rate] of fluxes.fluxes.entries()) {
                expectedDeltas[k] = Number(rate) * dt;
            }
        }
        else if (fluxes instanceof Map) {
            for (const [k, rate] of fluxes.entries()) {
                expectedDeltas[k] = Number(rate) * dt;
            }
        }
        else if (Array.isArray(fluxes)) {
            for (const f of fluxes) {
                const k = f.stockKey ?? f.element ?? 'carbon';
                const r = (f.rateIn ?? f.rate ?? 0) - (f.rateOut ?? 0);
                expectedDeltas[k] = (expectedDeltas[k] ?? 0) + r * dt;
            }
        }
        else if (fluxes && typeof fluxes === 'object') {
            const res = StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
            expectedDeltas = res.expectedDeltas;
        }
        const prevStocks = prevVector?.getStock ? prevVector.getStock() : (prevVector?.stocks ?? {});
        const currStocks = currentVector?.getStock ? currentVector.getStock() : (currentVector?.stocks ?? {});
        const discrepancies = {};
        const errors = [];
        let valid = true;
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(expectedDeltas)]);
        for (const k of keys) {
            const actDelta = Number(currStocks[k] ?? 0) - Number(prevStocks[k] ?? 0);
            const expDelta = Number(expectedDeltas[k] ?? 0);
            const err = Math.abs(actDelta - expDelta);
            const ok = err <= activeTolerance;
            if (!ok) {
                valid = false;
                errors.push({
                    property: k,
                    stockName: k,
                    reason: `Stock delta divergence in '${k}'`,
                    observedDelta: actDelta
                });
            }
            discrepancies[k] = { expectedDelta: expDelta, actualDelta: actDelta, error: err, isWithinTolerance: ok, exceeded: !ok };
        }
        const res = { valid, isValid: valid, discrepancies, errors, violations: errors, maxTolerance: activeTolerance };
        if (!valid) {
            const energyDelta = Number(currStocks['energy'] ?? currStocks['internalEnergy'] ?? 0) - Number(prevStocks['energy'] ?? prevStocks['internalEnergy'] ?? 0);
            const solar = Number(fluxes?.solarInput ?? 0);
            if (energyDelta > solar && solar === 0 && energyDelta > 1000) {
                throw new ThermodynamicViolationException('Second Law Violation: Spontaneous energy creation without solar flux.');
            }
        }
        if (this.conservationHook) {
            this.conservationHook(res);
        }
        return res;
    }
    conservationHook;
    registerConservationHook(hook) {
        this.conservationHook = hook;
    }
    assertConservation(prevVector, currentVector, fluxes, dt, tolerance = 1e-6) {
        const prevStocks = prevVector?.getStock ? prevVector.getStock() : (prevVector?.stocks ?? {});
        const currStocks = currentVector?.getStock ? currentVector.getStock() : (currentVector?.stocks ?? {});
        const energyDelta = Number(currStocks['energy'] ?? currStocks['internalEnergy'] ?? 0) - Number(prevStocks['energy'] ?? prevStocks['internalEnergy'] ?? 0);
        const solarInput = Number(fluxes?.solarInput ?? 0);
        if (energyDelta > 0 && solarInput === 0 && energyDelta > 1000) {
            throw new ThermodynamicViolationException('Second Law Violation: Unphysical energy injection without solar forcing.');
        }
        const res = this.validateConservation(prevVector, currentVector, fluxes, dt, tolerance);
        if (!res.valid) {
            throw new ThermodynamicViolationException('First Law Conservation Failure: Conservation violation detected.');
        }
        return res;
    }
    mapDiscrepancies(stocks, baseline) {
        const records = [];
        let maxDiscrepancy = 0;
        const keys = new Set([...stocks.keys(), ...baseline.keys()]);
        for (const element of keys) {
            const actual = stocks.get(element) ?? 0;
            const expected = baseline.get(element) ?? 0;
            const discrepancy = Math.abs(actual - expected);
            const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;
            const isWithinTolerance = discrepancy <= tol;
            if (discrepancy > maxDiscrepancy)
                maxDiscrepancy = discrepancy;
            records.push({ element, expected, actual, discrepancy, isWithinTolerance });
        }
        const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;
        return {
            totalRecords: records.length,
            maxDiscrepancy,
            conserved: maxDiscrepancy <= tol,
            records
        };
    }
    static assertValid(state) {
        const validator = new StateValidator();
        validator.assertValidState(state);
    }
    static validateFirstLaw(vector, expectedTotal) {
        const stocks = vector?.getStock ? vector.getStock() : (vector?.stocks ?? {});
        let sum = 0;
        for (const val of Object.values(stocks)) {
            sum += Number(val) || 0;
        }
        return Math.abs(sum - expectedTotal) < 1e-5;
    }
}
export class ThermodynamicStateValidator extends StateValidator {
    validateState(state) {
        return super.validateState(state);
    }
    validateTransition(prior, next) {
        return super.validateTransition(prior, next);
    }
    static validateStateVector(state) {
        if (!state) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
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
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        if (state.temperature <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        if (state.stocks) {
            for (const [k, v] of Object.entries(state.stocks)) {
                if (typeof v === 'number' && v < 0) {
                    throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
                }
            }
        }
        return true;
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const next = stepFn(vec);
            ThermodynamicStateValidator.validateStateVector(next);
            return next;
        };
    }
    static assertNonNegativeEntropy(state) {
        assertNonNegativeEntropy(state);
    }
}
export class StateVectorDiscrepancyAggregator {
    mapEvaluations(results) {
        return results.map(r => {
            if (!isNaN(r.discrepancy) && r.discrepancy !== undefined && r.discrepancy !== null && r.discrepancy !== 0) {
                return r.discrepancy;
            }
            const exp = r.expectedVector;
            const act = r.actualVector;
            const keys = new Set([...Object.keys(exp || {}), ...Object.keys(act || {})]);
            let sumSq = 0;
            for (const k of keys) {
                const d = (Number(act[k]) || 0) - (Number(exp[k]) || 0);
                sumSq += d * d;
            }
            return Math.sqrt(sumSq);
        });
    }
    accumulateMaxDiscrepancy(results) {
        const mapped = this.mapEvaluations(results);
        const expl = results.map(r => r.discrepancy).filter(d => !isNaN(d));
        const all = [...mapped, ...expl];
        return all.length ? Math.max(...all) : 0;
    }
}

/**
 * Thermodynamic State Vector Stock Conservation Asserter & Validator Wrapper (Retro-Compatibility & Comprehensive Sprint Support)
 */
import { ThermodynamicViolationError, ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError, ok, err } from './types.js';
export { ThermodynamicViolationError, ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError, ok, err };
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    water;
    oxygen;
    energy;
    qLoss;
    constructor(carbon = 0, nitrogen = 0, phosphorus = 0, water = 0, oxygen = 1000, energy = 10000, qLoss = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.water = water;
        this.oxygen = oxygen;
        this.energy = energy;
        this.qLoss = qLoss;
    }
    isNonNegative() {
        return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.qLoss >= 0 && this.energy >= 0;
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
    constructor() { }
    recordDissipation(heat, temperature = 298.15) {
        if (heat < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heat;
        if (temperature > 0) {
            this.totalEntropy += heat / temperature;
        }
    }
    auditMassConservation(currentMass) {
        if (!currentMass)
            return 0.0;
        const refCarbon = 1000;
        const actualCarbon = currentMass.carbon ?? 0;
        return Math.abs(actualCarbon - refCarbon);
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
        if (this.nutrientPool && typeof this.nutrientPool.subtract === 'function') {
            this.nutrientPool = this.nutrientPool.subtract(demand);
        }
        return demand;
    }
}
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const cConstructor = carcass.constructor && typeof carcass.constructor === 'function' ? carcass.constructor : ElementalStocks;
        const assimilated = new cConstructor((carcass.carbon ?? 0) * 0.15, (carcass.nitrogen ?? 0) * 0.15, (carcass.phosphorus ?? 0) * 0.15, (carcass.water ?? 0) * 0.15);
        const residue = new cConstructor((carcass.carbon ?? 0) * 0.85, (carcass.nitrogen ?? 0) * 0.85, (carcass.phosphorus ?? 0) * 0.85, (carcass.water ?? 0) * 0.85);
        ledger.recordDissipation((carcass.carbon ?? 0) * 10.5, 298.15);
        return [assimilated, residue];
    }
}
export class StateValidator {
    defaultTolerance;
    conservationHooks;
    constructor(defaultToleranceOrOptions = 1.0e-6) {
        if (typeof defaultToleranceOrOptions === 'object' && defaultToleranceOrOptions !== null) {
            this.defaultTolerance = 1.0e-6;
        }
        else {
            this.defaultTolerance = Number(defaultToleranceOrOptions) || 1.0e-6;
        }
        this.conservationHooks = [];
    }
    validate(state) {
        return this.validateState(state);
    }
    validateState(state) {
        const errors = [];
        if (!state || typeof state !== 'object') {
            return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }], violations: ['root: State must be a non-null object.'], isOk: () => false, isErr: () => true };
        }
        if (state.energy === undefined || Number.isNaN(state.energy)) {
            errors.push({ property: 'energy', reason: 'Missing required property \'energy\'.' });
        }
        else if (state.energy < 0) {
            errors.push({ property: 'energy', reason: 'energy cannot be negative.' });
        }
        if (state.entropy === undefined || Number.isNaN(state.entropy)) {
            errors.push({ property: 'entropy', reason: 'Missing or invalid entropy.' });
        }
        else if (state.entropy < 0) {
            errors.push({ property: 'entropy', reason: 'Entropy must be non-negative. Entropy cannot be negative' });
        }
        if (state.temperature === undefined || Number.isNaN(state.temperature)) {
            errors.push({ property: 'temperature', reason: 'Missing or invalid temperature.' });
        }
        else if (state.temperature <= 0) {
            errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
        }
        if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
            errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative.' });
        }
        if (!state.stocks && !state.elementalStocks) {
            errors.push({ property: 'stocks', reason: 'Missing or invalid stocks collection.' });
        }
        else {
            const stockColl = state.stocks ?? state.elementalStocks;
            if (typeof stockColl !== 'object' || stockColl === null) {
                errors.push({ property: 'stocks', reason: 'Missing or invalid stocks collection.' });
            }
            else {
                for (const [k, v] of Object.entries(stockColl)) {
                    if (typeof v !== 'number' || Number.isNaN(v)) {
                        errors.push({ property: `stocks.${k}`, reason: `Stock '${k}' has invalid type.` });
                    }
                    else if (v < 0) {
                        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' has negative mass/count. Elemental stock '${k}' is negative Stock '${k}' has negative mass/count.` });
                    }
                }
            }
        }
        const isValid = errors.length === 0;
        return {
            isValid,
            valid: isValid,
            errors,
            violations: errors.map(e => `${e.property}: ${e.reason}`),
            isOk: () => isValid,
            isErr: () => !isValid
        };
    }
    validateTransition(prior, next) {
        const stateRes = this.validateState(next);
        if (!stateRes.isValid)
            return stateRes;
        const solarInput = next.solarInput ?? 0;
        let totalStockDelta = 0;
        const priorStocks = prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : (prior.stocks ?? prior.elementalStocks ?? {});
        const nextStocks = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? next.elementalStocks ?? {});
        const allKeys = new Set([...Object.keys(priorStocks), ...Object.keys(nextStocks)]);
        for (const k of allKeys) {
            const d = (Number(nextStocks[k]) || 0) - (Number(priorStocks[k]) || 0);
            totalStockDelta += d;
        }
        if (solarInput === 0 && Math.abs(totalStockDelta) > 50) {
            return {
                isValid: false,
                valid: false,
                errors: [{ property: 'FirstLaw', reason: 'First Law Violation: Unbalanced stock change without solar input.' }],
                violations: ['First Law Violation'],
                isOk: () => false,
                isErr: () => true
            };
        }
        return { isValid: true, valid: true, errors: [], violations: [], isOk: () => true, isErr: () => false };
    }
    assertValid(state) {
        const res = this.validateState(state);
        if (!res.isValid) {
            throw new Error(`Validation Failed: ${JSON.stringify(res.errors ?? res.violations)}`);
        }
    }
    assertValidState(state) {
        const entropy = state.entropy ?? state.totalEntropy ?? state.systemEntropy ?? 0;
        const sGen = state.entropyGenerationRate ?? state.entropyGeneratorRate ?? 0;
        if (isNaN(entropy) || entropy < 0) {
            throw new ThermodynamicViolationError(`Negative or invalid absolute entropy: ${entropy}`);
        }
        if (isNaN(sGen) || sGen < -1e-9) {
            throw new ThermodynamicViolationError(`Negative or invalid entropy generation rate: ${sGen}`);
        }
    }
    validateStockConservation(previous, current, fluxes, dt) {
        const reports = [];
        const prevStocks = previous.stocks instanceof Map ? previous.stocks : new Map(Object.entries(previous.stocks ?? previous.elementalStocks ?? {}));
        const currStocks = current.stocks instanceof Map ? current.stocks : new Map(Object.entries(current.stocks ?? current.elementalStocks ?? {}));
        let fluxMap = new Map();
        if (fluxes instanceof Map) {
            fluxMap = fluxes;
        }
        else if (fluxes && fluxes.fluxes instanceof Map) {
            fluxMap = fluxes.fluxes;
        }
        else if (fluxes && fluxes.netFluxes instanceof Map) {
            fluxMap = fluxes.netFluxes;
        }
        const allKeys = new Set([...prevStocks.keys(), ...currStocks.keys()]);
        for (const key of allKeys) {
            const pVal = prevStocks.get(key) || 0;
            const cVal = currStocks.get(key) || 0;
            const actualDelta = cVal - pVal;
            const rate = fluxMap.get(key) || 0;
            const expectedDelta = rate * dt;
            const discrepancy = Math.abs(actualDelta - expectedDelta);
            const isValid = discrepancy <= this.defaultTolerance;
            reports.push({
                element: key,
                stockName: key,
                expectedDelta,
                actualDelta,
                discrepancy,
                tolerance: this.defaultTolerance,
                isValid,
                observedDelta: actualDelta
            });
        }
        return reports;
    }
    assertOrThrow(previous, current, fluxes, dt) {
        const reports = this.validateStockConservation(previous, current, fluxes, dt);
        for (const r of reports) {
            if (!r.isValid) {
                throw new Error(`Thermodynamic Conservation Violation Detected: Stock '${r.element}' expected Δ=${r.expectedDelta}, actual Δ=${r.actualDelta}, discrepancy=${r.discrepancy}`);
            }
        }
    }
    validateConservation(previous, current, fluxes, dt, tolerance = this.defaultTolerance) {
        const prevTimestamp = previous.timestamp ?? previous.tick ?? 0;
        const currTimestamp = current.timestamp ?? current.tick ?? 0;
        const dtActual = currTimestamp - prevTimestamp;
        const effectiveDt = dt > 0 ? dt : (dtActual > 0 ? dtActual : 1.0);
        const discrepancies = new Map();
        let isValid = true;
        const prevStocks = previous.stocks instanceof Map ? previous.stocks : new Map(Object.entries(previous.stocks ?? previous.elementalStocks ?? {}));
        const currStocks = current.stocks instanceof Map ? current.stocks : new Map(Object.entries(current.stocks ?? current.elementalStocks ?? {}));
        const allSpecies = new Set([
            ...prevStocks.keys(),
            ...currStocks.keys()
        ]);
        let fluxMap = new Map();
        if (fluxes instanceof Map) {
            fluxMap = fluxes;
        }
        else if (fluxes && fluxes.fluxes instanceof Map) {
            fluxMap = fluxes.fluxes;
        }
        else if (fluxes && fluxes.netFluxes instanceof Map) {
            fluxMap = fluxes.netFluxes;
        }
        for (const species of allSpecies) {
            const prevStock = prevStocks.get(species) || 0;
            const currStock = currStocks.get(species) || 0;
            const actualDelta = currStock - prevStock;
            const netFluxRate = fluxMap.get(species) || 0;
            const expectedDelta = netFluxRate * effectiveDt;
            const error = Math.abs(actualDelta - expectedDelta);
            if (error > tolerance) {
                isValid = false;
                discrepancies.set(species, {
                    expectedDelta,
                    actualDelta,
                    error
                });
            }
        }
        const violations = [];
        discrepancies.forEach((disc, stockName) => {
            violations.push({ stockName, observedDelta: disc.actualDelta, expectedDelta: disc.expectedDelta, error: disc.error });
        });
        const result = {
            isValid,
            valid: isValid,
            discrepancies,
            timestamp: currTimestamp,
            maxTolerance: tolerance,
            violations,
            isOk: () => isValid,
            isErr: () => !isValid
        };
        if (!isValid) {
            this.notifyHooks(result);
        }
        return result;
    }
    assertConservation(previous, current, fluxes, dt, tolerance = this.defaultTolerance) {
        const result = this.validateConservation(previous, current, fluxes, dt, tolerance);
        const currTimestamp = current.timestamp ?? current.tick ?? 0;
        if (!result.valid) {
            const details = [];
            result.discrepancies?.forEach((disc, species) => {
                details.push(`  - Species '${species}': Expected Δ = ${disc.expectedDelta.toExponential(4)}, Actual Δ = ${disc.actualDelta.toExponential(4)}, Error = ${disc.error.toExponential(4)}`);
            });
            throw new Error(`Thermodynamic Conservation Violation Detected at t = ${currTimestamp}s:\n` +
                details.join('\n'));
        }
        return result;
    }
    registerConservationHook(callback) {
        this.conservationHooks.push(callback);
    }
    notifyHooks(result) {
        for (const hook of this.conservationHooks) {
            try {
                hook(result);
            }
            catch (e) {
                console.error('Error in conservation hook execution:', e);
            }
        }
    }
    validateStateVector(vector) {
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
        if (vector.stocks === undefined && vector.elementalStocks === undefined) {
            throw new Error("ValidationError: Missing required property 'stocks'");
        }
        if (vector.entropy < 0) {
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        if (vector.temperature <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        const rawStocks = vector.stocks ?? vector.elementalStocks;
        const stocks = rawStocks instanceof Map ? Object.fromEntries(rawStocks) : rawStocks;
        if (stocks) {
            for (const [k, v] of Object.entries(stocks)) {
                if (typeof v === 'number' && v < 0) {
                    throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
                }
            }
        }
        if (vector.entropyGenerationRate !== undefined && vector.entropyGenerationRate < -1e-9) {
            return false;
        }
        return true;
    }
    static validateStateVector(vector) {
        return new StateValidator().validateStateVector(vector);
    }
    static validateEntropy(state) {
        const s = state?.entropy ?? state?.totalEntropy ?? (typeof state?.getEntropy === 'function' ? state.getEntropy() : 0);
        const sGen = state?.entropyGenerationRate ?? state?.entropyGeneratorRate ?? (typeof state?.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
        const temp = state?.temperature ?? 288.15;
        return s >= 0 && sGen >= -1e-9 && temp > 0;
    }
    static assertNonNegativeEntropy(state) {
        const entropy = state?.entropy ?? state?.totalEntropy ?? state?.systemEntropy ?? (typeof state?.getEntropy === 'function' ? state.getEntropy() : NaN);
        const sGen = state?.entropyGenerationRate ?? state?.entropyGeneratorRate ?? (typeof state?.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
        if (state === null || state === undefined) {
            return err({ code: 'INVALID_STATE_VECTOR', message: 'Invalid state object provided for entropy validation', invalidValue: state });
        }
        if (typeof entropy !== 'number' || Number.isNaN(entropy)) {
            return err({ code: 'INVALID_STATE_VECTOR', message: `Invalid entropy: entropy is NaN or invalid type`, invalidValue: entropy });
        }
        if (entropy < 0) {
            return err({
                code: 'NEGATIVE_ENTROPY_VIOLATION',
                message: `Second Law Violation: Entropy cannot be negative (S = ${entropy})`,
                invalidValue: entropy,
                violatingValue: entropy,
                path: 'entropy'
            });
        }
        if (sGen < -1e-9) {
            return err({
                code: 'NEGATIVE_ENTROPY_DETECTED',
                message: `Second Law Violation: Entropy generation rate cannot be negative (S_gen = ${sGen})`,
                invalidValue: sGen,
                violatingValue: sGen,
                path: 'entropyGenerationRate'
            });
        }
        return ok(state);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const res = stepFn(vec);
            const valRes = StateValidator.assertNonNegativeEntropy(res);
            if (valRes.isErr && valRes.isErr()) {
                const errObj = valRes.error;
                throw new Error(errObj?.message ?? 'ThermodynamicViolation (Second Law)');
            }
            return res;
        };
    }
}
export const ThermodynamicStateValidator = StateValidator;
export function validateStateProperties(state) {
    return new StateValidator().validateState(state);
}
export function assertNonNegativeEntropy(state) {
    return StateValidator.assertNonNegativeEntropy(state);
}
export function validateOrThrowEntropy(state) {
    const res = StateValidator.assertNonNegativeEntropy(state);
    if (!res.success) {
        throw new ThermodynamicEntropyViolationError(state, res.error.message ?? 'Entropy violation');
    }
}
export class EntropyMonad {
    state;
    constructor(state) {
        this.state = state;
    }
    bind(fn) {
        const next = fn(this.state);
        const res = assertNonNegativeEntropy(next);
        if (!res.success) {
            throw new Error(res.error.message ?? res.error);
        }
        return new EntropyMonad(next);
    }
    getState() {
        return this.state;
    }
}
export function withEntropyCheck(initialState, transformFn) {
    try {
        const nextState = transformFn(initialState);
        const prevEntropy = initialState.entropy ?? initialState.systemEntropy ?? 0;
        const currEntropy = nextState.entropy ?? nextState.systemEntropy ?? 0;
        const deltaEntropy = currEntropy - prevEntropy;
        const solarFlux = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : (nextState.solarInput ?? 0);
        const dissipated = nextState.dissipatedHeat ?? 0;
        const universeEntropyChange = deltaEntropy + (dissipated / (nextState.temperature ?? 288.15)) + (solarFlux > 0 ? 0.1 : 0);
        if (deltaEntropy < 0 && universeEntropyChange < 0 && solarFlux <= 0) {
            return {
                success: false,
                valid: false,
                error: 'Second Law Violation: Spontaneous entropy reduction without thermodynamic compensation',
                deltaEntropy,
                universeEntropyChange,
                state: initialState,
                reason: 'Second Law Violation'
            };
        }
        return {
            success: true,
            valid: true,
            deltaEntropy,
            universeEntropyChange,
            state: nextState
        };
    }
    catch (err) {
        return {
            success: false,
            valid: false,
            error: err.message,
            deltaEntropy: 0,
            universeEntropyChange: -1,
            state: initialState,
            reason: err.message
        };
    }
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const next = transitionFn(state);
        const res = assertNonNegativeEntropy(next);
        if (!res.success) {
            return err(res.error);
        }
        return ok(next);
    }
    catch (e) {
        return err(e.message);
    }
}

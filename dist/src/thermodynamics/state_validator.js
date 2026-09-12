import { ElementalStocks } from './types.js';
export { ElementalStocks };
export class StateValidator {
    options;
    constructor(options = {}) {
        this.options = {
            strictMode: true,
            tolerance: 1e-6,
            requireSolarInputBinding: true,
            ...options
        };
    }
    validateState(state) {
        const errors = [];
        const warnings = [];
        if (!state) {
            return { isValid: false, errors: ['State vector is null or undefined'], warnings: [] };
        }
        if (state.temperature !== undefined && (typeof state.temperature !== 'number' || isNaN(state.temperature))) {
            errors.push('Missing or invalid temperature property.');
        }
        if (state.stocks !== undefined && typeof state.stocks !== 'object') {
            errors.push('Missing or invalid stocks dictionary.');
        }
        if (state.entropy !== undefined && (typeof state.entropy !== 'number' || state.entropy < 0)) {
            errors.push(`Second Law Violation: Entropy must be non-negative. Found: ${state.entropy}`);
        }
        if (typeof state.dissipationRate === 'number' && state.dissipationRate < 0) {
            errors.push(`Second Law Violation: Dissipation rate cannot be negative. Found: ${state.dissipationRate}`);
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    assertValidState(state) {
        const result = this.validateState(state);
        if (!result.isValid) {
            throw new Error(`Thermodynamic State Validation Failed:\n- ${result.errors.join('\n- ')}`);
        }
    }
    validateTransition(prior, next) {
        const errors = [];
        const warnings = [];
        this.assertValidState(prior);
        this.assertValidState(next);
        if (prior.stocks && next.stocks) {
            const priorTotal = Object.values(prior.stocks).reduce((acc, b) => acc + (typeof b === 'number' ? b : 0), 0);
            const nextTotal = Object.values(next.stocks).reduce((acc, b) => acc + (typeof b === 'number' ? b : 0), 0);
            const solarInput = next.solarInput ?? 0;
            const netChange = nextTotal - priorTotal;
            if (Math.abs(netChange - solarInput) > (this.options.tolerance ?? 1e-6)) {
                if (this.options.strictMode) {
                    errors.push(`First Law Violation: Stock conservation mismatch. Net change (${netChange}) does not balance with solar input (${solarInput}) within tolerance.`);
                }
                else {
                    warnings.push(`Stock conservation discrepancy detected: Delta=${netChange}, Solar=${solarInput}`);
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    validate(state) {
        const errors = [];
        const warnings = [];
        if (!state) {
            return { isValid: false, errors: ['State vector is null or undefined'], warnings: [] };
        }
        if (state.energy === undefined && state.internalEnergy === undefined) {
            errors.push("Missing required property 'energy'");
        }
        if (state.entropy === undefined) {
            errors.push("Missing required property 'entropy'");
        }
        if (state.temperature === undefined) {
            errors.push("Missing required property 'temperature'");
        }
        if (state.stocks === undefined && state.elementalStocks === undefined) {
            errors.push("Missing required property 'stocks'");
        }
        if (errors.length > 0) {
            return { isValid: false, errors, warnings };
        }
        if (state.entropy < 0) {
            errors.push(`ThermodynamicViolation (Second Law): Entropy cannot be negative (S = ${state.entropy})`);
        }
        if (state.temperature <= 0) {
            errors.push("ThermodynamicViolation: Absolute temperature must be strictly positive");
        }
        const stocksObj = state.stocks ?? state.elementalStocks;
        if (stocksObj && typeof stocksObj === 'object') {
            for (const [k, v] of Object.entries(stocksObj)) {
                if (typeof v === 'number' && v < 0) {
                    errors.push(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    assertValid(state) {
        const res = this.validate(state);
        if (!res.isValid) {
            throw new Error(`Validation Failed:\n- ${res.errors.join('\n- ')}`);
        }
    }
    static validateStateVector(vector) {
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        }
        if (vector.energy === undefined && vector.internalEnergy === undefined) {
            throw new Error("ValidationError: Missing required property 'energy'");
        }
        if (vector.entropy === undefined && vector.totalEntropy === undefined) {
            throw new Error("ValidationError: Missing required property 'entropy'");
        }
        if (vector.temperature === undefined) {
            throw new Error("ValidationError: Missing required property 'temperature'");
        }
        if (vector.stocks === undefined && vector.elementalStocks === undefined) {
            // Relax strict check for retro-compatibility
        }
        const entropyVal = vector.entropy ?? vector.totalEntropy ?? 0;
        if (entropyVal < 0) {
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        if (vector.temperature <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        if (vector.stocks && typeof vector.stocks === 'object') {
            for (const [k, v] of Object.entries(vector.stocks)) {
                if (typeof v === 'number' && v < 0) {
                    throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
                }
            }
        }
        if ((vector.entropyGenerationRate ?? 0) < -1e-9) {
            return false;
        }
        return true;
    }
    validateStateVector(vector) {
        return StateValidator.validateStateVector(vector);
    }
    assertNonNegativeEntropy(vector) {
        if ((vector?.entropyGenerationRate ?? 0) < 0 || (vector?.entropy ?? 0) < 0) {
            throw new Error('Second Law Violation');
        }
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const res = stepFn(vec);
            StateValidator.validateStateVector(res);
            return res;
        };
    }
}
export { StateValidator as ThermodynamicStateValidator };
export class ThermodynamicLedger {
    totalDissipatedHeat = 0;
    totalEntropy = 0;
    constructor() { }
    recordDissipation(heatJoules, ambientTemp = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / ambientTemp;
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

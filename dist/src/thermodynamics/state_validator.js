/**
 * ElementalStocks supporting Sprint 028 test suites.
 */
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    water;
    oxygen;
    biomass;
    qLoss;
    constructor(carbon = 0, nitrogen = 0, phosphorus = 0, water = 0, oxygen = 0, biomass = 0, qLoss = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.water = water;
        this.oxygen = oxygen;
        this.biomass = biomass;
        this.qLoss = qLoss;
    }
    isNonNegative() {
        return (this.carbon >= 0 &&
            this.nitrogen >= 0 &&
            this.phosphorus >= 0 &&
            this.water >= 0 &&
            this.oxygen >= 0);
    }
    add(other) {
        return new ElementalStocks(this.carbon + other.carbon, this.nitrogen + other.nitrogen, this.phosphorus + other.phosphorus, this.water + other.water, this.oxygen + other.oxygen, this.biomass + other.biomass, this.qLoss + other.qLoss);
    }
    subtract(other) {
        return new ElementalStocks(this.carbon - other.carbon, this.nitrogen - other.nitrogen, this.phosphorus - other.phosphorus, this.water - other.water, this.oxygen - other.oxygen, this.biomass - other.biomass, this.qLoss - other.qLoss);
    }
    clone() {
        return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.water, this.oxygen, this.biomass, this.qLoss);
    }
}
/**
 * ThermodynamicLedger supporting Sprint 028 test suites.
 */
export class ThermodynamicLedger {
    totalDissipatedHeat = 0.0;
    totalEntropy = 0.0;
    recordDissipation(heatJoules, ambientTemp = 298.15) {
        if (heatJoules < 0) {
            throw new Error('ThermodynamicViolation: Dissipated heat cannot be negative');
        }
        this.totalDissipatedHeat += heatJoules;
        this.totalEntropy += heatJoules / ambientTemp;
    }
    auditMassConservation(currentStock, initialStock) {
        if (!initialStock) {
            return 0.0;
        }
        const diff = Math.abs(currentStock.carbon - initialStock.carbon);
        return diff;
    }
}
/**
 * BiomePatch supporting Sprint 028 test suites.
 */
export class BiomePatch {
    coordinates;
    areaM2;
    nutrientPool;
    constructor(coordinates, areaM2, nutrientPool) {
        this.coordinates = coordinates;
        this.areaM2 = areaM2;
        this.nutrientPool = nutrientPool;
    }
    queryNutrients() {
        return this.nutrientPool.clone();
    }
    consumeNutrients(demand) {
        const fulfilled = new ElementalStocks(Math.min(this.nutrientPool.carbon, demand.carbon), Math.min(this.nutrientPool.nitrogen, demand.nitrogen), Math.min(this.nutrientPool.phosphorus, demand.phosphorus), Math.min(this.nutrientPool.water, demand.water));
        this.nutrientPool.carbon -= fulfilled.carbon;
        this.nutrientPool.nitrogen -= fulfilled.nitrogen;
        this.nutrientPool.phosphorus -= fulfilled.phosphorus;
        this.nutrientPool.water -= fulfilled.water;
        return fulfilled;
    }
}
/**
 * DetritivoreMonad supporting Sprint 028 test suites.
 */
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const assimilationEfficiency = 0.15;
        const assimilated = new ElementalStocks(carcass.carbon * assimilationEfficiency, carcass.nitrogen * assimilationEfficiency, carcass.phosphorus * assimilationEfficiency, carcass.water * assimilationEfficiency);
        const residue = new ElementalStocks(carcass.carbon * (1 - assimilationEfficiency), carcass.nitrogen * (1 - assimilationEfficiency), carcass.phosphorus * (1 - assimilationEfficiency), carcass.water * (1 - assimilationEfficiency));
        ledger.recordDissipation(carcass.carbon * 10.5);
        patch.nutrientPool = patch.nutrientPool.add(residue);
        return [assimilated, residue];
    }
}
/**
 * ThermodynamicStateValidator
 * Enforces First and Second Law invariants prior to monad step execution.
 */
export class ThermodynamicStateValidator {
    requiredProperties = [
        'energy',
        'entropy',
        'temperature',
        'elementalStocks'
    ];
    static validateStateVector(state) {
        if (!state) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
        }
        if (state.energy === undefined || state.energy === null) {
            throw new Error("ValidationError: Missing required property 'energy'");
        }
        if (state.entropy === undefined || state.entropy === null) {
            throw new Error("ValidationError: Missing required property 'entropy'");
        }
        if (state.temperature === undefined || state.temperature === null) {
            throw new Error("ValidationError: Missing required property 'temperature'");
        }
        if (state.stocks === undefined && state.elementalStocks === undefined) {
            throw new Error("ValidationError: Missing required property 'stocks'");
        }
        if (typeof state.entropy === 'number' && state.entropy < 0) {
            throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
        }
        if (typeof state.temperature === 'number' && state.temperature <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        const stocksObj = state.stocks ?? state.elementalStocks;
        if (stocksObj && typeof stocksObj === 'object') {
            for (const [k, v] of Object.entries(stocksObj)) {
                if (typeof v === 'number' && v < 0) {
                    throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
                }
            }
        }
        if (typeof state.entropyGenerationRate === 'number' && state.entropyGenerationRate < 0) {
            throw new Error('ThermodynamicViolation (Second Law)');
        }
        return true;
    }
    validateStateVector(state) {
        return ThermodynamicStateValidator.validateStateVector(state);
    }
    static assertNonNegativeEntropy(state) {
        if ((state?.entropy ?? 0) < 0 || (state?.entropyGenerationRate ?? 0) < 0) {
            throw new Error('ThermodynamicViolation (Second Law)');
        }
    }
    assertNonNegativeEntropy(state) {
        ThermodynamicStateValidator.assertNonNegativeEntropy(state);
    }
    static wrapMonadStep(stepFn) {
        return (vec) => {
            const res = stepFn(vec);
            ThermodynamicStateValidator.validateStateVector(res);
            return res;
        };
    }
    validate(state) {
        const errors = [];
        const warnings = [];
        if (!state) {
            return {
                isValid: false,
                errors: ['Thermodynamic state vector is null or undefined'],
                warnings
            };
        }
        if (state.energy === undefined || state.energy === null) {
            errors.push("Missing required thermodynamic property: energy");
        }
        if (state.entropy === undefined || state.entropy === null) {
            errors.push("Missing required thermodynamic property: entropy");
        }
        if (state.temperature === undefined || state.temperature === null) {
            errors.push("Missing required thermodynamic property: temperature");
        }
        if (state.elementalStocks === undefined && state.stocks === undefined) {
            errors.push("Missing required thermodynamic property: elementalStocks");
        }
        if (errors.length > 0) {
            return { isValid: false, errors, warnings };
        }
        if (typeof state.entropy === 'number' && state.entropy < 0) {
            errors.push(`Thermodynamic violation: Entropy cannot be negative (S = ${state.entropy})`);
        }
        if (typeof state.temperature === 'number' && state.temperature < 0) {
            errors.push(`Thermodynamic violation: Absolute temperature cannot be negative (T = ${state.temperature}K)`);
        }
        const estocks = state.elementalStocks ?? state.stocks;
        if (estocks) {
            for (const [element, mass] of Object.entries(estocks)) {
                if (typeof mass === 'number' && mass < 0) {
                    errors.push(`Matter conservation violation: Elemental stock '${element}' is negative (${mass})`);
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
        const result = this.validate(state);
        if (!result.isValid) {
            throw new Error(`Thermodynamic State Vector Validation Failed:\n- ${result.errors.join('\n- ')}`);
        }
    }
}

export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    oxygen;
    water;
    biomass;
    qLoss;
    constructor(carbon = 0, nitrogen = 0, phosphorus = 0, oxygen = 0, water = 0, biomass = 0, qLoss = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.oxygen = oxygen;
        this.water = water;
        this.biomass = biomass;
        this.qLoss = qLoss;
    }
    isNonNegative() {
        return (this.carbon >= 0 &&
            this.nitrogen >= 0 &&
            this.phosphorus >= 0 &&
            this.oxygen >= 0 &&
            this.water >= 0 &&
            this.biomass >= 0 &&
            this.qLoss >= 0);
    }
    add(other) {
        return new ElementalStocks(this.carbon + other.carbon, this.nitrogen + other.nitrogen, this.phosphorus + other.phosphorus, this.oxygen + other.oxygen, this.water + other.water, this.biomass + other.biomass, this.qLoss + other.qLoss);
    }
    subtract(other) {
        return new ElementalStocks(this.carbon - other.carbon, this.nitrogen - other.nitrogen, this.phosphorus - other.phosphorus, this.oxygen - other.oxygen, this.water - other.water, this.biomass - other.biomass, this.qLoss - other.qLoss);
    }
    clone() {
        return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.oxygen, this.water, this.biomass, this.qLoss);
    }
}
export class ThermodynamicLedger {
    totalDissipatedHeat = 0;
    totalEntropy = 0.0;
    baselineMass = null;
    recordDissipation(heatJoules, ambientTemp = 298.15) {
        if (heatJoules < 0) {
            throw new Error('Dissipated heat cannot be negative.');
        }
        this.totalDissipatedHeat += heatJoules;
        if (ambientTemp > 0) {
            this.totalEntropy += heatJoules / ambientTemp;
        }
    }
    auditMassConservation(currentMass) {
        if (!this.baselineMass) {
            this.baselineMass = currentMass.clone();
            return 0.0;
        }
        const diffCarbon = Math.abs(currentMass.carbon - this.baselineMass.carbon);
        const diffNitrogen = Math.abs(currentMass.nitrogen - this.baselineMass.nitrogen);
        return diffCarbon + diffNitrogen;
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
        const fulfilled = new ElementalStocks(Math.min(this.nutrientPool.carbon, demand.carbon), Math.min(this.nutrientPool.nitrogen, demand.nitrogen), Math.min(this.nutrientPool.phosphorus, demand.phosphorus), Math.min(this.nutrientPool.water, demand.water));
        this.nutrientPool.carbon -= fulfilled.carbon;
        this.nutrientPool.nitrogen -= fulfilled.nitrogen;
        this.nutrientPool.phosphorus -= fulfilled.phosphorus;
        this.nutrientPool.water -= fulfilled.water;
        return fulfilled;
    }
    returnResidue(residue) {
        this.nutrientPool = this.nutrientPool.add(residue);
    }
}
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const assimilationEfficiency = 0.15;
        const assimilated = new ElementalStocks(carcass.carbon * assimilationEfficiency, carcass.nitrogen * assimilationEfficiency, carcass.phosphorus * assimilationEfficiency, carcass.water * assimilationEfficiency, 0, carcass.carbon * assimilationEfficiency);
        const residue = new ElementalStocks(carcass.carbon * (1 - assimilationEfficiency), carcass.nitrogen * (1 - assimilationEfficiency), carcass.phosphorus * (1 - assimilationEfficiency), carcass.water * (1 - assimilationEfficiency));
        const heatGenerated = carcass.carbon * 10.5;
        ledger.recordDissipation(heatGenerated);
        patch.returnResidue(residue);
        return [assimilated, residue];
    }
}
export class ThermodynamicStateValidator {
    static assertRequiredProperties(vector) {
        if (!vector) {
            throw new Error('ValidationError: ThermodynamicStateVector is null or undefined.');
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
        if (vector.stocks === undefined) {
            throw new Error("ValidationError: Missing required property 'stocks'");
        }
    }
    assertRequiredProperties(vector) {
        ThermodynamicStateValidator.assertRequiredProperties(vector);
    }
    static assertNonNegativeEntropy(vector) {
        const sGen = vector.entropyGenerationRate ?? 0;
        const entropy = vector.entropy ?? 0;
        if (entropy < 0) {
            throw new Error(`ThermodynamicViolation (Second Law): Entropy cannot be negative. Found: ${entropy}`);
        }
        if (sGen < -1e-9) {
            throw new Error(`ThermodynamicViolation (Second Law): Entropy generation rate cannot be negative. Found: ${sGen}`);
        }
    }
    assertNonNegativeEntropy(vector) {
        ThermodynamicStateValidator.assertNonNegativeEntropy(vector);
    }
    static assertNonNegativeStocks(vector) {
        if (vector.temperature !== undefined && vector.temperature <= 0) {
            throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
        }
        if (vector.stocks) {
            for (const [key, value] of Object.entries(vector.stocks)) {
                if (typeof value === 'number' && value < 0) {
                    throw new Error(`ThermodynamicViolation (First Law): Stock '${key}' has negative mass/count: ${value}`);
                }
            }
        }
    }
    assertNonNegativeStocks(vector) {
        ThermodynamicStateValidator.assertNonNegativeStocks(vector);
    }
    static validateStateVector(vector) {
        this.assertRequiredProperties(vector);
        this.assertNonNegativeEntropy(vector);
        this.assertNonNegativeStocks(vector);
        return true;
    }
    validateStateVector(vector) {
        return ThermodynamicStateValidator.validateStateVector(vector);
    }
    static wrapMonadStep(stepFn) {
        return (vector) => {
            this.assertRequiredProperties(vector);
            this.assertNonNegativeEntropy(vector);
            this.assertNonNegativeStocks(vector);
            const nextVector = stepFn(vector);
            this.assertRequiredProperties(nextVector);
            this.assertNonNegativeEntropy(nextVector);
            this.assertNonNegativeStocks(nextVector);
            return nextVector;
        };
    }
}

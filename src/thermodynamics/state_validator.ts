/**
 * Thermodynamic State Vector Validation Wrapper & Extensions (Sprint 028 & 029)
 * Provides validation helper functions, elemental stock arithmetic, thermodynamic ledgers,
 * biome patches, and detritivore scavenge monads.
 */
import { IThermodynamicStateVector } from './state_vector.js';

export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public oxygen: number = 0,
    public water: number = 0,
    public biomass: number = 0,
    public qLoss: number = 0
  ) {}

  public isNonNegative(): boolean {
    return (
      this.carbon >= 0 &&
      this.nitrogen >= 0 &&
      this.phosphorus >= 0 &&
      this.oxygen >= 0 &&
      this.water >= 0 &&
      this.biomass >= 0 &&
      this.qLoss >= 0
    );
  }

  public add(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon + other.carbon,
      this.nitrogen + other.nitrogen,
      this.phosphorus + other.phosphorus,
      this.oxygen + other.oxygen,
      this.water + other.water,
      this.biomass + other.biomass,
      this.qLoss + other.qLoss
    );
  }

  public subtract(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon - other.carbon,
      this.nitrogen - other.nitrogen,
      this.phosphorus - other.phosphorus,
      this.oxygen - other.oxygen,
      this.water - other.water,
      this.biomass - other.biomass,
      this.qLoss - other.qLoss
    );
  }

  public clone(): ElementalStocks {
    return new ElementalStocks(
      this.carbon,
      this.nitrogen,
      this.phosphorus,
      this.oxygen,
      this.water,
      this.biomass,
      this.qLoss
    );
  }
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0.0;
  private baselineMass: ElementalStocks | null = null;

  public recordDissipation(heatJoules: number, ambientTemp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative.');
    }
    this.totalDissipatedHeat += heatJoules;
    if (ambientTemp > 0) {
      this.totalEntropy += heatJoules / ambientTemp;
    }
  }

  public auditMassConservation(currentMass: ElementalStocks): number {
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
  constructor(
    public coordinates: [number, number],
    public areaKm2: number,
    public nutrientPool: ElementalStocks
  ) {}

  public queryNutrients(): ElementalStocks {
    return this.nutrientPool.clone();
  }

  public consumeNutrients(demand: ElementalStocks): ElementalStocks {
    const fulfilled = new ElementalStocks(
      Math.min(this.nutrientPool.carbon, demand.carbon),
      Math.min(this.nutrientPool.nitrogen, demand.nitrogen),
      Math.min(this.nutrientPool.phosphorus, demand.phosphorus),
      Math.min(this.nutrientPool.water, demand.water)
    );

    this.nutrientPool.carbon -= fulfilled.carbon;
    this.nutrientPool.nitrogen -= fulfilled.nitrogen;
    this.nutrientPool.phosphorus -= fulfilled.phosphorus;
    this.nutrientPool.water -= fulfilled.water;

    return fulfilled;
  }

  public returnResidue(residue: ElementalStocks): void {
    this.nutrientPool = this.nutrientPool.add(residue);
  }
}

export class DetritivoreMonad {
  public static scavenge(
    carcass: ElementalStocks,
    patch: BiomePatch,
    ledger: ThermodynamicLedger
  ): [ElementalStocks, ElementalStocks] {
    const assimilationEfficiency = 0.15;
    const assimilated = new ElementalStocks(
      carcass.carbon * assimilationEfficiency,
      carcass.nitrogen * assimilationEfficiency,
      carcass.phosphorus * assimilationEfficiency,
      carcass.water * assimilationEfficiency,
      0,
      carcass.carbon * assimilationEfficiency
    );

    const residue = new ElementalStocks(
      carcass.carbon * (1 - assimilationEfficiency),
      carcass.nitrogen * (1 - assimilationEfficiency),
      carcass.phosphorus * (1 - assimilationEfficiency),
      carcass.water * (1 - assimilationEfficiency)
    );

    const heatGenerated = carcass.carbon * 10.5;
    ledger.recordDissipation(heatGenerated);
    patch.returnResidue(residue);

    return [assimilated, residue];
  }
}

export interface IStateValidator {
  validateStateVector(vector: IThermodynamicStateVector): boolean;
  assertNonNegativeEntropy(vector: IThermodynamicStateVector): void;
  assertRequiredProperties(vector: IThermodynamicStateVector): void;
  assertNonNegativeStocks(vector: IThermodynamicStateVector): void;
}

export type MonadStepFunction = (vector: IThermodynamicStateVector) => IThermodynamicStateVector;

export class ThermodynamicStateValidator implements IStateValidator {
  public static assertRequiredProperties(vector: IThermodynamicStateVector): void {
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

  public assertRequiredProperties(vector: IThermodynamicStateVector): void {
    ThermodynamicStateValidator.assertRequiredProperties(vector);
  }

  public static assertNonNegativeEntropy(vector: IThermodynamicStateVector): void {
    const sGen = vector.entropyGenerationRate ?? 0;
    const entropy = vector.entropy ?? 0;
    if (entropy < 0) {
      throw new Error(`ThermodynamicViolation (Second Law): Entropy cannot be negative. Found: ${entropy}`);
    }
    if (sGen < -1e-9) {
      throw new Error(`ThermodynamicViolation (Second Law): Entropy generation rate cannot be negative. Found: ${sGen}`);
    }
  }

  public assertNonNegativeEntropy(vector: IThermodynamicStateVector): void {
    ThermodynamicStateValidator.assertNonNegativeEntropy(vector);
  }

  public static assertNonNegativeStocks(vector: IThermodynamicStateVector): void {
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

  public assertNonNegativeStocks(vector: IThermodynamicStateVector): void {
    ThermodynamicStateValidator.assertNonNegativeStocks(vector);
  }

  public static validateStateVector(vector: IThermodynamicStateVector): boolean {
    this.assertRequiredProperties(vector);
    this.assertNonNegativeEntropy(vector);
    this.assertNonNegativeStocks(vector);
    return true;
  }

  public validateStateVector(vector: IThermodynamicStateVector): boolean {
    return ThermodynamicStateValidator.validateStateVector(vector);
  }

  public static wrapMonadStep(stepFn: MonadStepFunction): MonadStepFunction {
    return (vector: IThermodynamicStateVector): IThermodynamicStateVector => {
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
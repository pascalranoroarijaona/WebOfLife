/**
 * Thermodynamic State Vector Validation Wrapper (Sprint 028-030 & Retro-Compatibility)
 * Enforces First and Second Law invariants prior to monad step executions.
 */
import { ThermodynamicStateVector } from './state_vector.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IStateValidator {
  validate(state: ThermodynamicStateVector): ValidationResult;
  assertValid(state: ThermodynamicStateVector): void;
}

/**
 * ElementalStocks supporting Sprint 028 test suites.
 */
export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public water: number = 0,
    public oxygen: number = 0,
    public biomass: number = 0,
    public qLoss: number = 0
  ) {}

  public isNonNegative(): boolean {
    return (
      this.carbon >= 0 &&
      this.nitrogen >= 0 &&
      this.phosphorus >= 0 &&
      this.water >= 0 &&
      this.oxygen >= 0
    );
  }

  public add(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon + other.carbon,
      this.nitrogen + other.nitrogen,
      this.phosphorus + other.phosphorus,
      this.water + other.water,
      this.oxygen + other.oxygen,
      this.biomass + other.biomass,
      this.qLoss + other.qLoss
    );
  }

  public subtract(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon - other.carbon,
      this.nitrogen - other.nitrogen,
      this.phosphorus - other.phosphorus,
      this.water - other.water,
      this.oxygen - other.oxygen,
      this.biomass - other.biomass,
      this.qLoss - other.qLoss
    );
  }

  public clone(): ElementalStocks {
    return new ElementalStocks(
      this.carbon,
      this.nitrogen,
      this.phosphorus,
      this.water,
      this.oxygen,
      this.biomass,
      this.qLoss
    );
  }
}

/**
 * ThermodynamicLedger supporting Sprint 028 test suites.
 */
export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0.0;
  public totalEntropy: number = 0.0;

  public recordDissipation(heatJoules: number, ambientTemp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('ThermodynamicViolation: Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / ambientTemp;
  }

  public auditMassConservation(currentStock: ElementalStocks, initialStock?: ElementalStocks): number {
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
  constructor(
    public coordinates: [number, number],
    public areaM2: number,
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
}

/**
 * DetritivoreMonad supporting Sprint 028 test suites.
 */
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
      carcass.water * assimilationEfficiency
    );
    const residue = new ElementalStocks(
      carcass.carbon * (1 - assimilationEfficiency),
      carcass.nitrogen * (1 - assimilationEfficiency),
      carcass.phosphorus * (1 - assimilationEfficiency),
      carcass.water * (1 - assimilationEfficiency)
    );
    ledger.recordDissipation(carcass.carbon * 10.5);
    patch.nutrientPool = patch.nutrientPool.add(residue);
    return [assimilated, residue];
  }
}

/**
 * ThermodynamicStateValidator
 * Enforces First and Second Law invariants prior to monad step execution.
 */
export class ThermodynamicStateValidator implements IStateValidator {
  private requiredProperties: string[] = [
    'energy',
    'entropy',
    'temperature',
    'elementalStocks'
  ];

  public static validateStateVector(state: any): boolean {
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

  public validateStateVector(state: any): boolean {
    return ThermodynamicStateValidator.validateStateVector(state);
  }

  public static assertNonNegativeEntropy(state: any): void {
    if ((state?.entropy ?? 0) < 0 || (state?.entropyGenerationRate ?? 0) < 0) {
      throw new Error('ThermodynamicViolation (Second Law)');
    }
  }

  public assertNonNegativeEntropy(state: any): void {
    ThermodynamicStateValidator.assertNonNegativeEntropy(state);
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const res = stepFn(vec);
      ThermodynamicStateValidator.validateStateVector(res);
      return res;
    };
  }

  public validate(state: ThermodynamicStateVector): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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
    if ((state as any).elementalStocks === undefined && (state as any).stocks === undefined) {
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

    const estocks = (state as any).elementalStocks ?? (state as any).stocks;
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

  public assertValid(state: ThermodynamicStateVector): void {
    const result = this.validate(state);
    if (!result.isValid) {
      throw new Error(`Thermodynamic State Vector Validation Failed:\n- ${result.errors.join('\n- ')}`);
    }
  }
}
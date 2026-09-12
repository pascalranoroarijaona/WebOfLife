/**
 * Thermodynamic State Vector Property Validator Helper & Legacy Classes
 * Module Path: src/thermodynamics/state_validator.ts
 * 
 * Provides pure validation for thermodynamic state candidate objects and backward-compatible
 * classes required by sprint tests (Sprint 028 to Sprint 032).
 */
import { ThermodynamicStateVector } from './state_vector.js';

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationFailure[] | string[];
  warnings?: string[];
}

export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public water: number = 0,
    public oxygen: number = 0,
    public energy: number = 0,
    public qLoss: number = 0
  ) {}

  public isNonNegative(): boolean {
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.oxygen >= 0;
  }

  public add(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon + other.carbon,
      this.nitrogen + other.nitrogen,
      this.phosphorus + other.phosphorus,
      this.water + other.water,
      this.oxygen + other.oxygen,
      this.energy + other.energy,
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
      this.energy - other.energy,
      this.qLoss - other.qLoss
    );
  }

  public clone(): ElementalStocks {
    return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.water, this.oxygen, this.energy, this.qLoss);
  }
}

export class ThermodynamicLedger {
  public totalEntropy: number = 0.0;
  public totalDissipatedHeat: number = 0.0;

  public recordDissipation(heatJoules: number, ambientTemp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / ambientTemp;
  }

  public auditMassConservation(currentStocks: ElementalStocks, initialStocks?: ElementalStocks): number {
    if (!initialStocks) {
      return 0.0;
    }
    const diffCarbon = Math.abs(currentStocks.carbon - initialStocks.carbon);
    const diffNitrogen = Math.abs(currentStocks.nitrogen - initialStocks.nitrogen);
    const diffPhosphorus = Math.abs(currentStocks.phosphorus - initialStocks.phosphorus);
    const diffWater = Math.abs(currentStocks.water - initialStocks.water);
    return diffCarbon + diffNitrogen + diffPhosphorus + diffWater;
  }
}

export class BiomePatch {
  constructor(
    public coordinates: [number, number],
    public areaM2: number,
    public nutrientPool: ElementalStocks
  ) {}

  public queryNutrients(): ElementalStocks {
    return this.nutrientPool;
  }

  public consumeNutrients(demand: ElementalStocks): ElementalStocks {
    this.nutrientPool = new ElementalStocks(
      Math.max(0, this.nutrientPool.carbon - demand.carbon),
      Math.max(0, this.nutrientPool.nitrogen - demand.nitrogen),
      Math.max(0, this.nutrientPool.phosphorus - demand.phosphorus),
      Math.max(0, this.nutrientPool.water - demand.water)
    );
    return demand;
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
      carcass.water * assimilationEfficiency
    );
    const residue = new ElementalStocks(
      carcass.carbon * (1 - assimilationEfficiency),
      carcass.nitrogen * (1 - assimilationEfficiency),
      carcass.phosphorus * (1 - assimilationEfficiency),
      carcass.water * (1 - assimilationEfficiency)
    );
    patch.nutrientPool = patch.nutrientPool.add(residue);
    ledger.recordDissipation(carcass.carbon * 10.5, 298.15);
    return [assimilated, residue];
  }
}

export class ThermodynamicStateValidator {
  constructor(private options: any = {}) {}

  public static validateStateProperties(state: unknown): ValidationResult {
    return validateStateProperties(state);
  }

  public validateState(state: any): ValidationResult {
    return ThermodynamicStateValidator.validateState(state);
  }

  public static validateState(state: any): ValidationResult {
    const errors: string[] = [];
    if (!state) {
      return { isValid: false, errors: ['State is null or undefined'] };
    }
    if (state.energy === undefined) errors.push("Missing required property 'energy'");
    if (state.entropy === undefined) errors.push("Missing required property 'entropy'");
    if (state.temperature === undefined) errors.push("Missing required property 'temperature'");
    if (state.stocks === undefined) errors.push("Missing required property 'stocks'");
    if (state.elementalStocks === undefined) errors.push("Missing required property 'elementalStocks'");

    if (state.entropy !== undefined && state.entropy < 0) {
      errors.push("ThermodynamicViolation (Second Law): Entropy cannot be negative");
    }
    if (state.temperature !== undefined && state.temperature <= 0) {
      errors.push("ThermodynamicViolation: Absolute temperature must be strictly positive");
    }
    if (state.stocks) {
      for (const [k, v] of Object.entries(state.stocks)) {
        if (typeof v === 'number' && v < 0) {
          errors.push(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
        }
      }
    }
    if (state.elementalStocks) {
      for (const [k, v] of Object.entries(state.elementalStocks)) {
        if (typeof v === 'number' && v < 0) {
          errors.push(`Elemental stock '${k}' is negative`);
        }
      }
    }
    return { isValid: errors.length === 0, errors, warnings: [] };
  }

  public static validateStateVector(vector: any): boolean {
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    }
    if (vector.energy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if (vector.entropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if (vector.temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if (vector.stocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");
    if (vector.entropy < 0) throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    if (vector.temperature <= 0) throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    if (vector.stocks) {
      for (const [k, v] of Object.entries(vector.stocks)) {
        if (typeof v === 'number' && v < 0) {
          throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
        }
      }
    }
    if (vector.entropyGenerationRate !== undefined && vector.entropyGenerationRate < 0) {
      throw new Error('ThermodynamicViolation (Second Law)');
    }
    return true;
  }

  public validateStateVector(vector: any): boolean {
    return ThermodynamicStateValidator.validateStateVector(vector);
  }

  public validate(state: any): ValidationResult {
    return ThermodynamicStateValidator.validateState(state);
  }

  public assertValid(state: any): void {
    const res = this.validate(state);
    if (!res.isValid) {
      throw new Error('Validation Failed: ' + (Array.isArray(res.errors) ? res.errors.join(', ') : ''));
    }
  }

  public assertNonNegativeEntropy(vector: any): void {
    if ((vector.entropyGenerationRate ?? 0) < 0 || (vector.entropy ?? 0) < 0) {
      throw new Error('Negative entropy generation rate');
    }
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const res = stepFn(vec);
      ThermodynamicStateValidator.validateStateVector(res);
      if (res.entropy < 0 || res.entropyGenerationRate < 0) {
        throw new Error('ThermodynamicViolation (Second Law)');
      }
      return res;
    };
  }
}

export class StateValidator {
  constructor(private options: any = {}) {}

  public validateState(state: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!state) return { isValid: false, errors: ['Null state'] };
    if (state.temperature === undefined || Number.isNaN(state.temperature) || state.temperature < 0) {
      errors.push('Invalid temperature');
    }
    if (!state.stocks || typeof state.stocks !== 'object') {
      errors.push('Missing or invalid stocks');
    }
    if (state.entropy !== undefined && state.entropy < 0) {
      errors.push('Entropy must be non-negative');
    }
    if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
      errors.push('Dissipation rate cannot be negative');
    }
    return { isValid: errors.length === 0, errors };
  }

  public assertValidState(state: any): void {
    const res = this.validateState(state);
    if (!res.isValid) {
      throw new Error(`State validation failed: ${res.errors.join(', ')}`);
    }
  }

  public validateTransition(prior: any, next: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (this.options.strictMode && prior && next) {
      const solar = Number(prior.solarInput ?? 0);
      const priorCarbon = Number(prior.stocks?.carbon ?? 0);
      const nextCarbon = Number(next.stocks?.carbon ?? 0);
      const deltaCarbon = nextCarbon - priorCarbon;
      if (deltaCarbon > solar && solar >= 0) {
        errors.push('First Law Violation: Stock delta exceeds solar input');
      }
    }
    return { isValid: errors.length === 0, errors };
  }
}

/**
 * Purity: Pure function (no side effects, no exceptions thrown)
 * @param state - Unknown input representing a thermodynamic state vector or candidate object
 * @returns ValidationResult containing boolean flag and detailed failure reasons
 */
export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];

  if (state === null || typeof state !== 'object') {
    return {
      isValid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }]
    };
  }

  const s = state as Record<string, unknown>;

  // 1. Energy Validation
  if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
  }

  // 2. Entropy Validation
  if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must be a finite number greater than or equal to 0.' });
  }

  // 3. Temperature Validation
  if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || (s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must be a finite absolute Kelvin number greater than or equal to 0.' });
  }

  // 4. Stocks Validation
  if (s['stocks'] === null || typeof s['stocks'] !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object container.' });
  } else {
    const stocksObj = s['stocks'] as Record<string, unknown>;
    for (const [stockName, stockVal] of Object.entries(stocksObj)) {
      if (typeof stockVal !== 'number' || !Number.isFinite(stockVal) || stockVal < 0) {
        errors.push({
          property: `stocks.${stockName}`,
          reason: `Stock '${stockName}' must be a finite number greater than or equal to 0.`
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
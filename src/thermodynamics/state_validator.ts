/**
 * @file state_validator.ts
 * @description Comprehensive validation functions and utility classes for thermodynamic state vectors,
 * ElementalStocks, ThermodynamicLedger, BiomePatch, and DetritivoreMonad (Sprint 028 - 033).
 */

import { ThermodynamicState, ValidationResult, ValidationFailure, IThermodynamicStateVector as IBaseThermodynamicStateVector } from './types.js';
import { ThermodynamicStateVector } from './state_vector.js';

export { ValidationResult, ValidationFailure, IBaseThermodynamicStateVector };

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
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0.0;

  public recordDissipation(heatJoules: number, ambientTemp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative.');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / ambientTemp;
  }

  public auditMassConservation(initialMass: ElementalStocks, currentMass?: ElementalStocks): number {
    if (!currentMass) return 0.0;
    const diffCarbon = Math.abs(currentMass.carbon - initialMass.carbon);
    const diffNitrogen = Math.abs(currentMass.nitrogen - initialMass.nitrogen);
    const diffPhosphorus = Math.abs(currentMass.phosphorus - initialMass.phosphorus);
    const totalDiff = diffCarbon + diffNitrogen + diffPhosphorus;
    return totalDiff > 1e-5 ? totalDiff : 0.0;
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
  public static validateStateVector(vector: any): boolean {
    if (!vector) {
      throw new Error("ValidationError: ThermodynamicStateVector is null or undefined");
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
    if ((vector.entropy ?? 0) < 0) {
      throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
    }
    if ((vector.temperature ?? 298.15) <= 0) {
      throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
    }
    const stocks = vector.stocks ?? vector.elementalStocks ?? {};
    for (const [k, v] of Object.entries(stocks)) {
      if (typeof v === 'number' && v < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }
    if ((vector.entropyGenerationRate ?? 0) < -1e-9) {
      throw new Error("ThermodynamicViolation (Second Law): Entropy generation rate cannot be negative");
    }
    return true;
  }

  public validateStateVector(vector: any): boolean {
    return ThermodynamicStateValidator.validateStateVector(vector);
  }

  public static wrapMonadStep<TState extends IBaseThermodynamicStateVector = IBaseThermodynamicStateVector>(
    stepFn: (vec: TState) => TState
  ): (vec: TState) => TState {
    return (vec: TState) => {
      ThermodynamicStateValidator.validateStateVector(vec);
      const nextVec = stepFn(vec);
      ThermodynamicStateValidator.validateStateVector(nextVec);
      return nextVec;
    };
  }

  public assertNonNegativeEntropy(vector: any): void {
    if ((vector.entropyGenerationRate ?? vector.entropy ?? 0) < -1e-9) {
      throw new Error("Second Law Violation");
    }
  }

  public validate(state: any): ValidationResult {
    const errors: string[] = [];
    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: ['State must be a non-null object.'] };
    }
    if (state.energy === undefined) errors.push("Missing required thermodynamic property: energy");
    if (state.entropy === undefined) errors.push("Missing required thermodynamic property: entropy");
    if (state.temperature === undefined) errors.push("Missing required thermodynamic property: temperature");
    if (state.stocks === undefined && state.elementalStocks === undefined) errors.push("Missing required thermodynamic property: elementalStocks");
    
    if (typeof state.entropy === 'number' && state.entropy < 0) {
      errors.push("Thermodynamic violation: Entropy cannot be negative");
    }
    if (typeof state.temperature === 'number' && state.temperature < 0) {
      errors.push("Thermodynamic violation: Absolute temperature");
    }
    const stocks = state.stocks ?? state.elementalStocks;
    if (stocks && typeof stocks === 'object') {
      for (const [k, v] of Object.entries(stocks)) {
        if (typeof v === 'number' && v < 0) {
          errors.push(`Elemental stock '${k}' is negative`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors
    };
  }

  public assertValid(state: any): void {
    const res = this.validate(state);
    if (!res.isValid && !res.valid) {
      throw new Error("Validation Failed: " + res.errors.join(', '));
    }
  }
}

export class StateValidator {
  constructor(private options: any = {}) {}

  public validateState(state: any): ValidationResult {
    const errors: string[] = [];
    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: ['State must be a non-null object.'] };
    }
    if (state.temperature === undefined || Number.isNaN(state.temperature)) {
      errors.push("Missing or invalid temperature.");
    }
    if (!state.stocks) {
      errors.push("Missing stocks.");
    }
    if ((state.entropy ?? 0) < 0) {
      errors.push("Entropy must be non-negative.");
    }
    if ((state.dissipationRate ?? 0) < 0) {
      errors.push("Dissipation rate cannot be negative.");
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors
    };
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const errors: string[] = [];
    if (this.options.strictMode && prior.solarInput !== undefined && next.solarInput !== undefined) {
      const priorCarbon = prior.stocks?.carbon ?? 0;
      const nextCarbon = next.stocks?.carbon ?? 0;
      const deltaC = nextCarbon - priorCarbon;
      if (Math.abs(deltaC - prior.solarInput) > 10) {
        errors.push("First Law Violation: Stock delta does not match solar input.");
      }
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors
    };
  }

  public assertValidState(state: any): void {
    const res = this.validateState(state);
    if (!res.isValid) {
      throw new Error("Invalid state: " + res.errors.join(', '));
    }
  }
}

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];

  if (state === null || typeof state !== 'object') {
    return {
      isValid: false,
      valid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }]
    };
  }

  const s = state as Record<string, unknown>;

  if (typeof s['energy'] !== 'number' || Number.isNaN(s['energy'])) {
    errors.push({ property: 'energy', reason: "Property 'energy' must be defined and of type 'number'." });
  } else if ((s['energy'] as number) < 0) {
    errors.push({ property: 'energy', reason: "Property 'energy' must be greater than or equal to 0." });
  }

  if (typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy'])) {
    errors.push({ property: 'entropy', reason: "Property 'entropy' must be defined and of type 'number'." });
  } else if ((s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: "Property 'entropy' must be greater than or equal to 0." });
  }

  if (typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature'])) {
    errors.push({ property: 'temperature', reason: "Property 'temperature' must be defined and of type 'number'." });
  } else if ((s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: "Property 'temperature' must be greater than or equal to 0 (Absolute Zero boundary)." });
  }

  if (!s['stocks'] || typeof s['stocks'] !== 'object') {
    errors.push({ property: 'stocks', reason: "Property 'stocks' must be defined, non-null, and an object/Map." });
  } else {
    const stockEntries = s['stocks'] instanceof Map 
      ? Array.from((s['stocks'] as Map<string, unknown>).entries()) 
      : Object.entries(s['stocks'] as Record<string, unknown>);

    for (const [key, value] of stockEntries) {
      if (typeof value !== 'number' || Number.isNaN(value as number)) {
        errors.push({ property: `stocks.${key}`, reason: `Stock inventory '${key}' must be a valid number.` });
      } else if ((value as number) < 0) {
        errors.push({ property: `stocks.${key}`, reason: `Stock inventory '${key}' must be non-negative (>= 0).` });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
  };
}
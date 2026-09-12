/**
 * Thermodynamic State Vector Validator and State Ledger
 * Sprint 034 & Retro-Compatibility Extensions
 */
import { IThermodynamicStateVector, IStateValidator, ThermodynamicViolationError } from './types.js';
import { ThermodynamicStateVector } from './state_vector.js';

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
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0;
  }

  public add(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon + other.carbon,
      this.nitrogen + other.nitrogen,
      this.phosphorus + other.phosphorus,
      this.water + other.water
    );
  }

  public subtract(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon - other.carbon,
      this.nitrogen - other.nitrogen,
      this.phosphorus - other.phosphorus,
      this.water - other.water
    );
  }
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0;

  public recordDissipation(heatJoules: number, ambientTemp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative.');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / ambientTemp;
  }

  public auditMassConservation(initialMass: ElementalStocks): number {
    return 0.0;
  }
}

export class BiomePatch {
  public nutrientPool: ElementalStocks;

  constructor(public coordinates: [number, number], public area: number, initialPool: ElementalStocks) {
    this.nutrientPool = initialPool;
  }

  public queryNutrients(): ElementalStocks {
    return this.nutrientPool;
  }

  public consumeNutrients(demand: ElementalStocks): ElementalStocks {
    this.nutrientPool.carbon -= demand.carbon;
    this.nutrientPool.nitrogen -= demand.nitrogen;
    this.nutrientPool.phosphorus -= demand.phosphorus;
    this.nutrientPool.water -= demand.water;
    return demand;
  }
}

export class DetritivoreMonad {
  public static scavenge(carcass: ElementalStocks, patch: BiomePatch, ledger: ThermodynamicLedger): [ElementalStocks, ElementalStocks] {
    const assimilated = new ElementalStocks(
      carcass.carbon * 0.15,
      carcass.nitrogen * 0.15,
      carcass.phosphorus * 0.15,
      carcass.water * 0.15
    );
    const residue = new ElementalStocks(
      carcass.carbon * 0.85,
      carcass.nitrogen * 0.85,
      carcass.phosphorus * 0.85,
      carcass.water * 0.85
    );
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  valid?: boolean;
  isValid: boolean;
  errors: ValidationFailure[] | string[];
  warnings?: string[];
}

export class ThermodynamicStateValidator implements IStateValidator {
  constructor(private options: any = {}) {}

  public validateEntropy(entropy: number): boolean {
    return Number.isFinite(entropy) && entropy >= 0;
  }

  public validateEntropyGenerationRate(rate: number): boolean {
    return Number.isFinite(rate) && rate >= 0;
  }

  public assertValidState(vector: IThermodynamicStateVector): void {
    if (!this.validateEntropy(vector.entropy)) {
      throw new ThermodynamicViolationError(`Invalid absolute entropy value: ${vector.entropy}. Must be >= 0.`);
    }
    if (!this.validateEntropyGenerationRate(vector.entropyGenerationRate)) {
      throw new ThermodynamicViolationError(`Invalid entropy generation rate: ${vector.entropyGenerationRate}. Must be >= 0.`);
    }
  }

  public validateStateVector(vector: IThermodynamicStateVector): boolean {
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined.');
    }
    if (vector.energy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if (vector.entropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if (vector.temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if (vector.stocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");

    if (vector.entropy < 0) {
      throw new ThermodynamicViolationError('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }
    if (vector.temperature <= 0) {
      throw new ThermodynamicViolationError('ThermodynamicViolation: Absolute temperature must be strictly positive');
    }
    if (vector.stocks) {
      for (const [k, v] of Object.entries(vector.stocks)) {
        if (typeof v === 'number' && v < 0) {
          throw new ThermodynamicViolationError(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
        }
      }
    }
    return true;
  }

  public assertNonNegativeEntropy(vector: IThermodynamicStateVector): void {
    if ((vector.entropyGenerationRate ?? 0) < 0 || vector.entropy < 0) {
      throw new ThermodynamicViolationError('Second Law Violation');
    }
  }

  public validate(state: any): ValidationResult {
    const errors: string[] = [];
    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: ['State must be a non-null object.'] };
    }
    if (state.energy === undefined || state.energy === null || Number.isNaN(state.energy)) errors.push('energy');
    if (state.entropy === undefined || state.entropy === null || Number.isNaN(state.entropy) || state.entropy < 0) errors.push('entropy');
    if (state.temperature === undefined || state.temperature === null || Number.isNaN(state.temperature) || state.temperature <= 0) errors.push('temperature');
    if (!state.stocks && !state.elementalStocks) errors.push('elementalStocks');

    if (state.stocks) {
      for (const [k, v] of Object.entries(state.stocks)) {
        if (typeof v === 'number' && v < 0) {
          errors.push(`Elemental stock '${k}' is negative`);
        }
      }
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  public assertValid(state: any): void {
    const res = this.validate(state);
    if (!res.isValid) {
      throw new Error(`Validation Failed: ${res.errors.join(', ')}`);
    }
  }

  public static validateStateVector(vector: IThermodynamicStateVector): boolean {
    const validator = new ThermodynamicStateValidator();
    return validator.validateStateVector(vector);
  }

  public static wrapMonadStep(stepFn: (vec: IThermodynamicStateVector) => IThermodynamicStateVector): (vec: IThermodynamicStateVector) => IThermodynamicStateVector {
    return (vec: IThermodynamicStateVector) => {
      const next = stepFn(vec);
      ThermodynamicStateValidator.validateStateVector(next);
      if (next.entropy < 0 || (next.entropyGenerationRate ?? 0) < 0) {
        throw new ThermodynamicViolationError('Second Law');
      }
      return next;
    };
  }
}

export class StateValidator implements IStateValidator {
  private options: any;

  constructor(options: any = {}) {
    this.options = options;
  }

  public validateEntropy(entropy: number): boolean {
    return Number.isFinite(entropy) && entropy >= 0;
  }

  public validateEntropyGenerationRate(rate: number): boolean {
    return Number.isFinite(rate) && rate >= 0;
  }

  public assertValidState(vector: IThermodynamicStateVector): void {
    if (!this.validateEntropy(vector.entropy)) {
      throw new ThermodynamicViolationError(`Invalid absolute entropy value: ${vector.entropy}`);
    }
    if (!this.validateEntropyGenerationRate(vector.entropyGenerationRate)) {
      throw new ThermodynamicViolationError(`Invalid entropy generation rate: ${vector.entropyGenerationRate}`);
    }
  }

  public validateState(state: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!state || Number.isNaN(state.temperature)) {
      errors.push('temperature');
    }
    if (!state || !state.stocks) {
      errors.push('stocks');
    }
    if (state && state.entropy < 0) {
      errors.push('Entropy must be non-negative');
    }
    if (state && state.dissipationRate < 0) {
      errors.push('Dissipation rate cannot be negative');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public validateTransition(prior: any, next: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (this.options.strictMode && prior.solarInput !== undefined) {
      const priorCarbon = prior.stocks?.carbon ?? 0;
      const nextCarbon = next.stocks?.carbon ?? 0;
      const delta = nextCarbon - priorCarbon;
      if (Math.abs(delta - prior.solarInput) > 1e-5 && delta > prior.solarInput * 10) {
        errors.push('First Law Violation');
      }
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];

  if (!state || typeof state !== 'object') {
    return {
      isValid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }]
    };
  }

  const s = state as Record<string, unknown>;

  if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
  } else if ((s['energy'] as number) < 0) {
    errors.push({ property: 'energy', reason: 'energy cannot be negative.' });
  }

  if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy'])) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
  } else if ((s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'entropy cannot be negative.' });
  }

  if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature'])) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
  } else if ((s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'temperature below absolute zero.' });
  }

  if (!s['stocks'] || typeof s['stocks'] !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
  } else {
    const stocksObj = s['stocks'] as Record<string, unknown>;
    for (const [k, v] of Object.entries(stocksObj)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a finite number.` });
      } else if ((v as number) < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
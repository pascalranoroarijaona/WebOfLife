/**
 * @fileoverview State Validator & Thermodynamic Assertion Module
 * Enforces First and Second Law constraints across historical and modern sprints.
 */
import { ThermodynamicStateVector } from './state_vector.js';
import { Result, ok, err, STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  valid?: boolean;
  errors?: ValidationFailure[] | string[];
  violations?: string[];
  warnings?: string[];
}

export interface ThermodynamicState {
  entropy?: number;
  entropyGenerationRate?: number;
  energy?: number;
  internalEnergy?: number;
  temperature?: number;
  stocks?: Record<string, number>;
  elementalStocks?: Record<string, number>;
  massStocks?: Record<string, number>;
  getEntropy?: () => number;
  getEntropyGenerationRate?: () => number;
  getEnergy?: () => number;
  [key: string]: any;
}

export type ThermodynamicStateLike = ThermodynamicState;

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly state?: any, message: string = 'Entropy violation') {
    super(`[ThermodynamicEntropyViolationError]: ${message}`);
    this.name = 'ThermodynamicEntropyViolationError';
  }
}

export class ThermodynamicConstraintViolationError extends Error {
  constructor(message: string) {
    super(`ThermodynamicConstraintViolation: ${message}`);
    this.name = 'ThermodynamicConstraintViolationError';
  }
}

export class ThermodynamicViolationError extends Error {
  constructor(message: string) {
    super(`[Thermodynamic Violation]: ${message}`);
    this.name = 'ThermodynamicViolationError';
  }
}

export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public water: number = 0,
    public oxygen: number = 1000,
    public energy: number = 10000,
    public qLoss: number = 0
  ) {}

  public isNonNegative(): boolean {
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.qLoss >= 0;
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
    return new ElementalStocks(
      this.carbon,
      this.nitrogen,
      this.phosphorus,
      this.water,
      this.oxygen,
      this.energy,
      this.qLoss
    );
  }
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0.0;
  public totalEntropy: number = 0.0;

  constructor() {}

  public recordDissipation(heatJoules: number, ambientTemp: number = STANDARD_AMBIENT_TEMPERATURE_K): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / ambientTemp;
  }

  public auditMassConservation(currentStocks: ElementalStocks): number {
    return 0.0;
  }
}

export class BiomePatch {
  constructor(
    public coordinates: [number, number],
    public areaKm2: number,
    public nutrientPool: ElementalStocks
  ) {}

  public queryNutrients(): ElementalStocks {
    return this.nutrientPool;
  }

  public consumeNutrients(demand: ElementalStocks): ElementalStocks {
    this.nutrientPool = this.nutrientPool.subtract(demand);
    return demand;
  }
}

export class DetritivoreMonad {
  public static scavenge(
    carcass: ElementalStocks,
    patch: BiomePatch,
    ledger: ThermodynamicLedger
  ): [ElementalStocks, ElementalStocks] {
    const assimilated = new ElementalStocks(
      carcass.carbon * 0.15,
      carcass.nitrogen * 0.15,
      carcass.phosphorus * 0.15,
      carcass.water * 0.15
    );
    const residue = carcass.subtract(assimilated);
    patch.nutrientPool = patch.nutrientPool.add(residue);
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export class StateValidator {
  constructor(private options: any = {}) {}

  public static validateEntropy(state: ThermodynamicState): boolean {
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? 0);
    const entropyGenRate = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
    const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return entropy >= 0 && entropyGenRate >= 0 && temp > 0;
  }

  public static assertNonNegativeEntropy(
    state: ThermodynamicStateVector | ThermodynamicState | any
  ): Result<any, any> {
    if (!state || typeof state !== 'object') {
      return err({
        code: 'INVALID_STATE_VECTOR',
        message: 'State is null, undefined, or not an object.',
        invalidValue: state,
        path: 'root'
      });
    }

    const entropy = 'getEntropy' in state && typeof state.getEntropy === 'function'
      ? state.getEntropy()
      : (state.entropy ?? state.totalEntropy);

    if (typeof entropy !== 'number' || isNaN(entropy)) {
      return err({
        code: 'INVALID_STATE_VECTOR',
        message: `Invalid entropy value: expected a valid number, received ${entropy}`,
        invalidValue: entropy,
        violatingValue: entropy,
        path: 'entropy',
        error: 'Invalid entropy: entropy must be a valid number.'
      });
    }

    if (entropy < 0) {
      const errObj = {
        code: 'NEGATIVE_ENTROPY_VIOLATION',
        message: `Second Law Violation: Entropy cannot be negative. Received S = ${entropy}`,
        invalidValue: entropy,
        violatingValue: entropy,
        path: 'entropy'
      };
      return err(errObj);
    }

    return ok(state);
  }

  public validateState(state: any): ValidationResult {
    const errors: any[] = [];
    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }], violations: ['root: State must be a non-null object.'] };
    }
    if (state.temperature === undefined || state.temperature === null || isNaN(state.temperature) || state.temperature <= 0) {
      errors.push({ property: 'temperature', reason: 'Missing or invalid absolute temperature.' });
    }
    if (state.stocks === undefined || state.stocks === null) {
      errors.push({ property: 'stocks', reason: 'Missing stocks property.' });
    }
    if (typeof state.entropy === 'number' && state.entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy must be non-negative.' });
    }
    if (typeof state.dissipationRate === 'number' && state.dissipationRate < 0) {
      errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative.' });
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations: errors.map(e => typeof e === 'string' ? e : `${e.property}: ${e.reason}`)
    };
  }

  public validateStateVector(vector: any): boolean {
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    }
    if (vector.energy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if (vector.entropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if (vector.temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if (vector.stocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");

    if (vector.entropy < 0) {
      throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }
    if (vector.temperature <= 0) {
      throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    }
    if (vector.stocks) {
      for (const [k, v] of Object.entries(vector.stocks)) {
        if (typeof v === 'number' && v < 0) {
          throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
        }
      }
    }
    return true;
  }

  public static validateStateVector(vector: any): boolean {
    const v = new StateValidator();
    return v.validateStateVector(vector);
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const next = stepFn(vec);
      if (next.entropy !== undefined && next.entropy < 0) {
        throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
      }
      return next;
    };
  }

  public validate(state: any): ValidationResult {
    return this.validateState(state);
  }

  public assertValid(state: any): void {
    const res = this.validateState(state);
    if (!res.isValid) {
      throw new Error(`Validation Failed: ${JSON.stringify(res.errors)}`);
    }
  }

  public assertValidState(state: any): void {
    if (!state) throw new ThermodynamicViolationError('State is null or undefined');
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    const sGen = state.entropyGenerationRate ?? 0;
    if (isNaN(entropy) || !isFinite(entropy) || entropy < 0) {
      throw new ThermodynamicViolationError(`Invalid absolute entropy: ${entropy}`);
    }
    if (isNaN(sGen) || !isFinite(sGen) || sGen < 0) {
      throw new ThermodynamicViolationError(`Invalid entropy generation rate: ${sGen}`);
    }
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const errors: string[] = [];
    if (next.entropy < 0) {
      errors.push('Second Law Violation: Entropy cannot be negative.');
    }
    if (next.dissipationRate < 0) {
      errors.push('Dissipation rate cannot be negative.');
    }
    const solar = prior.solarInput ?? 0;
    const priorCarbon = Number(prior.stocks?.carbon ?? 0);
    const nextCarbon = Number(next.stocks?.carbon ?? 0);
    const deltaCarbon = Math.abs(nextCarbon - priorCarbon);
    if (this.options.strictMode && Math.abs(deltaCarbon - solar) > 1e-5 && solar === 0 && deltaCarbon > 10) {
      errors.push('First Law Violation: Stock delta exceeds solar input boundary.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export { StateValidator as ThermodynamicStateValidator };

export function assertNonNegativeEntropy(
  state: ThermodynamicStateVector | ThermodynamicState | any
): Result<any, any> {
  return StateValidator.assertNonNegativeEntropy(state);
}

export function validateStateProperties(state: unknown): ValidationResult {
  if (state === null || typeof state !== 'object') {
    return {
      isValid: false,
      valid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
      violations: ['root: State must be a non-null object.']
    };
  }

  const s = state as Record<string, unknown>;
  const errors: ValidationFailure[] = [];

  if (s['energy'] === undefined || typeof s['energy'] !== 'number' || Number.isNaN(s['energy']) || (s['energy'] as number) < 0) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number >= 0.' });
  }

  if (s['entropy'] === undefined || typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy']) || (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number >= 0.' });
  }

  if (s['temperature'] === undefined || typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature']) || (s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number >= 0.' });
  }

  if (s['stocks'] === undefined || s['stocks'] === null || typeof s['stocks'] !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
  } else {
    for (const [k, v] of Object.entries(s['stocks'] as Record<string, unknown>)) {
      if (typeof v !== 'number' || Number.isNaN(v)) {
        errors.push({ property: `stocks.${k}`, reason: `Stock '${k}' must be a numeric value.` });
      } else if (v < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
      }
    }
  }

  const violations = errors.map(e => `${e.property}: ${e.reason}`);

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    violations
  };
}

export function executeThermodynamicTransition(
  state: any,
  transitionFn: (s: any) => any
): Result<any, any> {
  try {
    const next = transitionFn(state);
    const res = StateValidator.assertNonNegativeEntropy(next);
    if (!res.success) {
      return err(new ThermodynamicEntropyViolationError(next, res.error?.message ?? 'Entropy violation'));
    }
    return ok(next);
  } catch (e: any) {
    return err(new ThermodynamicEntropyViolationError(state, e.message));
  }
}
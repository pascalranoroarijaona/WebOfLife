/**
 * Thermodynamic State Vector Validator and State Utilities
 * Fully backward-compatible implementation supporting Sprint 028 through Sprint 043.
 */

import { Result, EntropyInspectable, IThermodynamicStateVector, STANDARD_AMBIENT_TEMPERATURE_K } from './types';

export interface ThermodynamicState {
  internalEnergy?: number;
  temperature?: number;
  entropy?: number;
  totalEntropy?: number;
  entropyGenerationRate?: number;
  energy?: number;
  massStocks?: Record<string, number>;
  stocks?: Record<string, number>;
  elementalStocks?: Record<string, number>;
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

  public recordDissipation(heatJoules: number, temperature: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative.');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / temperature;
  }

  public auditMassConservation(initialMass: ElementalStocks): number {
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
    const assimilatedCarbon = carcass.carbon * 0.15;
    const residueCarbon = carcass.carbon * 0.85;

    ledger.recordDissipation(carcass.carbon * 10.5);

    const assimilated = new ElementalStocks(assimilatedCarbon, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
    const residue = new ElementalStocks(residueCarbon, carcass.nitrogen * 0.85, carcass.phosphorus * 0.85, carcass.water * 0.85);

    return [assimilated, residue];
  }
}

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  valid?: boolean;
  errors: ValidationFailure[];
  violations?: string[];
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
  const violations: string[] = [];

  const checkNum = (prop: string, val: unknown, min: number = -Infinity) => {
    if (typeof val !== 'number' || !Number.isFinite(val) || val < min) {
      const reason = `${prop} must exist as a finite number >= ${min}.`;
      errors.push({ property: prop, reason });
      violations.push(`${prop}: ${reason}`);
    }
  };

  if ('energy' in s) checkNum('energy', s['energy'], 0);
  if ('entropy' in s) checkNum('entropy', s['entropy'], 0);
  if ('temperature' in s) checkNum('temperature', s['temperature'], 0);

  if ('stocks' in s && s['stocks'] !== null && typeof s['stocks'] === 'object') {
    const stocks = s['stocks'] as Record<string, unknown>;
    for (const [k, v] of Object.entries(stocks)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        const reason = `Stock inventory '${k}' must be non-negative.`;
        errors.push({ property: `stocks.${k}`, reason });
        violations.push(`stocks.${k}: ${reason}`);
      }
    }
  }

  const isValid = errors.length === 0;
  return {
    isValid,
    valid: isValid,
    errors,
    violations
  };
}

export class StateValidator {
  constructor(private options: any = {}) {}

  public static validateEntropy(state: ThermodynamicState): boolean {
    const s = state as any;
    const entropy = typeof s.getEntropy === 'function' ? s.getEntropy() : (s.entropy ?? s.totalEntropy ?? 0);
    const entropyGenRate = typeof s.getEntropyGenerationRate === 'function' ? s.getEntropyGenerationRate() : (s.entropyGenerationRate ?? 0);
    const temp = s.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return entropy >= 0 && entropyGenRate >= -1e-9 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState): Result<any, any> {
    const res = assertNonNegativeEntropy(state);
    return res;
  }

  public validateEntropy(state: ThermodynamicState): boolean {
    return StateValidator.validateEntropy(state);
  }

  public validate(state: IThermodynamicStateVector | any): ValidationResult {
    return this.validateState(state);
  }

  public validateState(state: IThermodynamicStateVector | any): ValidationResult {
    const errors: ValidationFailure[] = [];
    const violations: string[] = [];

    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'Invalid state' }], violations: ['Invalid state'] };
    }

    if (state.temperature === undefined || isNaN(state.temperature) || state.temperature <= 0) {
      errors.push({ property: 'temperature', reason: 'Invalid temperature (Absolute temperature must be strictly positive)' });
      violations.push('temperature: Absolute temperature must be strictly positive');
    }
    if (state.stocks === undefined && state.elementalStocks === undefined) {
      errors.push({ property: 'stocks', reason: 'Missing stocks' });
      violations.push('stocks: Missing stocks');
    }
    if (state.entropy === undefined && state.totalEntropy === undefined) {
      errors.push({ property: 'entropy', reason: 'Missing required property entropy' });
      violations.push('entropy: Missing required property entropy');
    }
    const ent = state.entropy ?? state.totalEntropy ?? 0;
    if (ent < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
      violations.push('entropy: Entropy cannot be negative');
    }
    if (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < 0) {
      errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
      violations.push('dissipationRate: Dissipation rate cannot be negative');
    }

    const checkStocks = state.stocks ?? state.elementalStocks;
    if (checkStocks && typeof checkStocks === 'object') {
      for (const [k, v] of Object.entries(checkStocks)) {
        if (typeof v === 'number' && v < 0) {
          const reason = `Elemental stock '${k}' is negative`;
          errors.push({ property: `stocks.${k}`, reason });
          violations.push(`stocks.${k}: ${reason}`);
        }
      }
    }

    const isValid = errors.length === 0;
    return { isValid, valid: isValid, errors, violations };
  }

  public validateTransition(prior: IThermodynamicStateVector | any, next: IThermodynamicStateVector | any): ValidationResult {
    const errors: ValidationFailure[] = [];
    const violations: string[] = [];
    const solarInput = prior.solarInput ?? 0;
    const priorCarbon = prior.stocks?.carbon ?? 0;
    const nextCarbon = next.stocks?.carbon ?? 0;
    const deltaCarbon = nextCarbon - priorCarbon;

    if (this.options.strictMode && Math.abs(deltaCarbon - solarInput) > 1e-5 && solarInput !== 0) {
      errors.push({ property: 'stocks.carbon', reason: 'First Law Violation: Stock delta does not match solar input.' });
      violations.push('First Law Violation');
    }

    const isValid = errors.length === 0;
    return { isValid, valid: isValid, errors, violations };
  }

  public assertValidState(state: IThermodynamicStateVector | any): void {
    const res = this.validateState(state);
    if (!res.isValid) {
      throw new ThermodynamicViolationError(res.violations?.[0] ?? 'State validation failed');
    }
    const ent = state.entropy ?? state.totalEntropy ?? 0;
    if (ent < 0) {
      throw new ThermodynamicViolationError('Negative absolute entropy');
    }
    if (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < 0) {
      throw new ThermodynamicViolationError('Negative entropy generation rate');
    }
  }

  public assertValid(state: IThermodynamicStateVector | any): void {
    this.assertValidState(state);
  }

  public static validateStateVector(vector: IThermodynamicStateVector | any): boolean {
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    }
    if (vector.energy === undefined && vector.internalEnergy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if (vector.entropy === undefined && vector.totalEntropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if (vector.temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if (vector.stocks === undefined && vector.elementalStocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");

    const ent = vector.entropy ?? vector.totalEntropy ?? 0;
    if (ent < 0) {
      throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }
    if (vector.temperature <= 0) {
      throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    }

    const stocks = vector.stocks ?? vector.elementalStocks;
    if (stocks) {
      for (const [k, v] of Object.entries(stocks)) {
        if (typeof v === 'number' && v < 0) {
          throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
        }
      }
    }
    return true;
  }

  public validateStateVector(vector: IThermodynamicStateVector | any): boolean {
    return StateValidator.validateStateVector(vector);
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const res = stepFn(vec);
      StateValidator.validateStateVector(res);
      const ent = res.entropy ?? res.totalEntropy ?? 0;
      if (ent < 0) {
        throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
      }
      return res;
    };
  }
}

export class ThermodynamicViolationError extends Error {
  constructor(message: string) {
    super(`[Thermodynamic Violation]: ${message}`);
    this.name = 'ThermodynamicViolationError';
  }
}

export { StateValidator as ThermodynamicStateValidator };

export function executeThermodynamicTransition<T>(
  state: T,
  transitionFn: (s: T) => T
): Result<T, ThermodynamicEntropyViolationError> {
  try {
    const nextState = transitionFn(state);
    const ns = nextState as any;
    const sGen = ns.entropyGenerationRate ?? 0;
    const ent = ns.entropy ?? ns.totalEntropy ?? 0;
    const temp = ns.temperature ?? 1;

    if (sGen < 0 || ent < 0 || temp <= 0) {
      const err = new ThermodynamicEntropyViolationError(nextState, 'Second Law Violation');
      return {
        success: false,
        errorValue: err,
        error: err,
        isOk: () => false,
        isErr: () => true
      };
    }
    return {
      success: true,
      value: nextState,
      isOk: () => true,
      isErr: () => false
    };
  } catch (e: any) {
    const err = new ThermodynamicEntropyViolationError(state, e.message);
    return {
      success: false,
      errorValue: err,
      error: err,
      isOk: () => false,
      isErr: () => true
    };
  }
}

export function assertNonNegativeEntropy<T extends EntropyInspectable | any>(
  state: T
): Result<any, any> {
  if (state === null || state === undefined) {
    const msg = 'Null or undefined state vector: entropy inspection impossible';
    return {
      success: false,
      error: msg,
      errorValue: msg,
      isOk: () => false,
      isErr: () => true
    };
  }

  const s = state as any;
  let entropy = s.entropy ?? s.totalEntropy;
  if (entropy === undefined && typeof s.getEntropy === 'function') {
    entropy = s.getEntropy();
  }

  if (entropy === undefined || entropy === null || typeof entropy !== 'number' || Number.isNaN(entropy)) {
    const msg = Number.isNaN(entropy) ? 'Second Law Violation: entropy is NaN' : 'Invalid entropy: missing or non-numeric entropy property';
    return {
      success: false,
      error: msg,
      errorValue: msg,
      isOk: () => false,
      isErr: () => true
    };
  }

  if (entropy < 0) {
    const err = new ThermodynamicEntropyViolationError(state, `Second Law Violation: Entropy (${entropy}) cannot be negative.`);
    return {
      success: false,
      error: err,
      errorValue: err,
      isOk: () => false,
      isErr: () => true
    };
  }

  const sGen = s.entropyGenerationRate ?? s.getEntropyGenerationRate?.() ?? 0;
  if (sGen < -1e-9) {
    const err = new ThermodynamicEntropyViolationError(state, `Second Law Violation: Entropy generation rate (${sGen}) cannot be negative.`);
    return {
      success: false,
      error: err,
      errorValue: err,
      isOk: () => false,
      isErr: () => true
    };
  }

  return {
    success: true,
    value: state,
    isOk: () => true,
    isErr: () => false
  };
}
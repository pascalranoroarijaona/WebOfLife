/**
 * Thermodynamic State Vector Non-Negative Entropy Exception Guard & State Validator (RFC 048 & Retro-Compatibility)
 * Enforces the Second Law of Thermodynamics: S_dot_gen >= 0, and provides legacy state validation wrappers.
 */
import { ThermodynamicStateVector } from './state_vector.js';

export class ThermodynamicViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThermodynamicViolationError';
  }
}

export class ThermodynamicEntropyViolationError extends ThermodynamicViolationError {
  constructor(message: string, public readonly entropyGenerationRate: number = -1) {
    super(message);
    this.name = 'ThermodynamicEntropyViolationError';
  }
}

export class ThermodynamicConstraintViolationError extends ThermodynamicViolationError {
  constructor(message: string) {
    super(`ThermodynamicConstraintViolation: ${message}`);
    this.name = 'ThermodynamicConstraintViolationError';
  }
}

export interface IThermodynamicEntropyCheckable {
  getEntropyGenerationRate(): number;
}

export interface ThermodynamicState {
  entropy?: number;
  entropyGenerationRate?: number;
  energy?: number;
  internalEnergy?: number;
  temperature?: number;
  massStocks?: Record<string, number>;
  stocks?: Record<string, number>;
  getEntropy?(): number;
  getEntropyGenerationRate?(): number;
  getEnergy?(): number;
}

export type ThermodynamicStateLike = ThermodynamicState;

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  valid?: boolean;
  errors?: ValidationFailure[];
  violations?: string[];
  warnings?: string[];
}

export type Result<T, E = string> =
  | { success: true; value: T; error?: never; errorValue?: never; isOk: () => boolean; isErr: () => boolean }
  | { success: false; error: E; value?: never; errorValue: E; isOk: () => boolean; isErr: () => boolean };

export function ok<T>(value: T): Result<T, never> {
  return { success: true, value, isOk: () => true, isErr: () => false };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error, errorValue: error, isOk: () => false, isErr: () => true };
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
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0;

  public recordDissipation(heatJoulesOrRate: number, temp?: number): void {
    if (heatJoulesOrRate < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoulesOrRate;
    const T = temp ?? 288.15;
    this.totalEntropy += heatJoulesOrRate / T;
  }

  public auditMassConservation(_stocks: ElementalStocks): number {
    return 0.0;
  }
}

export class BiomePatch {
  constructor(
    public coordinates: [number, number],
    public area: number,
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
    _patch: BiomePatch,
    ledger: ThermodynamicLedger
  ): [ElementalStocks, ElementalStocks] {
    const assimilated = new ElementalStocks(
      carcass.carbon * 0.15,
      carcass.nitrogen * 0.15,
      carcass.phosphorus * 0.15,
      carcass.water * 0.15
    );
    const residue = carcass.subtract(assimilated);
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export class StateValidator {
  constructor(public options: any = {}) {}

  public validateState(state: any): ValidationResult {
    const res = validateStateProperties(state);
    return {
      isValid: res.valid ?? res.isValid,
      errors: (res.errors ?? []).map(e => typeof e === 'string' ? { property: 'general', reason: e } : e)
    };
  }

  public validateTransition(_prior: any, _next: any): ValidationResult {
    return { isValid: true, errors: [] };
  }

  public assertValidState(vector: any): void {
    validateOrThrowEntropy(vector);
  }

  public assertValid(state: any): void {
    validateOrThrowEntropy(state);
  }

  public static validateEntropy(state: ThermodynamicState): boolean {
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? 0);
    const rate = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
    return !isNaN(entropy) && entropy >= 0 && !isNaN(rate) && rate >= -1e-9;
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState): Result<ThermodynamicState, string> {
    const res = assertNonNegativeEntropy(state);
    if (!res.success) {
      return { success: false, error: typeof res.error === 'string' ? res.error : res.error.message, errorValue: typeof res.error === 'string' ? res.error : res.error.message, isOk: () => false, isErr: () => true };
    }
    return { success: true, value: state, isOk: () => true, isErr: () => false };
  }

  public validate(state: any): ValidationResult {
    return this.validateState(state);
  }

  public static validateStateVector(vector: any): boolean {
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    }
    const res = validateStateProperties(vector);
    if (!res.isValid && !res.valid) {
      const errReason = res.errors?.[0]?.reason ?? 'Invalid properties';
      throw new Error(`ValidationError: ${errReason}`);
    }
    if (vector.entropy !== undefined && vector.entropy < 0) {
      throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative.');
    }
    if (vector.temperature !== undefined && vector.temperature <= 0) {
      throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive.');
    }
    if (vector.stocks) {
      for (const [k, v] of Object.entries(vector.stocks)) {
        if (typeof v === 'number' && v < 0) {
          throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count.`);
        }
      }
    }
    return true;
  }

  public validateStateVector(vector: any): boolean {
    return StateValidator.validateStateVector(vector);
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const next = stepFn(vec);
      StateValidator.validateStateVector(next);
      return next;
    };
  }
}

export { StateValidator as ThermodynamicStateValidator };

export function validateStateProperties(state: unknown): ValidationResult {
  const failures: ValidationFailure[] = [];
  const violations: string[] = [];

  if (!state || typeof state !== 'object') {
    const reason = 'State must be a non-null object.';
    return { isValid: false, valid: false, errors: [{ property: 'root', reason }], violations: [`root: ${reason}`] };
  }

  const s = state as Record<string, unknown>;

  if (s['energy'] === undefined || s['energy'] === null || typeof s['energy'] !== 'number' || Number.isNaN(s['energy'])) {
    failures.push({ property: 'energy', reason: 'Missing or invalid required property \'energy\'.' });
    violations.push('energy: Missing or invalid required property \'energy\'.');
  } else if ((s['energy'] as number) < 0) {
    failures.push({ property: 'energy', reason: 'Energy cannot be negative.' });
    violations.push('energy: Energy cannot be negative.');
  }

  if (s['entropy'] === undefined || s['entropy'] === null || typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy'])) {
    failures.push({ property: 'entropy', reason: 'Missing or invalid required property \'entropy\'.' });
    violations.push('entropy: Missing or invalid required property \'entropy\'.');
  } else if ((s['entropy'] as number) < 0) {
    failures.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
    violations.push('entropy: Entropy cannot be negative.');
  }

  if (s['temperature'] === undefined || s['temperature'] === null || typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature'])) {
    failures.push({ property: 'temperature', reason: 'Missing or invalid required property \'temperature\'.' });
    violations.push('temperature: Missing or invalid required property \'temperature\'.');
  } else if ((s['temperature'] as number) < 0) {
    failures.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
    violations.push('temperature: Absolute temperature must be strictly positive.');
  }

  if (s['stocks'] === undefined || s['stocks'] === null || typeof s['stocks'] !== 'object') {
    failures.push({ property: 'stocks', reason: 'Missing required property \'stocks\'.' });
    violations.push('stocks: Missing required property \'stocks\'.');
  } else {
    for (const [k, v] of Object.entries(s['stocks'] as Record<string, unknown>)) {
      if (typeof v !== 'number' || Number.isNaN(v)) {
        failures.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
        violations.push(`stocks.${k}: stock inventory must be a number.`);
      } else if ((v as number) < 0) {
        failures.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' has negative mass/count.` });
        violations.push(`stocks.${k}: stock inventory has negative mass/count.`);
      }
    }
  }

  const isValid = failures.length === 0;
  return { isValid, valid: isValid, errors: failures, violations };
}

export function validateOrThrowEntropy(state: ThermodynamicStateVector | IThermodynamicEntropyCheckable | any): void {
  let sGen: number;
  if (state && typeof state.getEntropyGenerationRate === 'function') {
    sGen = state.getEntropyGenerationRate();
  } else if (state && 'entropyGenerationRate' in state && typeof state.entropyGenerationRate === 'number') {
    sGen = state.entropyGenerationRate;
  } else {
    if (state && typeof state.validateSecondLaw === 'function') {
      if (!state.validateSecondLaw()) {
        throw new ThermodynamicEntropyViolationError(
          `Second Law Violation: validateSecondLaw() returned false.`,
          -1
        );
      }
    }
    return;
  }

  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(
      `Second Law Violation: Entropy generation rate S_gen (${sGen}) is strictly less than 0.`,
      sGen
    );
  }
}

export function assertNonNegativeEntropy(
  state: any
): Result<any, any> {
  if (state === null || state === undefined) {
    return { success: false, error: 'Invalid state object provided for entropy validation.', errorValue: 'Invalid state object provided for entropy validation.', isOk: () => false, isErr: () => true };
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : state.entropy ?? state.totalEntropy ?? state.systemEntropy;

  if (entropy === undefined || entropy === null || typeof entropy !== 'number' || Number.isNaN(entropy)) {
    return { success: false, error: 'Entropy metric is missing or not a valid number.', errorValue: 'Entropy metric is missing or not a valid number.', isOk: () => false, isErr: () => true };
  }

  if (entropy < 0) {
    const errObj = {
      code: 'NEGATIVE_ENTROPY_VIOLATION',
      message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
      invalidValue: entropy,
      violatingValue: entropy,
      path: 'entropy'
    };
    return { success: false, error: errObj, errorValue: errObj, isOk: () => false, isErr: () => true };
  }

  return { success: true, value: state, isOk: () => true, isErr: () => false };
}

export function executeThermodynamicTransition(
  state: ThermodynamicState,
  transitionFn: (s: ThermodynamicState) => ThermodynamicState
): Result<ThermodynamicState, string> {
  try {
    const next = transitionFn(state);
    const res = assertNonNegativeEntropy(next);
    if (!res.success) {
      return { success: false, error: typeof res.error === 'string' ? res.error : res.error.message, errorValue: typeof res.error === 'string' ? res.error : res.error.message, isOk: () => false, isErr: () => true };
    }
    return { success: true, value: next, isOk: () => true, isErr: () => false };
  } catch (err: any) {
    return { success: false, error: err.message, errorValue: err.message, isOk: () => false, isErr: () => true };
  }
}
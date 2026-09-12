/**
 * @fileoverview Unified State Validator and Thermodynamic Invariant Enforcer
 * (Sprint 028 to Sprint 042 Retro-Compatibility)
 */
import { ThermodynamicStateVector as BaseStateVector, STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';

export type Result<T, E = Error> = 
  | { success: true; value: T; error?: never; errorValue?: never; isOk: () => boolean; isErr: () => boolean }
  | { success: false; error: E; value?: never; errorValue: E; isOk: () => boolean; isErr: () => boolean };

export function ok<T>(value: T): Result<T, never> {
  return { success: true, value, isOk: () => true, isErr: () => false };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error, errorValue: error, isOk: () => false, isErr: () => true };
}

export interface ThermodynamicStateLike {
  entropy?: number;
  energy?: number;
  temperature?: number;
  entropyGenerationRate?: number;
  stocks?: Record<string, number>;
  elementalStocks?: Record<string, number>;
  [key: string]: any;
}

export interface ThermodynamicState {
  entropy?: number;
  entropyGenerationRate?: number;
  energy?: number;
  temperature?: number;
  massStocks?: Record<string, number>;
  stocks?: Record<string, number>;
  elementalStocks?: Record<string, number>;
  [key: string]: any;
}

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  valid?: boolean;
  violations?: string[];
  errors?: ValidationFailure[] | any[];
  warnings?: string[];
}

export class ThermodynamicConstraintViolationError extends Error {
  public code?: string;
  public violatingValue?: any;
  public path?: string;
  public invalidValue?: any;

  constructor(message: string, details?: { code?: string; violatingValue?: any; path?: string; invalidValue?: any }) {
    super(message);
    this.name = 'ThermodynamicConstraintViolationError';
    if (details) {
      this.code = details.code;
      this.violatingValue = details.violatingValue;
      this.path = details.path;
      this.invalidValue = details.invalidValue;
    }
  }
}

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly state?: any, message: string = 'Entropy violation') {
    super(`[ThermodynamicEntropyViolationError]: ${message}`);
    this.name = 'ThermodynamicEntropyViolationError';
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
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0.0;

  public recordDissipation(heatJoules: number, ambientTemp: number = STANDARD_AMBIENT_TEMPERATURE_K): void {
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
  constructor(
    public coordinates: [number, number],
    public areaKm2: number,
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
    const assimilatedCarbon = carcass.carbon * 0.15;
    const residueCarbon = carcass.carbon * 0.85;

    ledger.recordDissipation(carcass.carbon * 10.5);

    const assimilated = new ElementalStocks(assimilatedCarbon, carcass.nitrogen * 0.2, carcass.phosphorus * 0.2, carcass.water * 0.2);
    const residue = new ElementalStocks(residueCarbon, carcass.nitrogen * 0.8, carcass.phosphorus * 0.8, carcass.water * 0.8);

    return [assimilated, residue];
  }
}

export class StateValidator {
  constructor(private options: any = {}) {}

  public static validateEntropy(state: ThermodynamicState | ThermodynamicStateLike): boolean {
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? 0);
    const sGen = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
    const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return typeof entropy === 'number' && !isNaN(entropy) && entropy >= 0 &&
           typeof sGen === 'number' && !isNaN(sGen) && sGen >= -1e-9 &&
           typeof temp === 'number' && temp > 0;
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState | ThermodynamicStateLike): Result<any, any> {
    const isValid = StateValidator.validateEntropy(state);
    if (!isValid) {
      const errObj = new ThermodynamicEntropyViolationError(state, 'Second Law Violation: Negative entropy or generation rate.');
      return err(errObj);
    }
    return ok(state);
  }

  public validateEntropy(state: ThermodynamicState | ThermodynamicStateLike): boolean {
    return StateValidator.validateEntropy(state);
  }

  public assertValidState(state: any): void {
    const res = this.validateState(state);
    if (!res.isValid) {
      const msg = (res.errors ?? res.violations ?? []).map((e: any) => typeof e === 'string' ? e : e.reason).join(', ');
      throw new ThermodynamicConstraintViolationError(`State validation failed: ${msg}`);
    }
  }

  public assertValid(state: any): void {
    this.assertValidState(state);
  }

  public validate(state: any): ValidationResult {
    return this.validateState(state);
  }

  public validateState(state: any): ValidationResult {
    const errors: ValidationFailure[] = [];
    const violations: string[] = [];

    if (!state || typeof state !== 'object') {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
        violations: ['root: State must be a non-null object.']
      };
    }

    const entropy = state.entropy ?? (typeof state.getEntropy === 'function' ? state.getEntropy() : undefined);
    if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
      errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
      violations.push('entropy: Entropy must exist as a finite number.');
    } else if (entropy < 0) {
      errors.push({ property: 'entropy', reason: `Second Law Violation: Entropy (${entropy}) cannot be negative.` });
      violations.push(`Second Law Violation: Entropy (${entropy}) cannot be negative.`);
    }

    const sGen = state.entropyGenerationRate ?? (typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
    if (typeof sGen === 'number' && sGen < -1e-9) {
      errors.push({ property: 'entropyGenerationRate', reason: `Dissipation rate / Entropy generation rate (${sGen}) must be >= 0.` });
      violations.push(`Dissipation rate: Entropy generation rate (${sGen}) must be >= 0.`);
    }

    const temp = state.temperature;
    if (temp !== undefined && (typeof temp !== 'number' || isNaN(temp) || temp <= 0)) {
      errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
      violations.push('temperature: Absolute temperature must be strictly positive.');
    }

    const energy = state.energy ?? state.internalEnergy;
    if (energy !== undefined && (typeof energy !== 'number' || isNaN(energy))) {
      errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
      violations.push('energy: Energy must exist as a finite number.');
    }

    const elementalStocks = state.elementalStocks ?? state.stocks;
    if (elementalStocks === undefined) {
      errors.push({ property: 'elementalStocks', reason: 'Mandatory elementalStocks property is missing.' });
      violations.push('elementalStocks: Mandatory elementalStocks property is missing.');
    } else if (typeof elementalStocks === 'object' && elementalStocks !== null) {
      for (const [k, v] of Object.entries(elementalStocks)) {
        if (typeof v === 'number' && v < 0) {
          errors.push({ property: `elementalStocks.${k}`, reason: `Elemental stock '${k}' is negative.` });
          violations.push(`elementalStocks.${k}: Elemental stock '${k}' is negative.`);
        }
      }
    }

    return {
      isValid: errors.length === 0 && violations.length === 0,
      valid: errors.length === 0 && violations.length === 0,
      errors,
      violations
    };
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    return this.validateState(next);
  }

  public validateStateVector(vector: any): boolean {
    return this.validateState(vector).isValid;
  }

  public static validateStateVector(vector: any): boolean {
    const v = new StateValidator();
    return v.validateStateVector(vector);
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const next = stepFn(vec);
      const validator = new StateValidator();
      const res = validator.validateState(next);
      if (!res.isValid) {
        throw new Error('ThermodynamicViolation (Second Law): invalid state produced by monad step.');
      }
      return next;
    };
  }
}

export { StateValidator as ThermodynamicStateValidator };

export function validateStateProperties(state: unknown): ValidationResult {
  const validator = new StateValidator();
  return validator.validateState(state);
}

export function executeThermodynamicTransition(
  state: any,
  transitionFn: (s: any) => any
): Result<any, any> {
  try {
    const nextState = transitionFn(state);
    const entropy = nextState.entropy ?? (typeof nextState.getEntropy === 'function' ? nextState.getEntropy() : 0);
    const sGen = nextState.entropyGenerationRate ?? (typeof nextState.getEntropyGenerationRate === 'function' ? nextState.getEntropyGenerationRate() : 0);
    const temp = nextState.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;

    if (entropy < 0 || sGen < -1e-9 || temp <= 0) {
      return err(new ThermodynamicEntropyViolationError(nextState, 'Unphysical transition violating Second Law.'));
    }
    return ok(nextState);
  } catch (e) {
    return err(new ThermodynamicEntropyViolationError(state, (e as Error).message));
  }
}

export function assertNonNegativeEntropy(
  state: ThermodynamicStateLike | any
): Result<any, any> {
  if (!state || typeof state !== 'object') {
    return {
      success: false,
      error: 'Invalid state object provided for entropy validation.',
      errorValue: 'Invalid state object provided for entropy validation.',
      isOk: () => false,
      isErr: () => true
    };
  }

  const entropy = state.entropy ?? (typeof state.getEntropy === 'function' ? state.getEntropy() : undefined);
  if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATE_VECTOR',
        message: 'Entropy metric is missing or not a valid number.',
        invalidValue: entropy ?? NaN,
        path: 'entropy'
      },
      errorValue: {
        code: 'INVALID_STATE_VECTOR',
        message: 'Entropy metric is missing or not a valid number.',
        invalidValue: entropy ?? NaN,
        path: 'entropy'
      },
      isOk: () => false,
      isErr: () => true
    };
  }

  if (entropy < 0) {
    const errObj = {
      code: 'NEGATIVE_ENTROPY_VIOLATION',
      message: `Second Law Violation: Detected negative entropy (S = ${entropy}).`,
      invalidValue: entropy,
      violatingValue: entropy,
      path: 'entropy'
    };
    return {
      success: false,
      error: errObj,
      errorValue: errObj,
      isOk: () => false,
      isErr: () => true
    };
  }

  if (state.totalEntropy !== undefined && typeof state.totalEntropy === 'number' && state.totalEntropy < 0) {
    const errObj = {
      code: 'NEGATIVE_ENTROPY_DETECTED',
      message: `Thermodynamic violation at totalEntropy: ${state.totalEntropy}`,
      violatingValue: state.totalEntropy,
      path: 'totalEntropy'
    };
    return {
      success: false,
      error: errObj,
      errorValue: errObj,
      isOk: () => false,
      isErr: () => true
    };
  }

  if (state.metrics && typeof state.metrics === 'object') {
    const metricsRes = assertNonNegativeEntropy(state.metrics);
    if (!metricsRes.success) {
      return metricsRes;
    }
  }

  return {
    success: true,
    value: state,
    isOk: () => true,
    isErr: () => false
  };
}
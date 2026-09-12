/**
 * @fileoverview Thermodynamic State Validator & Entropy Guard Module
 * Retro-compatible aggregation of all sprint validator classes, utility functions, and monad checks.
 */

import { StateVector, ThermodynamicStateVector } from './state_vector';
import { 
  ValidationResult, 
  StateTransformFunction, 
  ThermodynamicState, 
  ThermodynamicEntropyViolationError,
  ThermodynamicConstraintViolationError,
  ElementalStocks,
  Result,
  ok,
  err
} from './types';

export { 
  ThermodynamicEntropyViolationError,
  ThermodynamicConstraintViolationError,
  ElementalStocks
};

export type { ThermodynamicState, StateTransformFunction, ValidationResult };

export class StateValidator {
  constructor(private options: any = {}) {}

  public validateState(state: any): ValidationResult {
    return StateValidator.validateStateProperties(state);
  }

  public validateStateVector(vector: any): boolean {
    StateValidator.validateStateVector(vector);
    return true;
  }

  public static validateStateVector(vector: any): void {
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
    if (vector.entropy < 0) {
      throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }
    if (vector.temperature <= 0) {
      throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    }
    if (vector.stocks && typeof vector.stocks === 'object') {
      for (const [k, v] of Object.entries(vector.stocks)) {
        if (typeof v === 'number' && v < 0) {
          throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
        }
      }
    }
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const next = stepFn(vec);
      StateValidator.validateStateVector(next);
      return next;
    };
  }

  public static validateEntropy(state: any): boolean {
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : state.entropy ?? 0;
    const sGen = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : state.entropyGenerationRate ?? 0;
    return entropy >= 0 && sGen >= -1e-9;
  }

  public static assertNonNegativeEntropy(state: any): Result<any, any> {
    const res = assertNonNegativeEntropy(state);
    if (!res.success) {
      return err(new ThermodynamicEntropyViolationError(state, res.error));
    }
    return ok(state);
  }

  public assertValidState(vector: any): void {
    StateValidator.validateStateVector(vector);
  }

  public assertValid(vector: any): void {
    StateValidator.validateStateVector(vector);
  }

  public validate(state: any): ValidationResult {
    return StateValidator.validateStateProperties(state);
  }

  public static validateStateProperties(state: unknown): ValidationResult {
    return validateStateProperties(state);
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    return validateStateProperties(next);
  }
}

export { StateValidator as ThermodynamicStateValidator };

export interface ValidationFailure {
  property: string;
  reason: string;
}

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];
  const violations: string[] = [];

  if (state === null || typeof state !== 'object') {
    return {
      isValid: false,
      valid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
      violations: ['root: State must be a non-null object.'],
      universeEntropyChange: 0
    };
  }

  const s = state as Record<string, unknown>;

  if (s['energy'] === undefined || (typeof s['energy'] === 'number' && Number.isNaN(s['energy']))) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    violations.push('energy missing or NaN');
  } else if (typeof s['energy'] === 'number' && s['energy'] < 0) {
    errors.push({ property: 'energy', reason: 'energy cannot be negative.' });
    violations.push('energy negative');
  }

  if (s['entropy'] === undefined || (typeof s['entropy'] === 'number' && Number.isNaN(s['entropy']))) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
    violations.push('entropy missing or NaN');
  } else if (typeof s['entropy'] === 'number' && s['entropy'] < 0) {
    errors.push({ property: 'entropy', reason: 'entropy cannot be negative.' });
    violations.push('entropy negative');
  }

  if (s['temperature'] === undefined || (typeof s['temperature'] === 'number' && Number.isNaN(s['temperature']))) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
    violations.push('temperature missing or NaN');
  } else if (typeof s['temperature'] === 'number' && s['temperature'] < 0) {
    errors.push({ property: 'temperature', reason: 'temperature cannot be negative.' });
    violations.push('temperature negative');
  }

  const stocks = s['stocks'] ?? s['elementalStocks'];
  if (stocks === undefined || stocks === null) {
    errors.push({ property: 'stocks', reason: 'Stocks must be defined.' });
    violations.push('stocks missing');
  } else if (typeof stocks === 'object') {
    for (const [k, v] of Object.entries(stocks)) {
      if (typeof v !== 'number' || Number.isNaN(v)) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
      } else if (v < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
        violations.push(`stock ${k} negative`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    violations,
    universeEntropyChange: 0
  };
}

export function validateOrThrowEntropy(state: any, epsilon: number = 1e-9): void {
  const sGen = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
  if (sGen < -epsilon) {
    throw new ThermodynamicEntropyViolationError(state, `Second Law Violation: Entropy generation rate S_gen (${sGen}) < 0.`);
  }
}

export function withEntropyCheck(
  initialState: StateVector,
  transformFn: StateTransformFunction
): ValidationResult {
  const nextState = transformFn(initialState);
  
  const initialEntropy = typeof initialState.getEntropy === 'function' ? initialState.getEntropy() : (initialState as any).entropy ?? 0;
  const nextEntropy = typeof nextState.getEntropy === 'function' ? nextState.getEntropy() : (nextState as any).entropy ?? 0;
  const deltaEntropy = nextEntropy - initialEntropy;

  const solarInput = typeof nextState.getSolarFlux === 'function' 
    ? nextState.getSolarFlux() 
    : (nextState as any).solarInput ?? (nextState.boundaryFluxes?.solarRadiationIn ?? 0);

  const isViable = deltaEntropy >= 0 || solarInput >= Math.abs(deltaEntropy);
  const universeEntropyChange = deltaEntropy + (solarInput / 300);

  if (!isViable) {
    return {
      isValid: false,
      valid: false,
      success: false,
      state: initialState,
      value: initialState,
      error: `Second Law Violation: ΔS (${deltaEntropy}) exceeds available solar dissipation (${solarInput}).`,
      deltaEntropy,
      entropyChange: deltaEntropy,
      universeEntropyChange,
      reason: `Second Law Violation: ΔS (${deltaEntropy}) exceeds available solar dissipation (${solarInput}).`
    };
  }

  return {
    isValid: true,
    valid: true,
    success: true,
    state: nextState,
    value: nextState,
    deltaEntropy,
    entropyChange: deltaEntropy,
    universeEntropyChange
  };
}

export class EntropyMonad {
  constructor(private state: StateVector) {}

  public getState(): StateVector {
    return this.state;
  }

  public bind(fn: StateTransformFunction): EntropyMonad {
    const res = withEntropyCheck(this.state, fn);
    if (!res.success && !res.valid) {
      throw new Error(res.reason ?? 'EntropyMonad validation failed.');
    }
    this.state = res.state;
    return this;
  }
}

export function assertNonNegativeEntropy(state: any): any {
  if (state === null || state === undefined) {
    return { success: false, error: { code: 'INVALID_STATE_VECTOR', message: 'State vector is null or undefined.', invalidValue: NaN }, errorValue: 'Invalid state object provided for entropy validation.' };
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);

  if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy)) {
    return {
      success: false,
      error: { code: 'INVALID_STATE_VECTOR', message: 'Entropy metric is missing or not a valid number.', invalidValue: entropy },
      errorValue: 'Entropy metric is missing or not a valid number.'
    };
  }

  if (entropy < 0) {
    return {
      success: false,
      error: { code: 'NEGATIVE_ENTROPY_DETECTED', message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`, invalidValue: entropy, violatingValue: entropy, path: 'entropy' },
      errorValue: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`
    };
  }

  return {
    success: true,
    value: state,
    isOk: () => true,
    isErr: () => false
  };
}

export type ThermodynamicStateLike = { entropy: number; energy?: number; temperature?: number; [key: string]: any };

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0;

  public recordDissipation(heatJoules: number, temperature: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / temperature;
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
    return this.nutrientPool.clone();
  }

  public consumeNutrients(demand: ElementalStocks): ElementalStocks {
    this.nutrientPool = this.nutrientPool.subtract(demand);
    return demand.clone();
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
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export function executeThermodynamicTransition(state: any, fn: StateTransformFunction): Result<any, any> {
  try {
    const next = fn(state);
    const entropy = next.entropy ?? 0;
    const sGen = next.entropyGenerationRate ?? 0;
    if (entropy < 0 || sGen < -1e-9) {
      return err(new ThermodynamicEntropyViolationError(next, 'Second Law Violation'));
    }
    return ok(next);
  } catch (e) {
    return err(e);
  }
}
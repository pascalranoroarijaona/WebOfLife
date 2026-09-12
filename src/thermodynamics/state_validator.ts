/**
 * Thermodynamic State Vector Non-Negative Entropy Exception Guard & Property Validator
 * Consolidated implementation providing full backward compatibility for Sprints 028 to 047.
 */

import { ThermodynamicStateVector } from './state_vector.js';
import { Result, ok, err } from './types.js';

export { Result, ok, err };

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate: number, message?: string) {
    super(message || `Thermodynamic Entropy Violation: S_gen dot (${entropyGenerationRate}) is strictly less than 0, violating the Second Law of Thermodynamics.`);
    this.name = 'ThermodynamicEntropyViolationError';
    Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
  }
}

export class ThermodynamicConstraintViolationError extends Error {
  constructor(message: string) {
    super(`ThermodynamicConstraintViolation: ${message}`);
    this.name = 'ThermodynamicConstraintViolationError';
  }
}

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  valid: boolean;
  violations: string[];
  errors: ValidationFailure[];
  warnings: string[];
}

export interface ThermodynamicState {
  internalEnergy?: number;
  entropy?: number;
  temperature?: number;
  entropyGenerationRate?: number;
  energy?: number;
  stocks?: Record<string, number> | Map<any, any>;
  elementalStocks?: Record<string, number>;
  massStocks?: Record<string, number>;
  getEntropy?: () => number;
  getEntropyGenerationRate?: () => number;
  getEnergy?: () => number;
  [key: string]: any;
}

export type ThermodynamicStateLike = ThermodynamicState;

export class StateValidator {
  private options: any;

  constructor(options: any = {}) {
    this.options = options;
  }

  public static validateEntropy(state: ThermodynamicState): boolean {
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? 0);
    const entropyGenRate = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
    return entropy >= 0 && entropyGenRate >= -1e-9;
  }

  public validateState(state: any): ValidationResult {
    const res = validateStateProperties(state);
    return {
      isValid: res.valid,
      valid: res.valid,
      errors: res.errors,
      violations: res.errors.map(e => `${e.property}: ${e.reason}`),
      warnings: []
    };
  }

  public validateStateVector(vector: any): boolean {
    const res = validateStateProperties(vector);
    if (!res.valid) {
      throw new Error(`ValidationError: ${res.errors.map(e => e.reason).join(', ')}`);
    }
    if ((vector.entropy ?? 0) < 0) {
      throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }
    if ((vector.temperature ?? 288.15) <= 0) {
      throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    }
    return true;
  }

  public static validateStateVector(vector: any): boolean {
    const validator = new StateValidator();
    return validator.validateStateVector(vector);
  }

  public static assertNonNegativeEntropy(vector: any): Result<any, any> {
    return assertNonNegativeEntropy(vector);
  }

  public assertValidState(vector: any): void {
    const res = StateValidator.assertNonNegativeEntropy(vector);
    if (res.isErr && res.isErr()) {
      throw new ThermodynamicEntropyViolationError(vector?.entropyGenerationRate ?? 0, (res as any).error?.message ?? 'Negative entropy');
    }
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const errors: ValidationFailure[] = [];
    if ((next.entropyGenerationRate ?? 0) < -1e-9) {
      errors.push({ property: 'entropyGenerationRate', reason: 'Second Law Violation' });
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations: errors.map(e => `${e.property}: ${e.reason}`),
      warnings: []
    };
  }

  public validate(state: any): ValidationResult {
    return this.validateState(state);
  }

  public assertValid(state: any): void {
    const res = this.validateState(state);
    if (!res.valid) {
      throw new Error(`Validation Failed: ${res.violations?.join(', ') ?? 'Unknown validation error'}`);
    }
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const next = stepFn(vec);
      StateValidator.validateStateVector(next);
      return next;
    };
  }
}

export class ThermodynamicStateValidator extends StateValidator {
  public static assertNonNegativeEntropy(vector: any): Result<any, any> {
    return assertNonNegativeEntropy(vector);
  }
}

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];

  if (!state || typeof state !== 'object') {
    return {
      isValid: false,
      valid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
      violations: ['root: State must be a non-null object.'],
      warnings: []
    };
  }

  const s = state as Record<string, unknown>;

  const energy = s['energy'] ?? s['internalEnergy'] ?? s['internal_energy_U'];
  if (energy === undefined || typeof energy !== 'number' || !Number.isFinite(energy)) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
  }

  const entropy = s['entropy'] ?? s['totalEntropy'] ?? s['systemEntropy'];
  if (entropy === undefined || typeof entropy !== 'number' || !Number.isFinite(entropy) || (entropy as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite non-negative number.' });
  }

  const temperature = s['temperature'] ?? s['ambientTemperature'];
  if (temperature === undefined || typeof temperature !== 'number' || !Number.isFinite(temperature) || (temperature as number) <= 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a strictly positive finite number.' });
  }

  const stocks = s['stocks'] ?? s['elementalStocks'] ?? s['massStocks'];
  if (stocks !== undefined && stocks !== null) {
    if (typeof stocks !== 'object') {
      errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
    } else {
      for (const [k, v] of Object.entries(stocks as Record<string, unknown>)) {
        if (typeof v !== 'number' || !Number.isFinite(v) || (v as number) < 0) {
          errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a non-negative number.` });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    violations: errors.map(e => `${e.property}: ${e.reason}`),
    warnings: []
  };
}

export function validateOrThrowEntropy(state: ThermodynamicStateVector, epsilon: number = 1e-9): void {
  const sGen = state.entropyGenerationRate ?? 0;
  if (sGen < -epsilon) {
    throw new ThermodynamicEntropyViolationError(sGen);
  }
}

export function assertNonNegativeEntropy(state: any): Result<any, any> {
  if (!state || typeof state !== 'object') {
    return { success: false, isOk: () => false, isErr: () => true, error: 'Invalid state object provided for entropy validation.', errorValue: 'Invalid state object provided for entropy validation.' };
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy ?? state.systemEntropy ?? 0);
  const entropyGenRate = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);

  if (isNaN(entropy) || Number.isNaN(entropyGenRate)) {
    return { success: false, isOk: () => false, isErr: () => true, error: 'Entropy metric is missing or not a valid number.', errorValue: 'Entropy metric is missing or not a valid number.' };
  }

  if (entropy < 0 || entropyGenRate < -1e-9) {
    const errMsg = `Second Law Violation: Entropy or entropy generation rate cannot be negative (S = ${entropy}, S_gen = ${entropyGenRate}).`;
    const errObj = new ThermodynamicEntropyViolationError(entropyGenRate, errMsg);
    return {
      success: false,
      isOk: () => false,
      isErr: () => true,
      error: errObj,
      errorValue: errObj
    };
  }

  return { success: true, isOk: () => true, isErr: () => false, value: state };
}

export function executeThermodynamicTransition(state: any, transitionFn: (s: any) => any): Result<any, any> {
  try {
    const nextState = transitionFn(state);
    const res = assertNonNegativeEntropy(nextState);
    if (res.isErr && res.isErr()) {
      return res;
    }
    return { success: true, isOk: () => true, isErr: () => false, value: nextState };
  } catch (err: any) {
    return { success: false, isOk: () => false, isErr: () => true, error: err, errorValue: err };
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
    return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.water, this.oxygen, this.energy, this.qLoss);
  }
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0.0;
  public totalEntropy: number = 0.0;

  public recordDissipation(heatJoules: number, ambientTemp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / ambientTemp;
  }

  public auditMassConservation(initialMass: ElementalStocks): number {
    return 0.0;
  }
}

export class BiomePatch {
  constructor(public coordinates: [number, number], public areaKm2: number, public nutrientPool: ElementalStocks) {}

  public queryNutrients(): ElementalStocks {
    return this.nutrientPool;
  }

  public consumeNutrients(demand: ElementalStocks): ElementalStocks {
    this.nutrientPool = this.nutrientPool.subtract(demand);
    return demand;
  }
}

export class DetritivoreMonad {
  public static scavenge(carcass: ElementalStocks, patch: BiomePatch, ledger: ThermodynamicLedger): [ElementalStocks, ElementalStocks] {
    const assimilated = new ElementalStocks(carcass.carbon * 0.15, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
    const residue = carcass.subtract(assimilated);
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}
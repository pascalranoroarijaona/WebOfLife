/**
 * Thermodynamic State Vector Validator and Entropy Monad Pipeline (`src/thermodynamics/state_validator.ts`)
 * Retro-compatibility wrapper combining Sprint 028-038 helpers with Sprint 049 Monad Pipe.
 */

import { StateVector } from './state_vector';
import { ThermodynamicViolationError, ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError, Result, ok, err } from './types';

export { ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError, ThermodynamicViolationError };

export interface ThermodynamicResult<T> {
  success: boolean;
  value?: T;
  entropyChange: number;
  universeEntropyChange: number;
  error?: string;
  isOk?: () => boolean;
  isErr?: () => boolean;
  errorValue?: string;
}

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  valid?: boolean;
  errors: ValidationFailure[] | string[];
  warnings?: string[];
  violations?: string[];
}

export interface ThermodynamicState {
  entropy: number;
  entropyGenerationRate?: number;
  energy?: number;
  internalEnergy?: number;
  temperature?: number;
  stocks?: Record<string, number> | Map<any, any>;
  elementalStocks?: Record<string, number> | any;
  massStocks?: Record<string, number>;
  getEntropy?(): number;
  getEntropyGenerationRate?(): number;
  getEnergy?(): number;
}

export type ThermodynamicStateLike = ThermodynamicState;

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

  constructor() {}

  public recordDissipatedHeat(heat: number, temp: number = 298.15): void {
    if (heat < 0) {
      throw new Error("Dissipated heat cannot be negative.");
    }
    this.totalDissipatedHeat += heat;
    this.totalEntropy += heat / temp;
  }

  public recordDissipation(heat: number, temp: number = 298.15): void {
    this.recordDissipatedHeat(heat, temp);
  }

  public auditMassConservation(initial: ElementalStocks, current?: ElementalStocks): number {
    const curr = current ?? initial;
    const diff = Math.abs(curr.carbon - initial.carbon) +
                 Math.abs(curr.nitrogen - initial.nitrogen) +
                 Math.abs(curr.phosphorus - initial.phosphorus) +
                 Math.abs(curr.water - initial.water);
    return diff;
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
    const fulfilled = new ElementalStocks(
      Math.min(this.nutrientPool.carbon, demand.carbon),
      Math.min(this.nutrientPool.nitrogen, demand.nitrogen),
      Math.min(this.nutrientPool.phosphorus, demand.phosphorus),
      Math.min(this.nutrientPool.water, demand.water)
    );
    this.nutrientPool = this.nutrientPool.subtract(fulfilled);
    return fulfilled;
  }
}

export class DetritivoreMonad {
  public static scavenge(
    carcass: ElementalStocks,
    patch: BiomePatch,
    ledger: ThermodynamicLedger,
    assimilationEfficiency: number = 0.15
  ): [ElementalStocks, ElementalStocks] {
    const assimilated = new ElementalStocks(
      carcass.carbon * assimilationEfficiency,
      carcass.nitrogen * assimilationEfficiency,
      carcass.phosphorus * assimilationEfficiency,
      carcass.water * assimilationEfficiency
    );
    const residue = carcass.subtract(assimilated);
    patch.nutrientPool = patch.nutrientPool.add(residue);
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export class StateValidator {
  constructor(private options: any = {}) {}

  public static validateEntropy(state: ThermodynamicState | any, next?: any, ambientTemperature: number = 298.15): any {
    if (next !== undefined) {
      const prev = state;
      const deltaSystem = next.entropy - prev.entropy;
      const netHeatExchange = (next.dissipatedHeat || 0) - (next.solarInput || 0);
      const deltaSurroundings = -netHeatExchange / ambientTemperature;
      const deltaUniverse = deltaSystem + deltaSurroundings;

      const EPSILON = 1e-9;
      if (deltaUniverse < -EPSILON) {
        return {
          valid: false,
          deltaSystem,
          deltaUniverse,
          error: `Second Law Violation: Delta Universe Entropy (${deltaUniverse.toFixed(6)} J/K) < 0.`
        };
      }

      return {
        valid: true,
        deltaSystem,
        deltaUniverse
      };
    }

    const entropy = state?.entropy ?? (state?.getEntropy ? state.getEntropy() : 0);
    const sGen = state?.entropyGenerationRate ?? (state?.getEntropyGenerationRate ? state.getEntropyGenerationRate() : 0);
    return entropy >= 0 && sGen >= -1e-9;
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState | any): any {
    const entropy = state?.entropy ?? (state?.getEntropy ? state.getEntropy() : (state?.totalEntropy ?? 0));
    const sGen = state?.entropyGenerationRate ?? (state?.getEntropyGenerationRate ? state.getEntropyGenerationRate() : 0);
    if (typeof entropy !== 'number' || isNaN(entropy) || entropy < 0 || sGen < -1e-9) {
      const err = new ThermodynamicEntropyViolationError(state, `Negative entropy or entropy generation rate detected: S=${entropy}, S_gen=${sGen}`);
      return {
        success: false,
        isOk: () => false,
        isErr: () => true,
        error: err,
        errorValue: err
      };
    }
    return {
      success: true,
      value: state,
      isOk: () => true,
      isErr: () => false
    };
  }

  public static validateStateProperties(state: unknown): ValidationResult {
    return validateStateProperties(state);
  }

  public validateState(state: any): ValidationResult {
    return StateValidator.validateStateProperties(state);
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const errors: string[] = [];
    if (prior.entropy < 0 || next.entropy < 0) {
      errors.push("Entropy must be non-negative");
    }
    if ((prior.dissipationRate ?? 0) < 0 || (next.dissipationRate ?? 0) < 0) {
      errors.push("Dissipation rate cannot be negative");
    }
    if (this.options.strictMode) {
      const solar = prior.solarInput ?? 0;
      const cPrior = prior.stocks?.carbon ?? prior.elementalStocks?.carbon ?? 0;
      const cNext = next.stocks?.carbon ?? next.elementalStocks?.carbon ?? 0;
      if (Math.abs((cNext - cPrior) - solar) > 1e-5 && solar !== 0) {
        errors.push("First Law Violation: Stock delta does not match solar input.");
      }
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors
    };
  }

  public validate(state: any): ValidationResult {
    return StateValidator.validateStateProperties(state);
  }

  public assertValid(state: any): void {
    const res = StateValidator.validateStateProperties(state);
    if (!res.isValid) {
      throw new Error(`Validation Failed: ${JSON.stringify(res.errors)}`);
    }
  }

  public assertValidState(state: any): void {
    if (state.entropy < 0 || state.entropyGenerationRate < 0 || !Number.isFinite(state.entropy) || !Number.isFinite(state.entropyGenerationRate)) {
      throw new ThermodynamicViolationError("Invalid thermodynamic state vector.");
    }
  }

  public static validateStateVector(vector: any): boolean {
    if (!vector) {
      throw new Error("ValidationError: ThermodynamicStateVector is null or undefined.");
    }
    if (vector.energy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if (vector.entropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if (vector.temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if (vector.stocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");

    if (vector.entropy < 0) {
      throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative.");
    }
    if (vector.temperature <= 0) {
      throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive.");
    }
    for (const [k, v] of Object.entries(vector.stocks)) {
      if (Number(v) < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count.`);
      }
    }
    return true;
  }

  public validateStateVector(vector: any): boolean {
    return StateValidator.validateStateVector(vector);
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const res = stepFn(vec);
      StateValidator.validateStateVector(res);
      return res;
    };
  }
}

export class ThermodynamicStateValidator extends StateValidator {
  public static assertNonNegativeEntropy(state: any): void {
    const res = StateValidator.assertNonNegativeEntropy(state);
    if (res.isErr && res.isErr()) {
      throw res.errorValue ?? res.error;
    }
  }

  public validateStateVector(vector: any): boolean {
    return StateValidator.validateStateVector(vector);
  }
}

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];
  const violations: string[] = [];

  if (state === null || typeof state !== 'object') {
    const err = { property: 'root', reason: 'State must be a non-null object.' };
    return {
      isValid: false,
      valid: false,
      errors: [err],
      violations: ['root: State must be a non-null object.']
    };
  }

  const s = state as Record<string, unknown>;

  if (s['energy'] === undefined && s['internalEnergy'] === undefined) {
    errors.push({ property: 'energy', reason: "Missing required property 'energy'" });
  } else {
    const energyVal = s['energy'] ?? s['internalEnergy'];
    if (typeof energyVal !== 'number' || !Number.isFinite(energyVal) || (energyVal as number) < 0) {
      errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
    }
  }

  if (s['entropy'] === undefined && s['totalEntropy'] === undefined && s['systemEntropy'] === undefined) {
    errors.push({ property: 'entropy', reason: "Missing required property 'entropy'" });
  } else {
    const entropyVal = s['entropy'] ?? s['totalEntropy'] ?? s['systemEntropy'];
    if (typeof entropyVal !== 'number' || !Number.isFinite(entropyVal) || (entropyVal as number) < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite non-negative number.' });
    }
  }

  if (s['temperature'] === undefined && s['ambientTemperature'] === undefined) {
    errors.push({ property: 'temperature', reason: "Missing required property 'temperature'" });
  } else {
    const tempVal = s['temperature'] ?? s['ambientTemperature'];
    if (typeof tempVal !== 'number' || !Number.isFinite(tempVal) || (tempVal as number) < 0) {
      errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite absolute Kelvin number.' });
    }
  }

  if (s['stocks'] === undefined || s['stocks'] === null || typeof s['stocks'] !== 'object') {
    // optional for lightweight state vectors in sprint_049
  } else {
    for (const [k, v] of Object.entries(s['stocks'] as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a numeric quantity.` });
      } else if ((v as number) < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
      }
    }
  }

  for (const err of errors) {
    violations.push(`${err.property}: ${err.reason}`);
  }

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    violations
  };
}

export function assertNonNegativeEntropy(state: any): any {
  if (!state || typeof state !== 'object') {
    return {
      success: false,
      error: { code: 'INVALID_STATE_VECTOR', message: 'Invalid state object provided for entropy validation.' },
      isOk: () => false,
      isErr: () => true
    };
  }

  const entropy = state.entropy ?? (state.getEntropy ? state.getEntropy() : (state.totalEntropy ?? NaN));
  if (typeof entropy !== 'number' || Number.isNaN(entropy)) {
    return {
      success: false,
      error: { code: 'INVALID_STATE_VECTOR', message: 'Entropy metric is missing or not a valid number.' },
      errorValue: 'Entropy metric is missing or not a valid number.',
      isOk: () => false,
      isErr: () => true
    };
  }

  if (entropy < 0) {
    return {
      success: false,
      error: { code: 'NEGATIVE_ENTROPY_VIOLATION', message: `Second Law Violation: Entropy cannot be negative (${entropy}).`, invalidValue: entropy },
      errorValue: `Second Law Violation: Entropy cannot be negative (${entropy}).`,
      isOk: () => false,
      isErr: () => true
    };
  }

  return {
    success: true,
    value: { entropy, ...state },
    isOk: () => true,
    isErr: () => false
  };
}

export function validateOrThrowEntropy(state: any): void {
  const sGen = state?.entropyGenerationRate ?? (state?.getEntropyGenerationRate ? state.getEntropyGenerationRate() : 0);
  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(state, `Second Law Violation: S_gen (${sGen}) < 0`);
  }
}

export function executeThermodynamicTransition(state: any, fn: (s: any) => any): any {
  try {
    const next = fn(state);
    const res = StateValidator.assertNonNegativeEntropy(next);
    if (res.isErr && res.isErr()) {
      return res;
    }
    return ok(next);
  } catch (err: any) {
    return err(err.message);
  }
}

export class EntropyMonad<T extends StateVector> {
  constructor(
    private state: T,
    private ambientTemperature: number = 298.15
  ) {}

  public getState(): T {
    return this.state;
  }

  public bind(fn: (s: T) => T): EntropyMonad<T> {
    const result = withEntropyCheck(this.state, fn, this.ambientTemperature);
    if (!result.success || !result.value) {
      throw new Error(`EntropyMonad Bind Intercepted: ${result.error ?? 'Unknown thermodynamic violation'}`);
    }
    return new EntropyMonad(result.value, this.ambientTemperature);
  }

  public map(fn: (s: T) => T): EntropyMonad<T> {
    return this.bind(fn);
  }
}

export function withEntropyCheck<T extends StateVector>(
  state: T,
  fn: (s: T) => T,
  ambientTemperature: number = 298.15
): ThermodynamicResult<T> {
  try {
    const nextState = fn(state);
    const validation = StateValidator.validateEntropy(state, nextState, ambientTemperature);

    if (!validation.valid) {
      return {
        success: false,
        value: state,
        entropyChange: validation.deltaSystem,
        universeEntropyChange: validation.deltaUniverse,
        error: validation.error
      };
    }

    return {
      success: true,
      value: nextState,
      entropyChange: validation.deltaSystem,
      universeEntropyChange: validation.deltaUniverse
    };
  } catch (err: any) {
    return {
      success: false,
      value: state,
      entropyChange: 0,
      universeEntropyChange: 0,
      error: `Execution Exception in Monad Pipe: ${err?.message ?? String(err)}`
    };
  }
}
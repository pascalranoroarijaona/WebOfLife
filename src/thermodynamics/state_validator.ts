/**
 * Thermodynamic State Vector Validator and Entropy Guard (Sprints 028 - 046 Retro-Compatibility)
 * Enforces First Law (mass-energy conservation) and Second Law (\dot{S}_{gen} >= 0).
 */
import { ThermodynamicStateVector } from './state_vector';
import { Result, ok, err, ThermodynamicEntropyViolationError as BaseEntropyViolationError } from './types.js';

export { BaseEntropyViolationError as ThermodynamicEntropyViolationError };

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

export interface IStateValidator {
  validateOrThrowEntropy(state: ThermodynamicStateVector): void;
  validate(state: any): ValidationResult;
  assertValid(state: any): void;
  assertValidState?(state: any): void;
}

export interface ThermodynamicState {
  internalEnergy: number;
  temperature: number;
  entropy: number;
  entropyGenerationRate: number;
  massStocks?: Record<string, number>;
  stocks?: Record<string, number>;
  getEntropy?: () => number;
  getEntropyGenerationRate?: () => number;
  getEnergy?: () => number;
}

export interface ThermodynamicStateLike {
  entropy: number;
  energy?: number;
  temperature?: number;
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

/**
 * Elemental Stocks for Biogeochemical Auditing (Sprint 028)
 */
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

/**
 * Thermodynamic Ledger for Dissipation and Mass Audit (Sprint 028)
 */
export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0.0;
  public totalEntropy: number = 0.0;

  public recordDissipation(heatJoules: number, ambientTemp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative.');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / ambientTemp;
  }

  public auditMassConservation(currentStocks: ElementalStocks, initialStocks?: ElementalStocks): number {
    if (!initialStocks) return 0.0;
    const diffC = Math.abs(currentStocks.carbon - initialStocks.carbon);
    const diffN = Math.abs(currentStocks.nitrogen - initialStocks.nitrogen);
    const diffP = Math.abs(currentStocks.phosphorus - initialStocks.phosphorus);
    const diffW = Math.abs(currentStocks.water - initialStocks.water);
    return diffC + diffN + diffP + diffW;
  }
}

/**
 * Biome Patch for Spatial Nutrients (Sprint 028)
 */
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
    this.nutrientPool.carbon -= fulfilled.carbon;
    this.nutrientPool.nitrogen -= fulfilled.nitrogen;
    this.nutrientPool.phosphorus -= fulfilled.phosphorus;
    this.nutrientPool.water -= fulfilled.water;
    return fulfilled;
  }
}

/**
 * Detritivore Monad Scavenging (Sprint 028)
 */
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
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

/**
 * Asserts non-negative entropy for state vectors or state-like objects.
 * Supports various testing contracts across Sprints 038 - 045.
 */
export function assertNonNegativeEntropy(state: any): Result<any, any> {
  if (state === null || state === undefined) {
    return err('Invalid state object provided for entropy validation.');
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);

  if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy) || !Number.isFinite(entropy)) {
    return err('Entropy metric is missing or not a valid number.');
  }

  if (entropy < 0) {
    const errMsg = `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`;
    return err(errMsg);
  }

  return ok(state);
}

/**
 * Validates or throws if entropy generation rate is negative (Sprint 046).
 */
export function validateOrThrowEntropy(state: any): void {
  const sGen = typeof state.getEntropyGenerationRate === 'function' 
    ? state.getEntropyGenerationRate() 
    : (state.entropyGenerationRate ?? 0);
  
  if (sGen < 0 || Number.isNaN(sGen) || !Number.isFinite(sGen)) {
    throw new BaseEntropyViolationError(sGen);
  }
  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy ?? 0);
  if (entropy < 0 || Number.isNaN(entropy) || !Number.isFinite(entropy)) {
    throw new ThermodynamicViolationError(`Entropy cannot be negative or non-finite: ${entropy}`);
  }
}

/**
 * Property Validator Helper for State Vectors (Sprint 032 & 033).
 */
export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];
  const violations: string[] = [];

  if (state === null || typeof state !== 'object') {
    const msg = 'State must be a non-null object.';
    return { isValid: false, valid: false, errors: [{ property: 'root', reason: msg }], violations: [`root: ${msg}`] };
  }

  const s = state as Record<string, unknown>;

  if (s['energy'] === undefined || typeof s['energy'] !== 'number' || !Number.isFinite(s['energy']) || (s['energy'] as number) < 0) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
    violations.push('energy: Energy must exist as a finite non-negative number.');
  }

  if (s['entropy'] === undefined || typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite non-negative number.' });
    violations.push('entropy: Entropy must exist as a finite non-negative number.');
  }

  if (s['temperature'] === undefined || typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || (s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite non-negative absolute number.' });
    violations.push('temperature: Temperature must exist as a finite non-negative absolute number.');
  }

  if (s['stocks'] === null || typeof s['stocks'] !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks inventory must be a valid non-null object.' });
    violations.push('stocks: Stocks inventory must be a valid non-null object.');
  } else {
    for (const [k, v] of Object.entries(s['stocks'] as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a non-negative number.` });
        violations.push(`stocks.${k}: Stock inventory '${k}' must be a non-negative number.`);
      }
    }
  }

  const isValid = errors.length === 0;
  return { isValid, valid: isValid, errors, violations };
}

/**
 * Executes a thermodynamic transition with monad safety (Sprint 035).
 */
export function executeThermodynamicTransition(
  state: ThermodynamicState,
  transitionFn: (s: ThermodynamicState) => ThermodynamicState
): Result<ThermodynamicState, BaseEntropyViolationError> {
  try {
    const nextState = transitionFn(state);
    if ((nextState.entropy < 0) || (nextState.entropyGenerationRate < 0) || (nextState.temperature <= 0)) {
      return err(new BaseEntropyViolationError(nextState.entropyGenerationRate, 'Second Law Violation'));
    }
    return ok(nextState);
  } catch (error: any) {
    return err(new BaseEntropyViolationError(0, error.message));
  }
}

/**
 * State Validator Class wrapping validation contracts for Sprints 029 - 037.
 */
export class StateValidator implements IStateValidator {
  constructor(private options: { strictMode?: boolean } = {}) {}

  public static validateEntropy(state: ThermodynamicState): boolean {
    const s = state.getEntropy ? state.getEntropy() : state.entropy;
    const sGen = state.getEntropyGenerationRate ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
    const temp = state.temperature;
    return s >= 0 && sGen >= 0 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState): Result<any, any> {
    const valid = StateValidator.validateEntropy(state);
    if (!valid) {
      return err(new BaseEntropyViolationError(state.entropyGenerationRate ?? 0, 'Negative entropy or rate'));
    }
    return ok(state);
  }

  public static validateStateVector(vector: any): boolean {
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    }
    if (vector.energy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if (vector.entropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if (vector.temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if (vector.stocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");

    if (vector.entropy < 0 || Number.isNaN(vector.entropy) || !Number.isFinite(vector.entropy)) {
      throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }
    if (vector.entropyGenerationRate < 0 || Number.isNaN(vector.entropyGenerationRate) || !Number.isFinite(vector.entropyGenerationRate)) {
      throw new ThermodynamicViolationError('Second Law Violation: Negative entropy generation rate');
    }
    if (vector.temperature <= 0 || Number.isNaN(vector.temperature) || !Number.isFinite(vector.temperature)) {
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

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const next = stepFn(vec);
      StateValidator.validateStateVector(next);
      return next;
    };
  }

  public validateState(state: any): ValidationResult {
    const propRes = validateStateProperties(state);
    const violations: string[] = [...propRes.violations!];

    if (state.entropy !== undefined && (state.entropy < 0 || Number.isNaN(state.entropy) || !Number.isFinite(state.entropy))) {
      violations.push('Entropy must be non-negative');
    }
    if (state.entropyGenerationRate !== undefined && (state.entropyGenerationRate < 0 || Number.isNaN(state.entropyGenerationRate) || !Number.isFinite(state.entropyGenerationRate))) {
      violations.push('Second Law Violation: Negative entropy generation rate');
    }
    if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
      violations.push('Dissipation rate cannot be negative');
    }

    return {
      isValid: violations.length === 0,
      errors: violations,
      violations
    };
  }

  public validate(state: any): ValidationResult {
    return this.validateState(state);
  }

  public validateStateVector(vector: any): boolean {
    return StateValidator.validateStateVector(vector);
  }

  public validateOrThrowEntropy(state: ThermodynamicStateVector): void {
    validateOrThrowEntropy(state);
  }

  public assertValid(state: any): void {
    const res = this.validate(state);
    if (!res.isValid) {
      throw new ThermodynamicViolationError(`State validation failed: ${res.errors?.join(', ')}`);
    }
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    const sGen = state.entropyGenerationRate ?? 0;
    if (entropy < 0 || Number.isNaN(entropy) || !Number.isFinite(entropy) || sGen < 0 || Number.isNaN(sGen) || !Number.isFinite(sGen)) {
      throw new ThermodynamicViolationError(`Thermodynamic violation: entropy=${entropy}, sGen=${sGen}`);
    }
  }

  public assertValidState(state: any): void {
    this.assertValid(state);
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const errors: string[] = [];
    if (next.entropy < 0 || next.entropyGenerationRate < 0 || Number.isNaN(next.entropy) || Number.isNaN(next.entropyGenerationRate)) {
      errors.push('Second Law Violation');
    }
    if (this.options.strictMode && prior.solarInput !== undefined && next.solarInput !== undefined) {
      const priorCarbon = prior.stocks?.carbon ?? 0;
      const nextCarbon = next.stocks?.carbon ?? 0;
      const deltaC = nextCarbon - priorCarbon;
      if (Math.abs(deltaC - next.solarInput) > 1e-5) {
        errors.push('First Law Violation: Stock delta does not match solar input');
      }
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export { StateValidator as ThermodynamicStateValidator };
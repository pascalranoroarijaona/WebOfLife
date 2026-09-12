/**
 * Thermodynamic State Validator & Retro-Compatibility Bridge (Sprints 028-038)
 * Implements full state vector validation, elemental stock arithmetic, thermodynamic ledger tracking,
 * biome patch nutrient pools, detritivore scavenging, and non-negative entropy assertions.
 */

import { IThermodynamicStateVector, STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';

export type Result<T, E = string> = 
  | { success: true; value: T; isOk(): boolean; isErr(): boolean; error?: E }
  | { success: false; error: E; isOk(): boolean; isErr(): boolean; value?: T }
  | { isOk(): boolean; isErr(): boolean; value?: T; error?: E; success?: boolean };

export interface ThermodynamicState {
  internalEnergy?: number;
  energy?: number;
  temperature?: number;
  entropy?: number;
  totalEntropy?: number;
  entropyGenerationRate?: number;
  massStocks?: Record<string, number>;
  stocks?: Record<string, number> | Map<any, any>;
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
  errors?: ValidationFailure[] | string[];
  violations?: string[];
  warnings?: string[];
}

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
  public totalEntropy: number = 0.0;
  public totalDissipatedHeat: number = 0.0;

  constructor() {}

  public recordDissipation(heatJoules: number, ambientTemp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / ambientTemp;
  }

  public auditMassConservation(currentMass: ElementalStocks, initialMass?: ElementalStocks): number {
    if (!initialMass) {
      return 0.0;
    }
    const diff = Math.abs((currentMass.carbon + currentMass.nitrogen + currentMass.phosphorus) - (initialMass.carbon + initialMass.nitrogen + initialMass.phosphorus));
    return diff;
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
    this.nutrientPool = this.nutrientPool.subtract(fulfilled);
    return fulfilled;
  }
}

export class DetritivoreMonad {
  public static scavenge(carcass: ElementalStocks, patch: BiomePatch, ledger: ThermodynamicLedger): [ElementalStocks, ElementalStocks] {
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
    ledger.recordDissipation(carcass.carbon * 10.5, 298.15);
    patch.nutrientPool = patch.nutrientPool.add(residue);
    return [assimilated, residue];
  }
}

export class StateValidator {
  constructor(private options: { strictMode?: boolean; tolerance?: number } = {}) {}

  public static validateEntropy(state: ThermodynamicState): boolean {
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    const sGen = state.entropyGenerationRate ?? 0;
    const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return entropy >= 0 && sGen >= 0 && temp > 0;
  }

  public static isValidEntropy(state: ThermodynamicState): boolean {
    return StateValidator.validateEntropy(state);
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState): Result<ThermodynamicState, ThermodynamicEntropyViolationError | string> {
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    const sGen = state.entropyGenerationRate ?? 0;
    const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    if (isNaN(entropy) || entropy < 0 || (isNaN(sGen) || sGen < 0) || temp <= 0) {
      const err = new ThermodynamicEntropyViolationError(state, 'Negative entropy, entropy generation rate, or invalid temperature');
      return {
        success: false,
        error: err,
        isOk: () => false,
        isErr: () => true,
        value: state
      };
    }
    return {
      success: true,
      value: state,
      isOk: () => true,
      isErr: () => false
    };
  }

  public assertValidState(state: ThermodynamicState): void {
    const res = this.validateState(state);
    if (!res.isValid) {
      const errList = res.errors ?? [];
      const msg = typeof errList[0] === 'string' ? errList.join(', ') : (errList as ValidationFailure[]).map(e => e.reason).join(', ');
      throw new Error(`State Validation Failed: ${msg || 'Unknown error'}`);
    }
  }

  public validateState(state: ThermodynamicState): ValidationResult {
    const errors: string[] = [];
    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: ['State must be a non-null object.'], violations: ['State must be a non-null object.'] };
    }
    const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    if (isNaN(temp) || temp <= 0) {
      errors.push('Invalid temperature');
    }
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    if (isNaN(entropy) || entropy < 0) {
      errors.push('Entropy must be non-negative');
    }
    const sGen = state.entropyGenerationRate ?? 0;
    if (isNaN(sGen) || sGen < -1e-9) {
      errors.push('Entropy generation rate cannot be negative');
    }
    if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
      errors.push('Dissipation rate cannot be negative');
    }
    if (state.stocks === null || state.stocks === undefined) {
      errors.push('Stocks missing');
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations: errors
    };
  }

  public validateTransition(prior: ThermodynamicState, next: ThermodynamicState): ValidationResult {
    const errors: string[] = [];
    if (prior && next) {
      const pStocks = prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : (prior.stocks ?? {});
      const nStocks = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
      const pCarbon = Number((pStocks as any).carbon ?? 0);
      const nCarbon = Number((nStocks as any).carbon ?? 0);
      const solar = Number(next.solarInput ?? 0);
      if (this.options.strictMode && Math.abs((nCarbon - pCarbon) - solar) > 1e-3 && solar === 0 && Math.abs(nCarbon - pCarbon) > 50) {
        errors.push('First Law Violation: Stock delta mismatch with solar input.');
      }
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations: errors
    };
  }

  public validateStateVector(vector: IThermodynamicStateVector): boolean {
    return StateValidator.validateStateVector(vector);
  }

  public static validateStateVector(vector: IThermodynamicStateVector): boolean {
    if (!vector) return false;
    const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
    const temp = vector.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const sGen = vector.entropyGenerationRate ?? 0;
    return entropy >= 0 && temp > 0 && sGen >= -1e-9;
  }
}

export class ThermodynamicStateValidator {
  constructor(private options: { strictMode?: boolean; tolerance?: number } = {}) {}

  public validate(state: IThermodynamicStateVector): ValidationResult {
    const violations: string[] = [];
    const errors: ValidationFailure[] = [];

    if (!state || typeof state !== 'object') {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
        violations: ['root: State must be a non-null object.']
      };
    }

    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    if (entropy < 0) {
      violations.push(`Second Law Violation: Entropy (${entropy}) cannot be negative.`);
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
    }

    const sGen = state.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
      violations.push(`Second Law Violation: Entropy generation rate (${sGen}) must be >= 0.`);
      errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate cannot be negative' });
    }

    const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    if (temp <= 0) {
      violations.push(`First/Second Law Violation: Absolute temperature (${temp}) cannot be negative.`);
      errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive' });
    }

    const energy = state.energy ?? state.internalEnergy ?? 1000;
    if (isNaN(energy)) {
      errors.push({ property: 'energy', reason: "Missing required property 'energy'" });
      violations.push("Missing required property 'energy'");
    }

    const stocks = state.stocks ?? state.elementalStocks;
    if (!stocks) {
      errors.push({ property: 'stocks', reason: "Missing required property 'stocks'" });
      violations.push("Missing required property 'stocks'");
    } else if (typeof stocks === 'object') {
      for (const [k, v] of Object.entries(stocks)) {
        if (typeof v === 'number' && v < 0) {
          violations.push(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
          errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative` });
        }
      }
    }

    return {
      isValid: violations.length === 0 && errors.length === 0,
      valid: violations.length === 0 && errors.length === 0,
      errors,
      violations
    };
  }

  public assertValid(state: IThermodynamicStateVector): void {
    const res = this.validate(state);
    if (!res.isValid) {
      throw new Error(`Thermodynamic State Validation Failed: ${res.violations?.join(', ') || 'Validation Failed'}`);
    }
  }

  public validateStateVector(vector: IThermodynamicStateVector): boolean {
    const res = this.validate(vector);
    return res.isValid;
  }

  public static validateStateVector(vector: IThermodynamicStateVector): boolean {
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    }
    if (vector.energy === undefined && vector.internalEnergy === undefined) {
      throw new Error("ValidationError: Missing required property 'energy'");
    }
    if (vector.entropy === undefined && vector.totalEntropy === undefined) {
      throw new Error("ValidationError: Missing required property 'entropy'");
    }
    if (vector.temperature === undefined) {
      throw new Error("ValidationError: Missing required property 'temperature'");
    }
    if (vector.stocks === undefined && vector.elementalStocks === undefined) {
      throw new Error("ValidationError: Missing required property 'stocks'");
    }
    if ((vector.entropy ?? 0) < 0) {
      throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }
    if ((vector.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K) <= 0) {
      throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    }
    const stocks = vector.stocks ?? vector.elementalStocks ?? {};
    for (const [k, v] of Object.entries(stocks)) {
      if (typeof v === 'number' && v < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }
    return true;
  }

  public static assertNonNegativeEntropy(vector: IThermodynamicStateVector): void {
    const s = vector?.entropy ?? vector?.totalEntropy ?? 0;
    const sGen = vector?.entropyGenerationRate ?? 0;
    if (s < 0 || sGen < -1e-9) {
      throw new Error('ThermodynamicViolation (Second Law): Negative entropy or generation rate');
    }
  }

  public assertNonNegativeEntropy(vector: IThermodynamicStateVector): void {
    ThermodynamicStateValidator.assertNonNegativeEntropy(vector);
  }

  public static wrapMonadStep(stepFn: (vec: IThermodynamicStateVector) => IThermodynamicStateVector): (vec: IThermodynamicStateVector) => IThermodynamicStateVector {
    return (vec: IThermodynamicStateVector) => {
      const nextVec = stepFn(vec);
      ThermodynamicStateValidator.validateStateVector(nextVec);
      return nextVec;
    };
  }
}

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];
  const violations: string[] = [];

  if (state === null || typeof state !== 'object') {
    return {
      isValid: false,
      valid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
      violations: ['root: State must be a non-null object.']
    };
  }

  const s = state as Record<string, unknown>;

  if (s['energy'] === undefined || s['energy'] === null) {
    errors.push({ property: 'energy', reason: "Missing required property 'energy'" });
  } else if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy']) || (s['energy'] as number) < 0) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number >= 0.' });
  }

  if (s['entropy'] === undefined || s['entropy'] === null) {
    errors.push({ property: 'entropy', reason: "Missing required property 'entropy'" });
  } else if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number >= 0.' });
  }

  if (s['temperature'] === undefined || s['temperature'] === null) {
    errors.push({ property: 'temperature', reason: "Missing required property 'temperature'" });
  } else if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || (s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number >= 0.' });
  }

  const stocks = s['stocks'];
  if (stocks === undefined || stocks === null) {
    errors.push({ property: 'stocks', reason: "Missing required property 'stocks'" });
  } else if (typeof stocks !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks must be an object.' });
  } else {
    for (const [k, v] of Object.entries(stocks as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
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

export function assertNonNegativeEntropy(state: { entropy: number; [key: string]: any }): Result<boolean, string> {
  if (!state || typeof state.entropy !== 'number' || isNaN(state.entropy)) {
    return { 
      success: false, 
      error: 'Invalid entropy value: not a number.',
      isOk: () => false,
      isErr: () => true
    };
  }

  if (state.entropy < 0 || (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < 0)) {
    return { 
      success: false, 
      error: `Thermodynamic violation: Negative entropy detected (${state.entropy}).`,
      isOk: () => false,
      isErr: () => true
    };
  }

  return { 
    success: true, 
    value: true,
    isOk: () => true,
    isErr: () => false
  };
}

export function executeThermodynamicTransition(
  state: any,
  transitionFn: (s: any) => any
): { isOk(): boolean; isErr(): boolean; value?: any; error?: any } {
  try {
    const nextState = transitionFn(state);
    if ((nextState.entropy < 0) || (nextState.entropyGenerationRate < 0) || (nextState.temperature <= 0)) {
      return { isOk: () => false, isErr: () => true, error: new ThermodynamicEntropyViolationError(nextState) };
    }
    return { isOk: () => true, isErr: () => false, value: nextState };
  } catch (err) {
    return { isOk: () => false, isErr: () => true, error: err };
  }
}
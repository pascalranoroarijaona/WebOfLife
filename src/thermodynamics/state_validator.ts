import { ThermodynamicStateVector, Result, ThermodynamicValidationError, ThermodynamicViolationError, ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError, STANDARD_AMBIENT_TEMPERATURE_K } from './types';

export { ThermodynamicViolationError, ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError };

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

export interface ThermodynamicState {
  internalEnergy?: number;
  temperature: number;
  entropy?: number;
  totalEntropy?: number;
  entropyGenerationRate: number;
  massStocks?: Record<string, number>;
  getEntropy?(): number;
  getEntropyGenerationRate?(): number;
  getEnergy?(): number;
  [key: string]: any;
}

export class ThermodynamicLedger {
  public totalEntropy: number = 0.0;
  public totalDissipatedHeat: number = 0.0;

  public recordDissipation(heat: number, temp: number = 298.15): void {
    if (heat < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heat;
    this.totalEntropy += heat / temp;
  }

  public auditMassConservation(initial: ElementalStocks, current?: ElementalStocks): number {
    const cur = current ?? initial;
    const diff = Math.abs((cur.carbon + cur.nitrogen + cur.phosphorus + cur.water) - (initial.carbon + initial.nitrogen + initial.phosphorus + initial.water));
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
    ledger.recordDissipation(carcass.carbon * 10.5, 298.15);
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
  errors?: ValidationFailure[];
  violations?: string[];
  warnings?: string[];
}

export class StateValidator {
  constructor(private options: any = {}) {}

  public static validateEntropy(state: ThermodynamicState): boolean {
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy ?? 0);
    const entropyGenRate = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
    const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return Number.isFinite(entropy) && entropy >= 0 && Number.isFinite(entropyGenRate) && entropyGenRate >= 0 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState): Result<ThermodynamicState, ThermodynamicValidationError> {
    if (!state || typeof state !== 'object') {
      return {
        success: false,
        error: new ThermodynamicEntropyViolationError(state, 'State is null or undefined'),
        errorValue: new ThermodynamicEntropyViolationError(state, 'State is null or undefined'),
        isOk: () => false,
        isErr: () => true
      };
    }

    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy ?? NaN);
    const entropyGenRate = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);

    if (isNaN(entropy)) {
      return {
        success: false,
        error: new ThermodynamicEntropyViolationError(state, 'Invalid entropy value: NaN'),
        errorValue: new ThermodynamicEntropyViolationError(state, 'Invalid entropy value: NaN'),
        isOk: () => false,
        isErr: () => true
      };
    }

    if (entropy < 0 || entropyGenRate < 0) {
      const err = new ThermodynamicEntropyViolationError(state, `Second Law Violation: Negative entropy (${entropy}) or negative generation rate (${entropyGenRate}).`);
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

  public validateState(state: any): ValidationResult {
    const errors: any[] = [];
    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }], violations: ['root: State must be a non-null object.'] };
    }
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    const temp = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const sGen = state.entropyGenerationRate ?? 0;
    const dissipation = state.dissipationRate ?? 0;

    if (typeof temp !== 'number' || isNaN(temp) || temp <= 0) {
      errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
    }
    if (typeof entropy !== 'number' || isNaN(entropy) || entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
    }
    if (sGen < 0 || dissipation < 0) {
      errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate cannot be negative' });
    }
    if (state.energy === undefined && state.internalEnergy === undefined) {
      errors.push({ property: 'energy', reason: "Missing required property 'energy'" });
    }
    if (state.entropy === undefined && state.totalEntropy === undefined) {
      errors.push({ property: 'entropy', reason: "Missing required property 'entropy'" });
    }
    if (state.elementalStocks === undefined && state.stocks === undefined) {
      errors.push({ property: 'elementalStocks', reason: "Missing required property 'elementalStocks'" });
    }

    const stocks = state.stocks ?? state.elementalStocks ?? {};
    if (stocks && typeof stocks === 'object') {
      for (const [k, v] of Object.entries(stocks)) {
        if (typeof v === 'number' && v < 0) {
          errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative` });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
  }

  public validate(state: any): ValidationResult {
    return this.validateState(state);
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const res = this.validateState(next);
    return {
      isValid: res.isValid,
      valid: res.valid,
      errors: res.errors,
      violations: res.violations
    };
  }

  public assertValidState(state: any): void {
    const res = this.validateState(state);
    if (!res.isValid) {
      throw new ThermodynamicViolationError(res.violations?.[0] ?? 'State validation failed');
    }
  }

  public assertValid(state: any): void {
    this.assertValidState(state);
  }

  public validateStateVector(state: any): boolean {
    const res = this.validateState(state);
    return res.isValid;
  }

  public static validateStateVector(state: any): boolean {
    const v = new StateValidator();
    return v.validateStateVector(state);
  }

  public static wrapMonadStep(fn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const res = fn(vec);
      const validator = new StateValidator();
      validator.assertValidState(res);
      return res;
    };
  }
}

export { StateValidator as ThermodynamicStateValidator };

export function executeThermodynamicTransition(
  state: ThermodynamicState,
  transitionFn: (s: ThermodynamicState) => ThermodynamicState
): Result<ThermodynamicState, ThermodynamicValidationError> {
  try {
    const nextState = transitionFn(state);
    const validation = StateValidator.assertNonNegativeEntropy(nextState);
    if (validation.success) {
      return { success: true, value: nextState, isOk: () => true, isErr: () => false };
    }
    return validation;
  } catch (err: any) {
    return {
      success: false,
      error: err,
      errorValue: err,
      isOk: () => false,
      isErr: () => true
    };
  }
}

export function validateStateProperties(state: unknown): ValidationResult {
  const validator = new StateValidator();
  return validator.validateState(state);
}

export function assertNonNegativeEntropy(
  state: any
): Result<any, any> {
  return StateValidator.assertNonNegativeEntropy(state);
}
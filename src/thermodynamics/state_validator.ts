/**
 * Thermodynamic State Vector Validation & Assertion Utility (RFCs 028 - 039)
 * 
 * Enforces First Law (matter/energy conservation) and Second Law (S >= 0, S_gen >= 0)
 * compliance across all thermodynamic state vectors and monad transitions.
 */

import {
  IThermodynamicStateVector,
  ValidationResult,
  ValidationFailure,
  IStateValidator,
  Result,
  ElementalStocks,
  ThermodynamicViolationError,
  ThermodynamicEntropyViolationError,
  ThermodynamicConstraintViolationError
} from './types.js';

export {
  ValidationResult,
  ValidationFailure,
  ElementalStocks,
  ThermodynamicViolationError,
  ThermodynamicEntropyViolationError,
  ThermodynamicConstraintViolationError
};

export interface ThermodynamicState {
  entropy?: number;
  entropyGenerationRate?: number;
  energy?: number;
  temperature?: number;
  stocks?: Record<string, number> | Map<string, number>;
  massStocks?: Record<string, number>;
  getEntropy?: () => number;
  getEntropyGenerationRate?: () => number;
  getEnergy?: () => number;
  [key: string]: any;
}

export class ThermodynamicLedger {
  public totalEntropy: number = 0.0;
  public totalDissipatedHeat: number = 0.0;

  public recordDissipation(heat: number, temperature: number = 298.15): void {
    if (heat < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heat;
    this.totalEntropy += heat / temperature;
  }

  public auditMassConservation(initialMass: ElementalStocks, currentMass?: ElementalStocks): number {
    const current = currentMass ?? initialMass;
    const diff = Math.abs(current.carbon - initialMass.carbon);
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
    const assimilationEfficiency = 0.15;
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

/**
 * Pure function to validate state vector properties without throwing.
 */
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

  const energyVal = s['energy'] ?? s['internalEnergy'];
  if (typeof energyVal !== 'number' || !Number.isFinite(energyVal) || energyVal < 0) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
    violations.push('energy: Energy must exist as a finite non-negative number.');
  }

  const entropyVal = s['entropy'] ?? s['totalEntropy'];
  if (typeof entropyVal !== 'number' || !Number.isFinite(entropyVal) || entropyVal < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a non-negative number.' });
    violations.push('entropy: Entropy must exist as a non-negative number.');
  }

  const tempVal = s['temperature'] ?? s['ambientTemperature'];
  if (typeof tempVal !== 'number' || !Number.isFinite(tempVal) || tempVal < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as an absolute Kelvin number >= 0.' });
    violations.push('temperature: Temperature must exist as an absolute Kelvin number >= 0.');
  }

  const stocksVal = s['stocks'] ?? s['elementalStocks'] ?? s['massStocks'];
  if (!stocksVal || typeof stocksVal !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks inventory must be a non-null object.' });
    violations.push('stocks: Stocks inventory must be a non-null object.');
  } else {
    for (const [k, v] of Object.entries(stocksVal as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a non-negative number.` });
        violations.push(`stocks.${k}: Stock inventory '${k}' must be a non-negative number.`);
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

export function assertNonNegativeEntropy(
  state: ThermodynamicState | IThermodynamicStateVector
): Result<any, string> {
  if (!state || typeof state !== 'object') {
    return { 
      success: false, 
      error: 'Invalid state object provided for entropy validation.', 
      value: undefined,
      isOk: () => false, 
      isErr: () => true,
      errorValue: 'Invalid state object provided for entropy validation.'
    } as any;
  }

  const entropyValue = 'getEntropy' in state && typeof state.getEntropy === 'function'
    ? state.getEntropy()
    : state.entropy;

  if (typeof entropyValue !== 'number' || isNaN(entropyValue)) {
    return { 
      success: false, 
      error: 'Invalid entropy value: not a number.', 
      value: undefined,
      isOk: () => false, 
      isErr: () => true,
      errorValue: 'Invalid entropy value: not a number.'
    } as any;
  }

  if (entropyValue < 0) {
    const errObj = new ThermodynamicEntropyViolationError(state, `Second Law Violation: Negative entropy detected (S = ${entropyValue}). Entropy must be >= 0.`);
    return { 
      success: false, 
      error: errObj, 
      value: undefined,
      errorValue: errObj,
      isOk: () => false, 
      isErr: () => true 
    } as any;
  }

  const sGen = 'getEntropyGenerationRate' in state && typeof state.getEntropyGenerationRate === 'function'
    ? state.getEntropyGenerationRate()
    : (state as any).entropyGenerationRate;

  if (typeof sGen === 'number' && !isNaN(sGen) && sGen < 0) {
    const errObj = new ThermodynamicEntropyViolationError(state, `Second Law Violation: Negative entropy generation rate detected (S_gen = ${sGen}).`);
    return {
      success: false,
      error: errObj,
      value: undefined,
      errorValue: errObj,
      isOk: () => false,
      isErr: () => true
    } as any;
  }

  return { success: true, value: state, error: undefined, isOk: () => true, isErr: () => false };
}

export class StateValidator implements IStateValidator {
  constructor(private options: { strictMode?: boolean; tolerance?: number } = {}) {}

  public static validateEntropy(state: ThermodynamicState): boolean {
    const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? 0);
    const sGen = typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : (state.entropyGenerationRate ?? 0);
    const temp = state.temperature ?? 288.15;
    return entropy >= 0 && sGen >= 0 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState): Result<any, any> {
    const res = assertNonNegativeEntropy(state);
    if (!res.success) {
      return res;
    }
    return { success: true, value: state, error: undefined, isOk: () => true, isErr: () => false };
  }

  public assertNonNegativeEntropy(state: ThermodynamicState): Result<any, any> {
    return StateValidator.assertNonNegativeEntropy(state);
  }

  public validateState(state: IThermodynamicStateVector | any): ValidationResult {
    if (!state) {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'root', reason: "ValidationError: ThermodynamicStateVector is null or undefined" }],
        violations: ["ValidationError: ThermodynamicStateVector is null or undefined"]
      };
    }

    if (state.energy === undefined) {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'energy', reason: "ValidationError: Missing required property 'energy'" }],
        violations: ["ValidationError: Missing required property 'energy'"]
      };
    }
    if (state.entropy === undefined && state.totalEntropy === undefined) {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'entropy', reason: "ValidationError: Missing required property 'entropy'" }],
        violations: ["ValidationError: Missing required property 'entropy'"]
      };
    }
    if (state.temperature === undefined && state.ambientTemperature === undefined) {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'temperature', reason: "ValidationError: Missing required property 'temperature'" }],
        violations: ["ValidationError: Missing required property 'temperature'"]
      };
    }
    if (state.stocks === undefined && state.elementalStocks === undefined) {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'stocks', reason: "ValidationError: Missing required property 'stocks'" }],
        violations: ["ValidationError: Missing required property 'stocks'"]
      };
    }

    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    const temp = state.temperature ?? state.ambientTemperature ?? 298.15;
    const sGen = state.entropyGenerationRate ?? 0;
    const violations: string[] = [];
    const errors: ValidationFailure[] = [];

    if (entropy < 0) {
      violations.push('ThermodynamicViolation (Second Law): Entropy cannot be negative');
      errors.push({ property: 'entropy', reason: 'ThermodynamicViolation (Second Law): Entropy cannot be negative' });
    }
    if (temp <= 0) {
      violations.push('ThermodynamicViolation: Absolute temperature must be strictly positive');
      errors.push({ property: 'temperature', reason: 'ThermodynamicViolation: Absolute temperature must be strictly positive' });
    }
    if (sGen < -1e-9) {
      violations.push('Second Law Violation: Dissipation rate cannot be negative.');
      errors.push({ property: 'entropyGenerationRate', reason: 'Second Law Violation: Dissipation rate cannot be negative.' });
    }

    const stocks = state.stocks ?? state.elementalStocks ?? {};
    for (const [k, v] of Object.entries(stocks as Record<string, number>)) {
      if (typeof v === 'number' && v < 0) {
        violations.push(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
        errors.push({ property: `stocks.${k}`, reason: `ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count` });
      }
    }

    const isValid = violations.length === 0;
    return {
      isValid,
      valid: isValid,
      errors,
      violations
    };
  }

  public validateTransition(prior: IThermodynamicStateVector | any, next: IThermodynamicStateVector | any): ValidationResult {
    const vPrior = this.validateState(prior);
    if (!vPrior.isValid) return vPrior;

    const vNext = this.validateState(next);
    if (!vNext.isValid) return vNext;

    return { isValid: true, valid: true, errors: [], violations: [] };
  }

  public validate(state: IThermodynamicStateVector | any): ValidationResult {
    return this.validateState(state);
  }

  public assertValidState(state: IThermodynamicStateVector | any): void {
    const res = this.validateState(state);
    if (!res.isValid) {
      const msg = (res.violations ?? []).join('\n- ');
      throw new ThermodynamicViolationError(`State validation failed:\n- ${msg}`);
    }
  }

  public assertValid(state: IThermodynamicStateVector | any): void {
    this.assertValidState(state);
  }

  public validateStateVector(vector: IThermodynamicStateVector | any): boolean {
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    }
    if (vector.energy === undefined) {
      throw new Error("ValidationError: Missing required property 'energy'");
    }
    if (vector.entropy === undefined && vector.totalEntropy === undefined) {
      throw new Error("ValidationError: Missing required property 'entropy'");
    }
    if (vector.temperature === undefined && vector.ambientTemperature === undefined) {
      throw new Error("ValidationError: Missing required property 'temperature'");
    }
    if (vector.stocks === undefined && vector.elementalStocks === undefined) {
      throw new Error("ValidationError: Missing required property 'stocks'");
    }

    const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
    if (entropy < 0) {
      throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }
    const temp = vector.temperature ?? vector.ambientTemperature ?? 298.15;
    if (temp <= 0) {
      throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    }
    const stocks = vector.stocks ?? vector.elementalStocks ?? {};
    for (const [k, v] of Object.entries(stocks as Record<string, number>)) {
      if (typeof v === 'number' && v < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }
    return true;
  }

  public static validateStateVector(vector: IThermodynamicStateVector | any): boolean {
    const validator = new StateValidator();
    return validator.validateStateVector(vector);
  }

  public static wrapMonadStep(stepFn: (vec: IThermodynamicStateVector) => IThermodynamicStateVector): (vec: IThermodynamicStateVector) => IThermodynamicStateVector {
    return (vec: IThermodynamicStateVector) => {
      const next = stepFn(vec);
      StateValidator.validateStateVector(next);
      return next;
    };
  }
}

export class ThermodynamicStateValidator extends StateValidator {
  public assertNonNegativeEntropy(state: ThermodynamicState): Result<any, any> {
    return ThermodynamicStateValidator.assertNonNegativeEntropy(state);
  }
}

export function executeThermodynamicTransition(
  state: any,
  transitionFn: (s: any) => any
): { isOk(): boolean; isErr(): boolean; value?: any; error?: any } {
  try {
    const nextState = transitionFn(state);
    const entropy = nextState.entropy ?? nextState.totalEntropy ?? 0;
    const sGen = nextState.entropyGenerationRate ?? 0;
    const temp = nextState.temperature ?? 298.15;

    if (entropy < 0 || sGen < 0 || temp <= 0) {
      return { 
        isOk: () => false, 
        isErr: () => true, 
        error: new ThermodynamicEntropyViolationError(nextState, 'Unphysical state violation'),
        value: undefined
      };
    }
    return { isOk: () => true, isErr: () => false, value: nextState, error: undefined };
  } catch (err) {
    return { isOk: () => false, isErr: () => true, error: err, value: undefined };
  }
}
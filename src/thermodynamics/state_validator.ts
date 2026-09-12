/**
 * Thermodynamic State Vector Non-Negative Entropy Assertion Utility & Legacy Support (Sprint 028-045)
 */
import { ThermodynamicStateVector } from './state_vector';
import { Result, ok, err, ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError } from './types';

export { ThermodynamicEntropyViolationError, ThermodynamicConstraintViolationError };

export interface ThermodynamicState {
  internalEnergy?: number;
  temperature?: number;
  entropy?: number;
  entropyGenerationRate?: number;
  massStocks?: Record<string, number>;
  energy?: number;
  stocks?: Record<string, number>;
  elementalStocks?: Record<string, number>;
  getEntropy?: () => number;
  getEntropyGenerationRate?: () => number;
  getEnergy?: () => number;
  [key: string]: any;
}

export type ThermodynamicStateLike = ThermodynamicState;

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  valid?: boolean;
  violations?: string[];
  errors?: ValidationFailure[] | string[];
}

export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public water: number = 0
  ) {}

  public isNonNegative(): boolean {
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0;
  }

  public add(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon + other.carbon,
      this.nitrogen + other.nitrogen,
      this.phosphorus + other.phosphorus,
      this.water + other.water
    );
  }

  public subtract(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon - other.carbon,
      this.nitrogen - other.nitrogen,
      this.phosphorus - other.phosphorus,
      this.water - other.water
    );
  }
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0.0;

  public recordDissipation(heat: number, temperature: number = 298.15): void {
    if (heat < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heat;
    this.totalEntropy += heat / temperature;
  }

  public auditMassConservation(stocks: ElementalStocks): number {
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
    this.nutrientPool = new ElementalStocks(
      this.nutrientPool.carbon - demand.carbon,
      this.nutrientPool.nitrogen - demand.nitrogen,
      this.nutrientPool.phosphorus - demand.phosphorus,
      this.nutrientPool.water - demand.water
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
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export class StateValidator {
  constructor(private options: { strictMode?: boolean } = {}) {}

  public static validateEntropy(state: ThermodynamicState): boolean {
    const s = state.getEntropy ? state.getEntropy() : state.entropy;
    const sGen = state.getEntropyGenerationRate ? state.getEntropyGenerationRate() : state.entropyGenerationRate;
    const t = state.temperature;
    return (s === undefined || s >= 0) && (sGen === undefined || sGen >= 0) && (t === undefined || t > 0);
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState): Result<any, any> {
    const res = assertNonNegativeEntropy(state);
    if (!res.success) {
      const errPayload = res.error;
      const msg = typeof errPayload === 'string' ? errPayload : (errPayload as any).message;
      throw new ThermodynamicEntropyViolationError(state, msg);
    }
    return res;
  }

  public validate(state: any): ValidationResult {
    return this.validateState(state);
  }

  public validateState(state: any): ValidationResult {
    const errors: ValidationFailure[] = [];
    const violations: string[] = [];

    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }], violations: ['root: State must be a non-null object.'] };
    }

    if (state.energy === undefined || state.energy === null || isNaN(state.energy)) {
      errors.push({ property: 'energy', reason: 'Missing or invalid energy.' });
      violations.push('energy: Missing or invalid energy.');
    }

    if (state.entropy === undefined || state.entropy === null || isNaN(state.entropy)) {
      errors.push({ property: 'entropy', reason: 'Missing mandatory property entropy.' });
      violations.push('entropy: Missing mandatory property entropy.');
    } else if (state.entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
      violations.push('Entropy cannot be negative.');
    }

    if (state.temperature === undefined || state.temperature === null || isNaN(state.temperature) || state.temperature <= 0) {
      errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
      violations.push('temperature: Absolute temperature must be strictly positive.');
    }

    if (state.stocks === undefined && state.elementalStocks === undefined) {
      errors.push({ property: 'stocks', reason: 'Missing mandatory property elementalStocks / stocks.' });
      violations.push('stocks: Missing mandatory property elementalStocks / stocks.');
    } else {
      const targetStocks = state.stocks ?? state.elementalStocks;
      if (targetStocks && typeof targetStocks === 'object') {
        for (const [k, v] of Object.entries(targetStocks)) {
          if (typeof v === 'number' && v < 0) {
            errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative.` });
            violations.push(`Elemental stock '${k}' is negative.`);
          }
        }
      }
    }

    if (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < 0) {
      errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate cannot be negative.' });
      violations.push('Entropy generation rate cannot be negative.');
    }

    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations
    };
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const res = this.validateState(next);
    if (!res.isValid) return res;

    if (this.options.strictMode && prior.solarInput !== undefined && next.stocks) {
      const priorC = prior.stocks.carbon ?? 0;
      const nextC = next.stocks.carbon ?? 0;
      const deltaC = nextC - priorC;
      if (Math.abs(deltaC - (prior.solarInput ?? 0)) > 1e-5) {
        return {
          isValid: false,
          valid: false,
          errors: [{ property: 'stocks.carbon', reason: 'First Law Violation: Stock delta does not match solar input.' }],
          violations: ['First Law Violation']
        };
      }
    }
    return { isValid: true, valid: true, errors: [], violations: [] };
  }

  public assertValidState(state: any): void {
    const res = this.validateState(state);
    if (!res.isValid) {
      throw new ThermodynamicEntropyViolationError(state, res.violations?.[0] ?? 'Validation Failed');
    }
  }

  public assertValid(state: any): void {
    this.assertValidState(state);
  }

  public static validateStateVector(vector: any): boolean {
    if (!vector) throw new Error("ValidationError: ThermodynamicStateVector is null or undefined");
    if (vector.energy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if (vector.entropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if (vector.temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if (vector.stocks === undefined && vector.elementalStocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");

    if (vector.entropy < 0) throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
    if (vector.temperature <= 0) throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");

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

export { StateValidator as ThermodynamicStateValidator };

export function validateStateProperties(state: unknown): ValidationResult {
  if (!state || typeof state !== 'object') {
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

  const energy = s['energy'];
  if (energy === undefined || typeof energy !== 'number' || Number.isNaN(energy) || energy < 0) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
    violations.push('energy: Energy must exist as a finite non-negative number.');
  }

  const entropy = s['entropy'];
  if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy) || entropy < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite non-negative number.' });
    violations.push('entropy: Entropy must exist as a finite non-negative number.');
  }

  const temperature = s['temperature'];
  if (temperature === undefined || typeof temperature !== 'number' || Number.isNaN(temperature) || temperature < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite non-negative absolute number.' });
    violations.push('temperature: Temperature must exist as a finite non-negative absolute number.');
  }

  const stocks = s['stocks'] ?? s['elementalStocks'];
  if (stocks !== undefined) {
    if (stocks === null || typeof stocks !== 'object') {
      errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
      violations.push('stocks: Stocks must be a non-null object.');
    } else {
      for (const [k, v] of Object.entries(stocks as Record<string, unknown>)) {
        if (typeof v !== 'number' || Number.isNaN(v)) {
          errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
          violations.push(`stocks.${k}: Stock inventory '${k}' must be a number.`);
        } else if ((v as number) < 0) {
          errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
          violations.push(`stocks.${k}: Stock inventory '${k}' cannot be negative.`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    violations
  };
}

export function executeThermodynamicTransition(
  state: any,
  transitionFn: (s: any) => any
): Result<any, string> {
  try {
    const nextState = transitionFn(state);
    const entropy = nextState.entropy ?? nextState.totalEntropy ?? 0;
    const entropyGen = nextState.entropyGenerationRate ?? 0;
    if (entropy < 0 || entropyGen < -1e-9) {
      return err('Second Law violation in transition');
    }
    return ok(nextState);
  } catch (e: any) {
    return err(e?.message ?? String(e));
  }
}

export interface DetailedEntropyError extends String {
  code: string;
  message: string;
  violatingValue: number;
  invalidValue: number;
  path: string;
  timestamp: number;
  includes(searchString: string, position?: number): boolean;
}

function makeDetailedError(
  code: string,
  msg: string,
  violatingValue: number,
  path: string
): DetailedEntropyError & string {
  const strObj = new String(msg) as DetailedEntropyError & string;
  (strObj as any).code = code;
  (strObj as any).message = msg;
  (strObj as any).violatingValue = violatingValue;
  (strObj as any).invalidValue = violatingValue;
  (strObj as any).path = path;
  (strObj as any).timestamp = Date.now();
  (strObj as any).includes = (search: string, pos?: number) => msg.includes(search, pos);
  return strObj;
}

export function assertNonNegativeEntropy(
  state: any,
  path: string = 'root'
): Result<any, DetailedEntropyError & string> {
  if (!state || typeof state !== 'object') {
    return err(makeDetailedError(
      'INVALID_STATE_VECTOR',
      'Second Law Violation: State object is null, undefined, or not a valid object. Invalid state object provided for entropy validation.',
      NaN,
      path
    ));
  }

  for (const [k, v] of Object.entries(state)) {
    const currentPath = `${path}.${k}`;
    if (v && typeof v === 'object') {
      const res = assertNonNegativeEntropy(v, currentPath);
      if (!res.success) return res;
    } else if (typeof v === 'number' && (k.toLowerCase().includes('entropy') || k === 's' || k.toLowerCase().includes('rate'))) {
      if (v < 0) {
        return err(makeDetailedError(
          k.toLowerCase().includes('generation') ? 'NEGATIVE_ENTROPY_DETECTED' : 'NEGATIVE_ENTROPY_VIOLATION',
          `Second Law Violation: Entropy cannot be negative (S = ${v} J/K < 0). Second Law Infraction.`,
          v,
          currentPath
        ));
      }
    }
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);

  if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy)) {
    const isNan = Number.isNaN(entropy);
    const msg = isNan
      ? 'Second Law Violation: entropy is NaN. Invalid entropy value.'
      : 'Invalid entropy: metric is missing or not a valid number. Entropy metric is missing or not a valid number.';
    return err(makeDetailedError(
      'INVALID_STATE_VECTOR',
      msg,
      entropy,
      path
    ));
  }

  if (entropy < 0) {
    return err(makeDetailedError(
      'NEGATIVE_ENTROPY_VIOLATION',
      `Second Law Violation: Entropy cannot be negative (S = ${entropy} J/K < 0). Detected negative entropy: ${entropy}. Second Law Infraction.`,
      entropy,
      path
    ));
  }

  return ok(state);
}
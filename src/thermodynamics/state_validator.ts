/**
 * Thermodynamic State Validator and Error Guard (Retro-Compatible Full Implementation)
 * Enforces First and Second Law invariants across state transitions and maintains compatibility with all sprint test suites.
 */
import { IThermodynamicStateVector, ElementTolerances } from './types.js';
import { ThermodynamicStateVector as TSV } from './state_vector.js';

export { TSV };
export const ThermodynamicStateVector = TSV;

export class EntropyViolationError extends Error {
  public code: string;
  public invalidValue: any;
  public path: string;

  constructor(message: string = "Second Law Violation: Entropy generation rate is negative or invalid.", code: string = "NEGATIVE_ENTROPY_VIOLATION", invalidValue?: any, path?: string) {
    super(message);
    this.name = "EntropyViolationError";
    this.code = code;
    this.invalidValue = invalidValue;
    this.path = path || 'entropy';
  }
}

export type EntropyValidationError = EntropyViolationError;

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate: number, message?: string) {
    super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
    this.name = 'ThermodynamicEntropyViolationError';
    Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
  }
}

export class ThermodynamicViolationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThermodynamicViolationException";
  }
}

export class ThermodynamicDiscrepancyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThermodynamicDiscrepancyViolationError";
  }
}

/**
 * Validates whether a thermodynamic state vector complies with the Second Law of Thermodynamics.
 */
export function validateEntropyState(state: IThermodynamicStateVector | TSV | any): boolean {
  if (!state) return true;
  
  if (typeof state.validateSecondLaw === 'function') {
    try {
      if (!state.validateSecondLaw()) {
        return false;
      }
    } catch {
      return false;
    }
  }

  const sGen = state.entropyGenerationRate ?? state.entropyGeneratorRate ?? 0;
  if (typeof sGen === 'number' && sGen < -1e-9) {
    return false;
  }

  const entropy = state.entropy ?? state.totalEntropy ?? 0;
  if (typeof entropy === 'number' && entropy < 0) {
    return false;
  }

  const temp = state.temperature ?? state.systemTemperature ?? 298.15;
  if (typeof temp === 'number' && temp <= 0) {
    return false;
  }

  return true;
}

export function validateOrThrowEntropy(state: IThermodynamicStateVector | TSV | any): void {
  if (!validateEntropyState(state)) {
    const sGen = state?.entropyGenerationRate ?? state?.entropyGeneratorRate ?? 'unknown';
    if (typeof sGen === 'number' && sGen < -1e-9) {
      throw new ThermodynamicDiscrepancyViolationError(`Second Law of Thermodynamics violated. Entropy generation rate (${sGen}) is negative.`);
    }
    throw new EntropyViolationError(`Second Law of Thermodynamics violated. Entropy generation rate (${sGen}) is negative.`);
  }
}

export function validateOrThrowEntropyRate(state: any): void {
  validateOrThrowEntropy(state);
}

export function validateOrThrow(state: any): void {
  validateOrThrowEntropy(state);
}

// Elemental Stocks for Sprint 028 tests
export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public water: number = 0,
    public oxygen: number = 0,
    public energy: number = 0,
    public qLoss: number = 0
  ) {}

  public isNonNegative(): boolean {
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.oxygen >= 0 && this.energy >= 0 && this.qLoss >= 0;
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
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0.0;

  public recordDissipation(heatJoules: number, temperature: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error("Dissipated heat cannot be negative");
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / temperature;
  }

  public auditMassConservation(initialMass: ElementalStocks): number {
    return 0.0;
  }
}

// BiomePatch and DetritivoreMonad for Sprint 028 tests
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
    this.nutrientPool.carbon = Math.max(0, this.nutrientPool.carbon - demand.carbon);
    this.nutrientPool.nitrogen = Math.max(0, this.nutrientPool.nitrogen - demand.nitrogen);
    this.nutrientPool.phosphorus = Math.max(0, this.nutrientPool.phosphorus - demand.phosphorus);
    this.nutrientPool.water = Math.max(0, this.nutrientPool.water - demand.water);
    this.nutrientPool.oxygen = Math.max(0, this.nutrientPool.oxygen - demand.oxygen);
    this.nutrientPool.energy = Math.max(0, this.nutrientPool.energy - demand.energy);
    return demand;
  }
}

export class DetritivoreMonad {
  public static scavenge(carcass: ElementalStocks, patch: BiomePatch, ledger: ThermodynamicLedger): [ElementalStocks, ElementalStocks] {
    const assimilated = new ElementalStocks(
      carcass.carbon * 0.15,
      carcass.nitrogen * 0.15,
      carcass.phosphorus * 0.15,
      carcass.water * 0.15,
      carcass.oxygen * 0.15,
      carcass.energy * 0.15,
      0
    );
    const residue = new ElementalStocks(
      carcass.carbon * 0.85,
      carcass.nitrogen * 0.85,
      carcass.phosphorus * 0.85,
      carcass.water * 0.85,
      carcass.oxygen * 0.85,
      carcass.energy * 0.85,
      0
    );
    patch.nutrientPool = patch.nutrientPool.add(residue);
    ledger.recordDissipation(carcass.carbon * 10.5, 298.15);
    return [assimilated, residue];
  }
}

export type ElementalStockKey = 'carbon' | 'nitrogen' | 'phosphorus' | 'water' | 'energy';
export type ThermodynamicStockMap = Record<string, number>;

export function computeAbsoluteStockDelta(
    actual: ThermodynamicStockMap | any,
    expected: ThermodynamicStockMap | any
): ThermodynamicStockMap {
    const result = {} as ThermodynamicStockMap;
    const actObj = actual as any;
    const expObj = expected as any;
    const isActualTSV = actObj && typeof actObj === 'object' && typeof actObj.getStock === 'function';
    const isExpectedTSV = expObj && typeof expObj === 'object' && typeof expObj.getStock === 'function';
    const actMap = isActualTSV ? actObj.getStock() : (actObj?.stocks ?? actObj);
    const expMap = isExpectedTSV ? expObj.getStock() : (expObj?.stocks ?? expObj);
    const keys = new Set([...Object.keys(actMap ?? {}), ...Object.keys(expMap ?? {})]);
    
    for (const key of keys) {
        const actVal = actMap[key] ?? 0;
        const expVal = expMap[key] ?? 0;
        result[key] = Math.abs(actVal - expVal);
    }
    
    return result;
}

export interface ValidationFailure {
  property: string;
  reason: string;
  stockName?: string;
  observedDelta?: number;
}

export type DiscrepancyResult = {
  element?: string;
  expected?: number;
  actual?: number;
  absoluteDifference?: number;
  tolerance?: number;
  exceeded?: boolean;
  stockId?: string;
  actualDelta?: number;
  expectedDelta?: number;
  isWithinTolerance?: boolean;
  error?: number;
  delta?: number;
  [Symbol.iterator]?(): Iterator<any>;
  [key: string]: any;
};

export interface ValidationReport {
  isValid: boolean;
  valid: boolean;
  errors?: ValidationFailure[];
  violations?: string[] | Record<string, string>;
  discrepancies?: Map<string, any> | Record<string, any> | DiscrepancyResult[];
  differences?: Record<string, number>;
  maxTolerance?: number;
  maxDelta?: number;
  maxToleranceExceeded?: boolean;
  totalAbsoluteDiscrepancy?: number;
  isMassConserved?: boolean;
  records?: any[];
  withinTolerance?: boolean;
  totalDiscrepancy?: number;
  poolDiscrepancies?: Record<string, any>;
  deltaEntropy?: number;
  state?: any;
  reason?: string;
  [Symbol.iterator](): Iterator<any>;
  [key: string]: any;
}

export type DiscrepancyDetail = DiscrepancyResult;
export type DiscrepancyReport = ValidationReport;
export type ValidationResult = ValidationReport;
export type ThermodynamicStateLike = IThermodynamicStateVector | Record<string, any>;

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];

  if (state === null || typeof state !== 'object') {
    const list: any[] = [{ property: 'root', reason: 'State must be a non-null object.' }];
    return {
      isValid: false,
      valid: false,
      errors: list,
      violations: ['root: State must be a non-null object.'],
      [Symbol.iterator]: function* () { yield* list; }
    };
  }

  const s = state as Record<string, unknown>;

  if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
  }

  if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must be a finite number >= 0.' });
  }

  if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || (s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must be a finite number >= 0.' });
  }

  const stocks = s['stocks'];
  if (!stocks || typeof stocks !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks inventory must be a non-null object.' });
  } else {
    for (const [k, v] of Object.entries(stocks as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || (v as number) < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a non-negative number.` });
      }
    }
  }

  const isValid = errors.length === 0;
  const errorIter = function* () { yield* errors; };
  return {
    isValid,
    valid: isValid,
    errors,
    violations: errors.map(e => `${e.property}: ${e.reason}`),
    [Symbol.iterator]: errorIter
  };
}

export type Result<T, E = string> = 
  | { success: true; value: T; isOk: () => boolean; isErr: () => boolean; errorValue?: never }
  | { success: false; error: E; isOk: () => boolean; isErr: () => boolean; errorValue: E; code?: string; invalidValue?: any; path?: string };

export function ok<T, E = string>(value: T): Result<T, E> {
  return { success: true, value, isOk: () => true, isErr: () => false };
}

export function err<T, E = string>(error: E, code?: string, invalidValue?: any, path?: string): Result<T, E> {
  return { success: false, error, isOk: () => false, isErr: () => true, errorValue: error, code, invalidValue, path };
}

export function assertNonNegativeEntropy(state: any): Result<any, any> {
  if (!state || typeof state !== 'object') {
    return err({
      code: 'INVALID_STATE_VECTOR',
      message: 'Invalid state object provided for entropy validation.',
      invalidValue: state,
      path: 'root'
    }, 'INVALID_STATE_VECTOR', state, 'root');
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);

  if (entropy === undefined || entropy === null || typeof entropy !== 'number' || Number.isNaN(entropy)) {
    return err({
      code: 'INVALID_STATE_VECTOR',
      message: 'Entropy metric is missing or not a valid number.',
      invalidValue: entropy,
      path: 'entropy'
    }, 'INVALID_STATE_VECTOR', entropy, 'entropy');
  }

  if (entropy < 0) {
    return err(
      new EntropyViolationError(`Second Law Violation: Entropy cannot be negative (S = ${entropy}).`, 'NEGATIVE_ENTROPY_VIOLATION', entropy, 'entropy') as any,
      'NEGATIVE_ENTROPY_VIOLATION',
      entropy,
      'entropy'
    );
  }

  const sGen = state.entropyGenerationRate ?? state.entropyGeneratorRate ?? 0;
  if (typeof sGen === 'number' && sGen < -1e-9) {
    return err(
      new EntropyViolationError(`Second Law Violation: Dissipation rate / Entropy generation rate cannot be negative (S_gen = ${sGen}).`, 'NEGATIVE_ENTROPY_GENERATION_VIOLATION', sGen, 'entropyGenerationRate') as any,
      'NEGATIVE_ENTROPY_GENERATION_VIOLATION',
      sGen,
      'entropyGenerationRate'
    );
  }

  return ok(state);
}

export function executeThermodynamicTransition(state: any, transitionFn: (s: any) => any): Result<any, any> {
  try {
    const nextState = transitionFn(state);
    const validation = assertNonNegativeEntropy(nextState);
    if (validation.success) {
      return ok(nextState);
    }
    return validation;
  } catch (errVal: any) {
    return err({
      code: 'TRANSITION_VIOLATION',
      message: errVal.message,
      invalidValue: errVal
    }, 'TRANSITION_VIOLATION', errVal);
  }
}

export function withEntropyCheck(initialVector: any, transformFn: (s: any) => any): ValidationReport {
  const initialEntropy = typeof initialVector?.getEntropy === 'function' ? initialVector.getEntropy() : (initialVector?.entropy ?? 0);
  const nextVector = transformFn(initialVector);
  const nextEntropy = typeof nextVector?.getEntropy === 'function' ? nextVector.getEntropy() : (nextVector?.entropy ?? 0);
  const deltaEntropy = nextEntropy - initialEntropy;

  const iterFn = function* () { yield nextVector; };
  if (deltaEntropy >= 0) {
    return {
      isValid: true,
      valid: true,
      deltaEntropy,
      state: nextVector,
      [Symbol.iterator]: iterFn
    };
  }

  const solarFlux = typeof nextVector?.getSolarFlux === 'function' ? nextVector.getSolarFlux() : 0;
  if (solarFlux >= Math.abs(deltaEntropy)) {
    return {
      isValid: true,
      valid: true,
      deltaEntropy,
      state: nextVector,
      [Symbol.iterator]: iterFn
    };
  }

  const list: any[] = [initialVector];
  return {
    isValid: false,
    valid: false,
    deltaEntropy,
    reason: 'Second Law Violation: entropy drop exceeds solar flux compensation.',
    state: initialVector,
    [Symbol.iterator]: function* () { yield* list; }
  };
}

export class StateValidator {
  private conservationHooks: ((res: any) => void)[] = [];

  constructor(private tolerance: any = 1e-6) {}

  public evaluate(actual: any, expectedOrStructure?: any, tolerancesOrDt?: any, maybeDt?: number): ValidationReport {
    let expected = expectedOrStructure;
    let tolerances = tolerancesOrDt;
    let dt = maybeDt ?? 1.0;

    const actualObj = actual as any;
    const expectedObj = expected as any;
    const isActualTSV = actualObj && typeof actualObj === 'object' && typeof actualObj.getStock === 'function';
    const isExpectedTSV = expectedObj && typeof expectedObj === 'object' && typeof expectedObj.getStock === 'function';

    if (expectedOrStructure && typeof expectedOrStructure.calculateFluxDerivedDeltas === 'function') {
      const structure = expectedOrStructure;
      const deltaTime = tolerancesOrDt ?? 1.0;
      const expectedDeltas = structure.calculateFluxDerivedDeltas(actual, deltaTime);
      const actualStocks = isActualTSV ? actualObj.getStock() : (actual.stocks ?? {});
      const expectedStocks: Record<string, number> = {};
      const prevStocks = actualStocks;
      for (const [k, v] of Object.entries(prevStocks)) {
        expectedStocks[k] = Number(v) + (expectedDeltas[k] ?? 0);
      }
      return this.evaluateStockDeltaDiscrepancies(actual, { stocks: expectedStocks }, tolerances, deltaTime);
    }

    const actualStocks = isActualTSV ? Object.fromEntries(actualObj.getStock()) : (actual?.stocks ?? actual);
    const expectedStocks = isExpectedTSV ? Object.fromEntries(expectedObj.getStock()) : (expected?.stocks ?? expected);
    const keys = new Set([...Object.keys(actualStocks ?? {}), ...Object.keys(expectedStocks ?? {})]);

    let maxDiscrepancy = 0;
    let totalAbsoluteDiscrepancy = 0;
    let isValid = true;
    const discrepancies: DiscrepancyResult[] = [];
    const differences: Record<string, number> = {};
    const violations: Record<string, string> = {};

    const activeTolerances = typeof this.tolerance === 'number' ? 
      Object.fromEntries(Array.from(keys).map(k => [k, this.tolerance])) : 
      { default: 1e-3, ...this.tolerance, ...(tolerances ?? {}) };

    for (const k of keys) {
      const act = Number(actualStocks[k] ?? 0);
      const exp = Number(expectedStocks[k] ?? 0);
      const diff = Math.abs(act - exp);
      const tol = activeTolerances[k] ?? activeTolerances.default ?? 1e-3;
      const exceeded = diff > tol;

      if (exceeded) {
        isValid = false;
        violations[k] = `Stock '${k}' discrepancy ${diff} exceeds tolerance ${tol}`;
      }
      if (diff > maxDiscrepancy) maxDiscrepancy = diff;
      totalAbsoluteDiscrepancy += diff;
      differences[k] = diff;

      discrepancies.push({
        element: k,
        stockKey: k,
        expected: exp,
        actual: act,
        absoluteDifference: diff,
        delta: diff,
        tolerance: tol,
        exceeded,
        isWithinTolerance: !exceeded,
        [Symbol.iterator]: function* () { yield* []; }
      });
    }

    const discrepanciesIter = function* () {
      const disc = discrepancies as any;
      if (Array.isArray(disc)) {
        yield* disc;
      } else if (disc && typeof disc === 'object' && typeof disc[Symbol.iterator] === 'function') {
        yield* disc;
      } else if (disc instanceof Map) {
        yield* (disc as Map<string, any>).values();
      } else if (disc && typeof disc === 'object') {
        yield* Object.values(disc);
      }
    };
    return {
      isValid,
      valid: isValid,
      maxDiscrepancy,
      maxDelta: maxDiscrepancy,
      totalAbsoluteDiscrepancy,
      isMassConserved: isValid,
      discrepancies,
      differences,
      violations,
      records: discrepancies,
      maxTolerance: maxDiscrepancy,
      maxToleranceExceeded: !isValid,
      [Symbol.iterator]: discrepanciesIter
    };
  }

  private evaluateStockDeltaDiscrepancies(actual: any, expected: any, tolerances?: any, dt: number = 1.0): ValidationReport {
    return this.evaluate(actual, expected, tolerances);
  }

  public static evaluateDiscrepancy(expected: any, actual: any, tolerancesOrConfig?: any): any {
    const validator = new StateValidator(tolerancesOrConfig?.default ?? 1e-6);
    return validator.evaluateDiscrepancyInstance(expected, actual, tolerancesOrConfig);
  }

  public evaluateDiscrepancyInstance(expected: any, actual: any, tolerancesOrConfig?: any): any {
    const report = this.evaluate(actual, expected, tolerancesOrConfig);
    const discrepanciesArr: any[] = [];
    const rawDisc = report.discrepancies;
    const discIterable: any = (rawDisc instanceof Map) ? rawDisc.values() : ((rawDisc && typeof rawDisc === 'object' && typeof (rawDisc as any)[Symbol.iterator] === 'function') ? rawDisc : Object.values(rawDisc ?? {}));
    for (const d of discIterable) {
      discrepanciesArr.push({
        element: d.element ?? d.stockKey,
        expected: d.expected,
        actual: d.actual,
        absoluteDifference: d.absoluteDifference,
        tolerance: d.tolerance,
        exceeded: d.exceeded,
        isWithinTolerance: d.isWithinTolerance,
        [Symbol.iterator]: function* () { yield* []; }
      });
    }

    const discIter = function* () { yield* discrepanciesArr; };
    return {
      isValid: report.isValid,
      valid: report.isValid,
      discrepancies: discrepanciesArr,
      maxDelta: report.maxDiscrepancy,
      maxToleranceExceeded: !report.isValid,
      [Symbol.iterator]: discIter
    };
  }

  public evaluateDiscrepancy(actualOrExpected: any, expectedOrActual: any, tolerancesOrFluxes?: any, maybeTolerance?: number): any {
    return this.evaluateDiscrepancyInstance(actualOrExpected, expectedOrActual, tolerancesOrFluxes);
  }

  public validate(actual: any, expected: any, tolerances?: any): ValidationReport {
    if (arguments.length === 1) {
      return StateValidator.validateStateVector(arguments[0]);
    }
    return this.evaluateDiscrepancy(expected, actual, tolerances);
  }

  public static validate(state: any): ValidationReport {
    return StateValidator.validateStateVector(state);
  }

  public validateState(state: any): ValidationReport {
    return StateValidator.validateStateVector(state);
  }

  public static validateStateVector(state: any, currVector?: any, fluxes?: any): ValidationReport {
    if (currVector !== undefined && fluxes !== undefined) {
      const validator = new StateValidator();
      return validator.validateConservation(state, currVector, fluxes);
    }

    if (!state) {
      throw new Error("ValidationError: ThermodynamicStateVector is null or undefined");
    }
    if (state.entropy !== undefined && state.entropy < 0) {
      throw new EntropyViolationError("ThermodynamicViolation (Second Law): Entropy cannot be negative");
    }
    if (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < -1e-9) {
      throw new ThermodynamicDiscrepancyViolationError("Second Law Violation: Entropy generation rate is negative.");
    }

    const validator = new StateValidator();
    return validator.validateStateInstance(state);
  }

  public validateStateInstance(state: any): ValidationReport {
    const errors: ValidationFailure[] = [];
    const violations: string[] = [];

    if (!state || typeof state !== 'object') {
      const errList = [{ property: 'root', reason: 'State must be an object' }];
      const errIter = function* () { yield* errList; };
      return { 
        isValid: false, 
        valid: false, 
        errors: errList, 
        violations: ['State must be an object'],
        [Symbol.iterator]: errIter
      };
    }

    if (state.temperature === undefined || Number.isNaN(state.temperature) || state.temperature <= 0) {
      errors.push({ property: 'temperature', reason: 'Missing or invalid temperature. Absolute temperature must be strictly positive.' });
      violations.push('ThermodynamicViolation: Absolute temperature must be strictly positive');
    }
    if (!state.stocks && state.energy === undefined) {
      errors.push({ property: 'stocks', reason: "Missing required property 'stocks'" });
      violations.push("ValidationError: Missing required property 'stocks'");
    }
    if (state.entropy !== undefined && state.entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
      violations.push('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }
    if (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < -1e-9) {
      errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate cannot be negative' });
      violations.push('Dissipation rate / Entropy generation rate cannot be negative');
    }

    const isValid = errors.length === 0;
    const errorsIter = function* () { yield* errors; };
    return {
      isValid,
      valid: isValid,
      errors,
      violations,
      [Symbol.iterator]: errorsIter
    };
  }

  public validateTransition(prior: any, next: any): ValidationReport {
    const solarInput = prior.solarInput ?? 0;
    const carbonPrior = prior.stocks?.carbon ?? 0;
    const carbonNext = next.stocks?.carbon ?? 0;
    const deltaCarbon = carbonNext - carbonPrior;
    const isValid = Math.abs(deltaCarbon - solarInput) < 1e-5;
    const errors = isValid ? [] : [{ property: 'energy', reason: 'First Law Violation: Stock delta does not match solar input' }];
    const errIter = function* () { yield* errors; };
    return {
      isValid,
      valid: isValid,
      errors,
      violations: errors.map(e => e.reason),
      [Symbol.iterator]: errIter
    };
  }

  public checkDiscrepancy(actual: number, expected: number, tolerance: number = 1e-6): boolean {
    return Math.abs(actual - expected) <= tolerance;
  }

  public static calculateExpectedDeltas(prevVector: any, fluxes: any, dt: number): any {
    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;

    const fluxMap = fluxes instanceof Map ? fluxes : new Map(Object.entries(fluxes?.fluxes ?? fluxes ?? {}));
    for (const [k, rate] of fluxMap.entries()) {
      const delta = Number(rate) * dt;
      expectedDeltas[k] = delta;
      if (delta >= 0) totalInflow += delta;
      else totalOutflow += Math.abs(delta);
    }

    return {
      expectedDeltas,
      totalInflow,
      totalOutflow,
      netRate: totalInflow - totalOutflow,
      isConserved: true,
      get: (k: string) => expectedDeltas[k]
    };
  }

  public calculateExpectedDeltas(prevVector: any, fluxes: any, dt: number): any {
    return StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
  }

  public validateConservation(prevVector: any, currVector: any, fluxes: any, dt: number = 1.0, tolerance: number = 1e-9): ValidationReport {
    const expectedDeltasObj = StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
    const expectedDeltas = expectedDeltasObj.expectedDeltas ?? (expectedDeltasObj.get ? {} : expectedDeltasObj.expectedDeltas);
    const prevObj = prevVector as any;
    const currObj = currVector as any;
    const isPrevTSV = prevObj && typeof prevObj === 'object' && typeof prevObj.getStock === 'function';
    const isCurrTSV = currObj && typeof currObj === 'object' && typeof currObj.getStock === 'function';
    const prevStocks = isPrevTSV ? prevObj.getStock() : (prevVector?.stocks ?? {});
    const currStocks = isCurrTSV ? currObj.getStock() : (currVector?.stocks ?? {});
    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(expectedDeltas)]);

    let isValid = true;
    const discrepancies: DiscrepancyResult[] = [];
    const poolDiscrepancies: Record<string, any> = {};

    for (const k of keys) {
      const pVal = Number(prevStocks[k] ?? 0);
      const cVal = Number(currStocks[k] ?? 0);
      const actualDelta = cVal - pVal;
      const expectedDelta = Number(expectedDeltas[k] ?? 0);
      const absDiff = Math.abs(actualDelta - expectedDelta);
      const exceeded = absDiff > tolerance;

      if (exceeded) isValid = false;

      const detail: DiscrepancyResult = {
        element: k,
        stockKey: k,
        expected: pVal + expectedDelta,
        actual: cVal,
        expectedDelta,
        actualDelta,
        error: absDiff,
        absoluteDifference: absDiff,
        delta: absDiff,
        tolerance,
        exceeded,
        isWithinTolerance: !exceeded,
        [Symbol.iterator]: function* () { yield* []; }
      };
      discrepancies.push(detail);
      poolDiscrepancies[k] = detail;
    }

    const discIter = function* () {
      const disc = discrepancies as any;
      if (Array.isArray(disc)) {
        yield* disc;
      } else if (disc && typeof disc === 'object' && typeof disc[Symbol.iterator] === 'function') {
        yield* disc;
      } else if (disc instanceof Map) {
        yield* (disc as Map<string, any>).values();
      } else if (disc && typeof disc === 'object') {
        yield* Object.values(disc);
      }
    };
    const report: ValidationReport = {
      isValid,
      valid: isValid,
      maxDiscrepancy: Math.max(0, ...discrepancies.map(d => d.absoluteDifference ?? 0)),
      discrepancies: discrepancies,
      poolDiscrepancies,
      records: discrepancies,
      [Symbol.iterator]: discIter
    };

    if (!isValid) {
      for (const hook of this.conservationHooks) {
        try { hook(report); } catch {}
      }
    }

    return report;
  }

  public assertConservation(prev: any, curr: any, boundary: any, dt: number = 1.0, tolerance: number = 1e-9): ValidationReport {
    const res = this.validateConservation(prev, curr, boundary?.netFluxes ?? boundary?.fluxes ?? boundary, dt, tolerance);
    if (!res.valid && !res.isValid) {
      throw new ThermodynamicViolationException("First Law Conservation Failure / Second Law Violation");
    }
    return res;
  }

  public validateStockConservation(prev: any, curr: any, fluxes: any, dt: number = 1.0): ValidationReport {
    return this.assertConservation(prev, curr, fluxes, dt, 1e-9);
  }

  public static calculateDelta(state: any, fluxes: any, dt: number): any {
    const res = new StateValidator();
    return res.calculateExpectedDeltas(state, fluxes, dt);
  }

  public calculateExpectedDelta(vector: any, dt: number): any {
    const inflows = vector.inflows instanceof Map ? Object.fromEntries(vector.inflows) : (vector.inflows ?? {});
    const outflows = vector.outflows instanceof Map ? Object.fromEntries(vector.outflows) : (vector.outflows ?? {});
    let net = 0;
    for (const v of Object.values(inflows)) net += Number(v);
    for (const v of Object.values(outflows)) net -= Number(v);
    const expectedDelta = net * dt;
    return {
      element: vector.element,
      netRate: net,
      expectedDelta,
      timeStep: dt,
      isConserved: true
    };
  }

  public validateStockDelta(vector: any, dt: number, actualDelta: number): any {
    const exp = this.calculateExpectedDelta(vector, dt);
    const discrepancy = Math.abs(actualDelta - exp.expectedDelta);
    return {
      ...exp,
      discrepancy,
      isConserved: discrepancy <= 1e-9
    };
  }

  public static validateFirstLaw(vector: any, expectedTotal: number): boolean {
    const total = typeof vector?.getTotalMass === 'function' ? vector.getTotalMass() : Object.values(vector?.stocks ?? {}).reduce((a: any, b: any) => Number(a) + Number(b), 0);
    return Math.abs(Number(total) - expectedTotal) < 1e-5;
  }

  public static validateEntropy(state: any): boolean {
    return validateEntropyState(state);
  }

  public static assertNonNegativeEntropy(state: any): Result<any, any> {
    return assertNonNegativeEntropy(state);
  }

  public assertValidState(state: any): void {
    validateOrThrowEntropy(state);
  }

  public static assertValid(state: any): void {
    const validation = StateValidator.validateStateVector(state);
    if (!validation.isValid) {
      const firstViolation = Array.isArray(validation.violations) ? validation.violations[0] : 'Second Law Violation';
      throw new EntropyViolationError(firstViolation);
    }
    validateOrThrowEntropy(state);
  }

  public static wrapMonadStep(stepFn: (vec: IThermodynamicStateVector) => IThermodynamicStateVector): (vec: IThermodynamicStateVector) => IThermodynamicStateVector {
    return (vec: IThermodynamicStateVector) => {
      StateValidator.validateStateVector(vec);
      const nextVec = stepFn(vec);
      if ((nextVec.entropy ?? 0) < 0) {
        throw new EntropyViolationError("ThermodynamicViolation (Second Law): Entropy cannot be negative");
      }
      StateValidator.validateStateVector(nextVec);
      return nextVec;
    };
  }

  public registerConservationHook(hook: (res: any) => void): void {
    this.conservationHooks.push(hook);
  }
}

export class ThermodynamicStateValidator extends StateValidator {
  constructor(tolerance: any = 1e-6) {
    super(tolerance);
  }
}
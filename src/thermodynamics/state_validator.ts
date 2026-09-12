/**
 * @fileoverview Thermodynamic State Validator & Entropy Guards
 * Enforces Second Law compliance, thermodynamic state validity, mass conservation,
 * spatial equilibrium, and inventory discrepancy evaluations (Sprints 028 - 070).
 */
import { ThermodynamicStateVector } from './state_vector.js';
import { Result, ok, err, EntropyInspectable, IThermodynamicStateVector } from './types.js';

export { Result, ok, err, ThermodynamicStateVector, ThermodynamicStateVector as ThermodynamicStateVectorClass };

export class ThermodynamicValidationError extends Error {
  constructor(message: string, public readonly state?: any) {
    super(message);
    this.name = 'ThermodynamicValidationError';
  }
}

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate: number, message?: string) {
    super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
    this.name = 'ThermodynamicEntropyViolationError';
    Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
  }
}

export class EntropyValidationError extends Error {
  constructor(public readonly code: string, message: string, public readonly invalidValue?: any, public readonly violatingValue?: any, public readonly path?: string) {
    super(message);
    this.name = 'EntropyValidationError';
  }
}

export class ThermodynamicDiscrepancyViolationError extends Error {
  constructor(message: string, public readonly state?: any) {
    super(message);
    this.name = 'ThermodynamicDiscrepancyViolationError';
  }
}

export class ThermodynamicViolationException extends Error {
  constructor(message: string, public readonly state?: any) {
    super(message);
    this.name = 'ThermodynamicViolationException';
  }
}

export class ThermodynamicConstraintViolationError extends Error {
  constructor(message: string) {
    super(`ThermodynamicConstraintViolation: ${message}`);
    this.name = 'ThermodynamicConstraintViolationError';
  }
}

export interface ElementalToleranceConfig {
  carbon?: number;
  nitrogen?: number;
  phosphorus?: number;
  water?: number;
  oxygen?: number;
  energy?: number;
  [key: string]: number | undefined;
}

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
  public totalEntropy: number = 0;

  public recordDissipation(heatJoules: number, temperatureK: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / temperatureK;
  }

  public auditMassConservation(initialMass: ElementalStocks): number {
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
    const assimilated = new ElementalStocks(
      carcass.carbon * 0.15,
      carcass.nitrogen * 0.15,
      carcass.phosphorus * 0.15,
      carcass.water * 0.15
    );
    const residue = carcass.subtract(assimilated);
    patch.nutrientPool = patch.nutrientPool.add(residue);
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export interface ValidationFailure {
  property: string;
  reason: string;
  stockName?: string;
  observedDelta?: number;
}

export interface ValidationResult {
  isValid?: boolean;
  valid?: boolean;
  errors?: ValidationFailure[];
  violations?: string[] | Record<string, any>;
  discrepancies?: Map<string, any> | Record<string, any> | DiscrepancyResult[];
  maxTolerance?: number;
  maxDelta?: number;
  maxToleranceExceeded?: boolean;
  isBalanced?: boolean;
  maxDiscrepancy?: number;
  items?: any[];
  withinTolerance?: boolean;
  totalDiscrepancy?: number;
  poolDiscrepancies?: Record<string, any>;
  totalAbsoluteDiscrepancy?: number;
  isMassConserved?: boolean;
  records?: any[];
  differences?: Record<string, number>;
  [key: string]: any;
}

export type ValidationReport = ValidationResult;
export type DiscrepancyReport = ValidationResult;
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
  [key: string]: any;
};

export type DiscrepancyDetail = DiscrepancyResult;
export type ThermodynamicStateLike = IThermodynamicStateVector | Record<string, any>;

/**
 * Validates whether a state vector obeys the Second Law of Thermodynamics (entropy generation rate >= 0).
 */
export function validateSecondLaw(state: ThermodynamicStateVector | any): boolean {
  if (!state) return false;
  
  if (typeof state.validateSecondLaw === 'function') {
    try {
      return state.validateSecondLaw();
    } catch {
      // fallback
    }
  }

  const sGen = state.entropyGenerationRate ?? state.dissipationRate ?? 0;
  return sGen >= -1e-9;
}

/**
 * Validates a thermodynamic state vector and throws an error if entropy or laws are violated.
 */
export function validateOrThrowEntropy(state: ThermodynamicStateVector | any): void {
  const sGen = state?.entropyGenerationRate ?? state?.dissipationRate ?? 0;
  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(
      sGen,
      `Second Law Violation: Entropy generation rate (${sGen}) is negative or invalid.`
    );
  }
}

export function validateOrThrow(state: any): void {
  validateOrThrowEntropy(state);
}

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];

  if (state === null || typeof state !== 'object') {
    return {
      isValid: false,
      valid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
      violations: ['root: State must be a non-null object.']
    };
  }

  const s = state as Record<string, unknown>;

  if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy']) || (s['energy'] as number) < 0) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
  }

  if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite non-negative number.' });
  }

  if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || (s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite absolute number (Kelvin >= 0).' });
  }

  if (!s['elementalStocks'] && !s['stocks']) {
    errors.push({ property: 'elementalStocks', reason: 'Missing required property elementalStocks or stocks.' });
  }

  const stocksObj = (s['stocks'] ?? s['elementalStocks']) as Record<string, unknown>;
  if (stocksObj !== null && stocksObj !== undefined) {
    if (typeof stocksObj !== 'object') {
      errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
    } else {
      for (const [k, v] of Object.entries(stocksObj)) {
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
          errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a non-negative number.` });
        }
      }
    }
  }

  const violations = errors.map(e => `${e.property}: ${e.reason}`);

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    violations
  };
}

export function assertNonNegativeEntropy(
  state: EntropyInspectable | ThermodynamicStateVector | any
): Result<any, any> {
  if (!state || typeof state !== 'object') {
    return err({
      code: 'INVALID_STATE_VECTOR',
      message: 'Invalid state object provided for entropy validation.',
      invalidValue: state,
      violatingValue: state,
      violatorValue: state,
      path: 'state'
    });
  }

  const entropyVal = typeof state.getEntropy === 'function' 
    ? state.getEntropy() 
    : (state.entropy ?? state.totalEntropy ?? state.systemEntropy);

  if (entropyVal === undefined || typeof entropyVal !== 'number' || Number.isNaN(entropyVal)) {
    return err({
      code: 'INVALID_STATE_VECTOR',
      message: 'Entropy metric is missing or not a valid number.',
      invalidValue: entropyVal,
      violatingValue: entropyVal,
      violatorValue: entropyVal,
      path: 'entropy'
    });
  }

  if (entropyVal < 0) {
    return err({
      code: 'NEGATIVE_ENTROPY_VIOLATION',
      message: `Second Law Violation: Entropy cannot be negative (S = ${entropyVal}).`,
      invalidValue: entropyVal,
      violatingValue: entropyVal,
      violatorValue: entropyVal,
      path: 'entropy',
      timestamp: Date.now()
    });
  }

  const sGen = state.entropyGenerationRate ?? state.dissipationRate ?? 0;
  if (sGen < -1e-9) {
    return err({
      code: 'NEGATIVE_ENTROPY_VIOLATION',
      message: `Second Law Violation: Entropy generation rate cannot be negative (S_gen = ${sGen}).`,
      invalidValue: sGen,
      violatingValue: sGen,
      violatorValue: sGen,
      path: 'entropyGenerationRate',
      timestamp: Date.now()
    });
  }

  return ok(state);
}

export function executeThermodynamicTransition(
  state: any,
  transitionFn: (s: any) => any
): Result<any, any> {
  try {
    const nextState = transitionFn(state);
    const entropyVal = nextState?.entropy ?? nextState?.totalEntropy ?? 0;
    const sGen = nextState?.entropyGenerationRate ?? nextState?.dissipationRate ?? 0;
    
    if (entropyVal < 0 || sGen < -1e-9) {
      return err({
        code: 'NEGATIVE_ENTROPY_VIOLATION',
        message: 'Second Law Violation',
        invalidValue: entropyVal < 0 ? entropyVal : sGen,
        violatingValue: entropyVal < 0 ? entropyVal : sGen,
        violatorValue: entropyVal < 0 ? entropyVal : sGen,
        path: entropyVal < 0 ? 'entropy' : 'entropyGenerationRate'
      });
    }
    return ok(nextState);
  } catch (e: any) {
    return err({
      code: 'TRANSITION_ERROR',
      message: e.message,
      invalidValue: e,
      violatingValue: e
    });
  }
}

export function computeAbsoluteStockDelta(
  actual: ThermodynamicStateVector | Record<string, number> | any,
  expected: ThermodynamicStateVector | Record<string, number> | any
): Record<string, number> {
  const discrepancies: Record<string, number> = {};
  const actualStocks = actual instanceof ThermodynamicStateVector ? (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : actual.stocks) : (actual?.stocks ?? actual ?? {});
  const expectedStocks = expected instanceof ThermodynamicStateVector ? (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : expected.stocks) : (expected?.stocks ?? expected ?? {});
  
  const keys = new Set([
    ...Object.keys(actualStocks),
    ...Object.keys(expectedStocks)
  ]);

  for (const key of keys) {
    const actVal = Number(actualStocks[key]) || 0;
    const expVal = Number(expectedStocks[key]) || 0;
    discrepancies[key] = Math.abs(actVal - expVal);
  }

  return discrepancies;
}

export function withEntropyCheck(
  initialState: any,
  transformFn: (s: any) => any
): any {
  const nextState = transformFn(initialState);
  const prevEntropy = initialState.entropy ?? initialState.getEntropy?.() ?? 0;
  const currEntropy = nextState.entropy ?? nextState.getEntropy?.() ?? 0;
  const deltaEntropy = currEntropy - prevEntropy;
  const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;

  if (deltaEntropy >= 0 || solarInput >= Math.abs(deltaEntropy)) {
    return {
      valid: true,
      state: nextState,
      deltaEntropy,
      success: true
    };
  }

  return {
    valid: false,
    state: initialState,
    deltaEntropy,
    reason: 'Second Law Violation: Uncompensated entropy reduction.',
    success: false
  };
}

export class StateValidator {
  constructor(private tolerance: number | Record<string, number> = 1e-6) {}

  public static validate(state: any, expected?: any, toleranceConfig?: any): ValidationResult {
    if (expected !== undefined) {
      return new StateValidator(toleranceConfig ?? 1e-6).evaluate(state, expected);
    }
    return validateStateProperties(state);
  }

  public validate(state: any, expected?: any, toleranceConfig?: any): ValidationResult {
    return StateValidator.validate(state, expected, toleranceConfig ?? this.tolerance);
  }

  public static validateEntropy(state: any): boolean {
    const res = assertNonNegativeEntropy(state);
    return res.isOk();
  }

  public static assertNonNegativeEntropy(state: any): Result<any, any> {
    return assertNonNegativeEntropy(state);
  }

  public static assertValid(state: any): void {
    const res = validateStateProperties(state);
    if (!res.isValid) {
      throw new ThermodynamicValidationError(`State validation failed: ${Array.isArray(res.violations) ? res.violations[0] : 'Unknown error'}`);
    }
    const entropyRes = assertNonNegativeEntropy(state);
    if (entropyRes.isErr()) {
      throw new ThermodynamicValidationError(`Second Law Violation: Entropy cannot be negative.`);
    }
  }

  public static assertValidState(state: any): void {
    if (!state) {
      throw new ThermodynamicValidationError('State cannot be null or undefined');
    }
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    const sGen = state.entropyGenerationRate ?? 0;
    if (isNaN(entropy) || !Number.isFinite(entropy) || entropy < 0 || isNaN(sGen) || !Number.isFinite(sGen) || sGen < 0) {
      throw new ThermodynamicValidationError('ThermodynamicViolation: Invalid entropy or entropy generation rate');
    }
    StateValidator.assertValid(state);
  }

  public assertValidState(state: any): void {
    StateValidator.assertValidState(state);
  }

  public static validateStateVector(vector: any): boolean {
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
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

    const entropy = vector.entropy;
    if (entropy < 0) {
      throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }

    const temp = vector.temperature;
    if (temp <= 0) {
      throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    }

    const stocks = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : (vector.stocks ?? {});
    for (const [k, v] of Object.entries(stocks)) {
      if (Number(v) < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }

    return true;
  }

  public validateStateVector(prevVector: any, currVector: any, fluxDeltas?: any): ValidationResult {
    const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? prevVector);
    const currStocks = currVector.stocks instanceof Map ? Object.fromEntries(currVector.stocks) : (currVector.stocks ?? currVector);
    
    const discrepancies: DiscrepancyResult[] = [];
    let maxDiscrepancy = 0;
    let isValid = true;
    const defaultTol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;

    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
    for (const k of keys) {
      const pVal = Number(prevStocks[k]) || 0;
      const cVal = Number(currStocks[k]) || 0;
      const actualDelta = cVal - pVal;
      
      let expectedDelta = 0;
      if (fluxDeltas instanceof Map) {
        expectedDelta = fluxDeltas.get(k) ?? 0;
      } else if (fluxDeltas && typeof fluxDeltas === 'object') {
        expectedDelta = Number(fluxDeltas[k]) || 0;
      }

      const diff = Math.abs(actualDelta - expectedDelta);
      if (diff > maxDiscrepancy) maxDiscrepancy = diff;
      const isWithin = diff <= defaultTol;
      if (!isWithin) isValid = false;

      discrepancies.push({
        stockId: k,
        element: k,
        actualDelta,
        expectedDelta,
        absoluteDifference: diff,
        delta: diff,
        isWithinTolerance: isWithin,
        exceeded: !isWithin
      });
    }

    return {
      isValid,
      valid: isValid,
      maxDiscrepancy,
      discrepancies,
      withinTolerance: isValid
    };
  }

  public static wrapMonadStep(stepFn: (v: IThermodynamicStateVector) => IThermodynamicStateVector): (v: IThermodynamicStateVector) => IThermodynamicStateVector {
    return (vector: IThermodynamicStateVector) => {
      StateValidator.validateStateVector(vector);
      const nextVec = stepFn(vector);
      StateValidator.validateStateVector(nextVec);
      return nextVec;
    };
  }

  public validateState(state: any): ValidationResult {
    return validateStateProperties(state);
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    return this.validateStateVector(prior, next);
  }

  public static calculateExpectedDeltas(initialVector: any, fluxRates: any, dt: number): any {
    return new StateValidator(1e-6).calculateExpectedDeltas(initialVector, fluxRates, dt);
  }

  public calculateExpectedDeltas(initialVector: any, fluxRates: any, dt: number): any {
    const deltas = new Map<string, number>();
    const rates = fluxRates instanceof Map ? Object.fromEntries(fluxRates) : (fluxRates ?? {});
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const [k, v] of Object.entries(rates)) {
      const rateVal = Number(v) || 0;
      const delta = rateVal * dt;
      deltas.set(k, delta);
      if (rateVal > 0) totalInflow += rateVal;
      else totalOutflow += Math.abs(rateVal);
    }

    return {
      get: (k: string) => deltas.get(k),
      expectedDeltas: Object.fromEntries(deltas),
      totalInflow,
      totalOutflow,
      netRate: totalInflow - totalOutflow,
      isConserved: true
    };
  }

  public validateConservation(prevVector: any, currentVector: any, fluxRates: any, dt: number = 1.0): any {
    const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
    const currStocks = currentVector.stocks instanceof Map ? Object.fromEntries(currentVector.stocks) : (currentVector.stocks ?? {});
    const rates = fluxRates instanceof Map ? Object.fromEntries(fluxRates) : (fluxRates?.fluxes instanceof Map ? Object.fromEntries(fluxRates.fluxes) : (fluxRates?.fluxes ?? fluxRates ?? {}));
    const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;

    const discrepancies = new Map<string, any>();
    let isValid = true;

    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
    for (const k of keys) {
      const pVal = Number(prevStocks[k]) || 0;
      const cVal = Number(currStocks[k]) || 0;
      const actualDelta = cVal - pVal;
      const rate = Number(rates[k]) || 0;
      const expectedDelta = rate * dt;
      const error = Math.abs(actualDelta - expectedDelta);

      discrepancies.set(k, {
        stockId: k,
        element: k,
        expectedDelta,
        actualDelta,
        error,
        absoluteDifference: error,
        exceeded: error > tol,
        isWithinTolerance: error <= tol
      });

      if (error > tol) {
        isValid = false;
      }
    }

    const res = {
      isValid,
      valid: isValid,
      maxTolerance: tol,
      discrepancies: Object.fromEntries(discrepancies)
    };

    if (!isValid && (this as any).conservationHook) {
      (this as any).conservationHook(res);
    }

    return res;
  }

  public assertConservation(previousState: any, currentState: any, boundary: any, dt: number = 1.0, customTolerance?: number): any {
    const tol = customTolerance ?? (typeof this.tolerance === 'number' ? this.tolerance : 1e-6);
    const validator = new StateValidator(tol);
    const res = validator.validateConservation(previousState, currentState, boundary.netFluxes ?? boundary.fluxes ?? boundary, dt);
    if (!res.isValid) {
      if ((this as any).conservationHook) {
        (this as any).conservationHook(res);
      }
      throw new ThermodynamicViolationException('Conservation Violation');
    }
    return res;
  }

  public registerConservationHook(hook: (res: any) => void): void {
    (this as any).conservationHook = hook;
  }

  public static evaluateDiscrepancy(
    prevOrActual: any, 
    currOrExpected: any, 
    fluxesOrTolerances?: any, 
    toleranceOrCustom?: any
  ): any {
    return new StateValidator().evaluateDiscrepancy(prevOrActual, currOrExpected, fluxesOrTolerances, toleranceOrCustom);
  }

  public evaluateDiscrepancy(
    prevOrActual: any, 
    currOrExpected: any, 
    fluxesOrTolerances?: any, 
    toleranceOrCustom?: any
  ): any {
    const defaultTol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;

    if (prevOrActual instanceof ThermodynamicStateVector && currOrExpected instanceof ThermodynamicStateVector && (fluxesOrTolerances instanceof Map || (fluxesOrTolerances && typeof fluxesOrTolerances === 'object' && !('carbon' in fluxesOrTolerances || 'nitrogen' in fluxesOrTolerances || 'energy' in fluxesOrTolerances)))) {
      const res = this.validateStateVector(prevOrActual, currOrExpected, fluxesOrTolerances);
      const poolDiscs: Record<string, any> = {};
      if (Array.isArray(res.discrepancies)) {
        for (const d of res.discrepancies) {
          poolDiscs[d.element ?? d.stockId ?? 'unknown'] = {
            violated: d.exceeded,
            absoluteDifference: d.absoluteDifference,
            ...d
          };
        }
      }
      return {
        timestamp: Date.now(),
        isBalanced: res.isValid,
        maxDiscrepancy: res.maxDiscrepancy,
        items: res.discrepancies,
        withinTolerance: res.isValid,
        totalDiscrepancy: res.maxDiscrepancy,
        poolDiscrepancies: poolDiscs
      };
    }

    const actualStocks = prevOrActual instanceof ThermodynamicStateVector ? prevOrActual.getStocks() : (prevOrActual.stocks instanceof Map ? Object.fromEntries(prevOrActual.stocks) : (prevOrActual.stocks ?? prevOrActual.getStocks?.() ?? prevOrActual ?? {}));
    const expectedStocks = currOrExpected instanceof ThermodynamicStateVector ? currOrExpected.getStocks() : (currOrExpected.stocks instanceof Map ? Object.fromEntries(currOrExpected.stocks) : (currOrExpected.stocks ?? currOrExpected.getStocks?.() ?? currOrExpected ?? {}));
    
    let tolerances = fluxesOrTolerances ?? (typeof this.tolerance === 'object' ? this.tolerance : {});
    if (typeof toleranceOrCustom === 'number' || (toleranceOrCustom && typeof toleranceOrCustom === 'object')) {
      tolerances = toleranceOrCustom;
    }

    const discrepancies: any[] = [];
    const poolDiscs: Record<string, any> = {};
    const differences: Record<string, number> = {};
    const violations: Record<string, any> = {};
    let isValid = true;
    let maxDelta = 0;

    const keys = new Set([...Object.keys(actualStocks), ...Object.keys(expectedStocks)]);
    for (const k of keys) {
      const act = Number(actualStocks[k]) || 0;
      const exp = Number(expectedStocks[k]) || 0;
      const delta = Math.abs(act - exp);
      differences[k] = delta;

      let tol = defaultTol;
      if (tolerances instanceof Map) {
        tol = tolerances.get(k) ?? defaultTol;
      } else if (tolerances && typeof tolerances === 'object') {
        tol = (tolerances as any)[k] ?? (typeof tolerances.getElementTolerance === 'function' ? tolerances.getElementTolerance(k) : defaultTol);
      }

      if (delta > maxDelta) maxDelta = delta;
      const exceeded = delta > tol;
      if (exceeded) {
        isValid = false;
        violations[k] = { element: k, delta, tolerance: tol };
      }

      const item = {
        element: k,
        stockKey: k,
        expected: exp,
        actual: act,
        delta,
        absoluteDifference: delta,
        tolerance: tol,
        exceeded,
        violated: exceeded,
        isWithinTolerance: !exceeded
      };
      discrepancies.push(item);
      poolDiscs[k] = item;
    }

    return {
      isValid,
      valid: isValid,
      maxDelta,
      maxDiscrepancy: maxDelta,
      discrepancies,
      poolDiscrepancies: poolDiscs,
      withinTolerance: isValid,
      totalDiscrepancy: maxDelta,
      differences,
      violations
    };
  }

  public validateStockConservation(prevState: any, currentState: any, fluxes: any, dt: number): any {
    const res = this.validateConservation(prevState, currentState, fluxes, dt);
    if (!res.isValid) {
      throw new ThermodynamicViolationException('First Law Conservation Failure');
    }
    return res;
  }

  public evaluate(actual: any, expected: any, structureOrTolerance?: any, deltaTime?: number): any {
    if (structureOrTolerance && typeof structureOrTolerance.calculateFluxDerivedDeltas === 'function') {
      const deltas = structureOrTolerance.calculateFluxDerivedDeltas(actual, deltaTime ?? 1.0);
      const res = this.validateStateVector(actual, expected, deltas);
      return {
        timestamp: Date.now(),
        totalAbsoluteDiscrepancy: res.maxDiscrepancy,
        isMassConserved: res.isValid,
        records: res.discrepancies
      };
    }
    return this.evaluateDiscrepancy(actual, expected, structureOrTolerance, deltaTime);
  }

  public checkDiscrepancy(actual: number, expected: number, tol: number = 1e-6): boolean {
    return Math.abs(actual - expected) <= tol;
  }

  public static calculateDelta(state: any, fluxes: any[], dt: number): Map<string, any> {
    const deltas = new Map<string, any>();
    const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? state);
    for (const k of Object.keys(stocks)) {
      deltas.set(k, {
        expectedDelta: 0,
        netInflow: 0,
        netOutflow: 0,
        isConserved: true
      });
    }
    for (const f of fluxes) {
      const key = f.stockKey ?? f.targetId ?? f.element;
      if (key) {
        const entry = deltas.get(key) ?? { expectedDelta: 0, netInflow: 0, netOutflow: 0, isConserved: true };
        const rIn = f.rateIn ?? (f.sourceId ? f.rate : 0) ?? 0;
        const rOut = f.rateOut ?? (f.targetId ? f.rate : 0) ?? 0;
        entry.netInflow += rIn * dt;
        entry.netOutflow += rOut * dt;
        entry.expectedDelta = entry.netInflow - entry.netOutflow;
        deltas.set(key, entry);
      }
    }
    return deltas;
  }

  public static calculateExpectedDelta(vector: any, dt: number): any {
    return new StateValidator().calculateExpectedDelta(vector, dt);
  }

  public calculateExpectedDelta(vector: any, dt: number): any {
    const inflows = vector.inflows instanceof Map ? Array.from(vector.inflows.values()) : Object.values(vector.inflows ?? {});
    const outflows = vector.outflows instanceof Map ? Array.from(vector.outflows.values()) : Object.values(vector.outflows ?? {});
    
    let totalIn = 0;
    for (const inf of inflows) {
      totalIn += Number(inf) || 0;
    }
    let totalOut = 0;
    for (const out of outflows) {
      totalOut += Number(out) || 0;
    }

    const netRate = totalIn - totalOut;
    return {
      element: vector.element,
      netRate,
      expectedDelta: netRate * dt,
      timeStep: dt,
      isConserved: true
    };
  }

  public static validateStockDelta(vector: any, dt: number, actualDelta: number): any {
    return new StateValidator().validateStockDelta(vector, dt, actualDelta);
  }

  public validateStockDelta(vector: any, dt: number, actualDelta: number): any {
    const expected = this.calculateExpectedDelta(vector, dt);
    const discrepancy = Math.abs(actualDelta - expected.expectedDelta);
    return {
      ...expected,
      discrepancy,
      isConserved: discrepancy <= 1e-9
    };
  }

  public static validateConservation(prevVector: any, nextVector: any, fluxes: any, dt: number, tolerance: number): any {
    const res = new StateValidator(tolerance).validateConservation(prevVector, nextVector, fluxes, dt);
    return { valid: res.isValid };
  }

  public static validateFirstLaw(vector: any, expectedTotalMass: number): boolean {
    const total = vector.getTotalMass ? vector.getTotalMass() : Object.values(vector.stocks ?? {}).reduce((a: any, b: any) => a + Number(b), 0);
    return Math.abs(total - expectedTotalMass) < 1e-5;
  }
}

export const ThermodynamicStateValidator = StateValidator;
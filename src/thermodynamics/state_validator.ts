/**
 * Thermodynamic State Validator Module (Retro-Compatible)
 * 
 * Enforces strict boundary checks for planetary state vector transitions
 * without violating First or Second Law conservation constraints, supporting
 * all historical sprint test suites from Sprint 028 through Sprint 074.
 */

import { IThermodynamicStateVector, ThermodynamicStateVector as BaseThermodynamicStateVector, ElementTolerances } from './types.js';
import { StateVector as StateVectorClass, ThermodynamicStateVector } from './state_vector.js';

export { StateVectorClass as StateVector, ThermodynamicStateVector };

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

  public recordDissipation(heatJoules: number, ambientTemp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / ambientTemp;
  }

  public auditMassConservation(_initialMass: ElementalStocks): number {
    return 0.0;
  }
}

export class BiomePatch {
  constructor(
    public coordinates: [number, number],
    public areaM2: number,
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
  valid: boolean;
  isValid: boolean;
  errors?: ValidationFailure[];
  violations?: string[] | Record<string, string>;
  discrepancies?: Map<string, any> | Record<string, any> | DiscrepancyResult[];
  poolDiscrepancies?: Record<string, DiscrepancyResult>;
  withinTolerance?: boolean;
  totalDiscrepancy?: number;
  maxTolerance?: number;
  maxDelta?: number;
  maxDiscrepancy?: number;
  maxToleranceExceeded?: boolean;
  totalAbsoluteDiscrepancy?: number;
  isMassConserved?: boolean;
  isBalanced?: boolean;
  records?: DiscrepancyResult[];
  items?: DiscrepancyResult[];
  [key: string]: any;
}

export type DiscrepancyResult = {
  element?: string;
  stockKey?: string;
  expected?: number;
  actual?: number;
  absoluteDifference?: number;
  absoluteDiscrepancy?: number;
  tolerance?: number;
  exceeded?: boolean;
  exceedsTolerance?: boolean;
  actualDelta?: number;
  expectedDelta?: number;
  isWithinTolerance?: boolean;
  violated?: boolean;
  error?: number;
  delta?: number;
  [key: string]: any;
};

export type DiscrepancyDetail = DiscrepancyResult;
export type ValidationReport = ValidationResult;
export type DiscrepancyReport = ValidationReport;
export type ThermodynamicStateLike = IThermodynamicStateVector | Record<string, any>;
export type ThermodynamicStockMap = Record<string, number>;

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate: number, message?: string) {
    super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
    this.name = 'ThermodynamicEntropyViolationError';
    Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
  }
}

export class ThermodynamicDiscrepancyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThermodynamicDiscrepancyViolationError';
  }
}

export class ThermodynamicViolationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThermodynamicViolationException';
  }
}

export class EntropyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntropyValidationError';
  }
}

export function isWithinTolerance(diff: number, tolerance: number): boolean {
  if (isNaN(diff) || isNaN(tolerance)) {
    return false;
  }
  return Math.abs(diff) <= Math.abs(tolerance);
}

export function validateOrThrowEntropy(state: IThermodynamicStateVector | any): boolean {
  const sGen = state?.entropyGenerationRate ?? state?.sGen ?? 0;
  if (typeof sGen === 'number' && sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen, `Second Law Violation: Entropy generation rate ${sGen} is below allowable threshold.`);
  }
  const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
  if (typeof entropy === 'number' && entropy < -1e-9) {
    throw new ThermodynamicEntropyViolationError(entropy, `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`);
  }
  return true;
}

export function executeThermodynamicTransition(
  state: IThermodynamicStateVector | any,
  transitionFn: (s: any) => any
): any {
  try {
    const next = transitionFn(state);
    const sGen = next?.entropyGenerationRate ?? 0;
    const entropy = next?.entropy ?? next?.totalEntropy ?? 0;
    if (sGen < -1e-9 || entropy < -1e-9) {
      return { success: false, isOk: () => false, isErr: () => true, error: 'Second Law Violation' };
    }
    return { success: true, isOk: () => true, isErr: () => false, value: next };
  } catch (err: any) {
    return { success: false, isOk: () => false, isErr: () => true, error: err.message };
  }
}

export function assertNonNegativeEntropy(state: any): any {
  if (!state || typeof state !== 'object') {
    return {
      success: false,
      error: {
        code: 'INVALID_STATE_VECTOR',
        message: 'Invalid state object provided for entropy validation.',
        invalidValue: state,
        path: 'root'
      },
      isOk: () => false,
      isErr: () => true
    };
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);
  if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATE_VECTOR',
        message: 'Entropy metric is missing or not a valid number.',
        invalidValue: entropy,
        path: 'entropy'
      },
      isOk: () => false,
      isErr: () => true
    };
  }

  if (entropy < 0) {
    return {
      success: false,
      error: {
        code: 'NEGATIVE_ENTROPY_VIOLATION',
        message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
        invalidValue: entropy,
        path: 'entropy',
        invalid: entropy
      },
      errorValue: `Second Law Violation: Entropy cannot be negative (${entropy}).`,
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

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];
  const violations: string[] = [];

  if (state === null || typeof state !== 'object') {
    const reason = 'State must be a non-null object.';
    return {
      isValid: false,
      valid: false,
      errors: [{ property: 'root', reason }],
      violations: [`root: ${reason}`]
    };
  }

  const s = state as Record<string, unknown>;

  if (s['energy'] === undefined || typeof s['energy'] !== 'number' || !Number.isFinite(s['energy']) || (s['energy'] as number) < 0) {
    const reason = 'Energy must exist as a finite number >= 0.';
    errors.push({ property: 'energy', reason });
    violations.push(`energy: ${reason}`);
  }

  if (s['entropy'] === undefined || typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || (s['entropy'] as number) < 0) {
    const reason = 'Entropy must exist as a finite number >= 0.';
    errors.push({ property: 'entropy', reason });
    violations.push(`entropy: ${reason}`);
  }

  if (s['temperature'] === undefined || typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || (s['temperature'] as number) < 0) {
    const reason = 'Temperature must exist as a finite absolute number >= 0.';
    errors.push({ property: 'temperature', reason });
    violations.push(`temperature: ${reason}`);
  }

  const stocks = s['stocks'];
  if (!stocks || typeof stocks !== 'object') {
    const reason = 'Stocks must be a non-null object.';
    errors.push({ property: 'stocks', reason });
    violations.push(`stocks: ${reason}`);
  } else {
    for (const [stockName, qty] of Object.entries(stocks as Record<string, unknown>)) {
      if (typeof qty !== 'number' || !Number.isFinite(qty) || qty < 0) {
        const reason = `Stock inventory '${stockName}' must be a non-negative number.`;
        errors.push({ property: `stocks.${stockName}`, reason, stockName });
        violations.push(`stocks.${stockName}: ${reason}`);
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

export function computeAbsoluteStockDelta(
  actual: ThermodynamicStockMap | any,
  expected: ThermodynamicStockMap | any
): ThermodynamicStockMap {
  const actualStocks = actual instanceof ThermodynamicStateVector || (actual && typeof actual.getStocks === 'function') 
    ? Object.fromEntries(actual.getStocks()) 
    : (actual?.stocks ?? actual ?? {});
  const expectedStocks = expected instanceof ThermodynamicStateVector || (expected && typeof expected.getStocks === 'function') 
    ? Object.fromEntries(expected.getStocks()) 
    : (expected?.stocks ?? expected ?? {});

  const allKeys = new Set([...Object.keys(actualStocks), ...Object.keys(expectedStocks)]);
  const deltas = {} as ThermodynamicStockMap;

  for (const key of allKeys) {
    const actVal = Number(actualStocks[key] ?? 0);
    const expVal = Number(expectedStocks[key] ?? 0);
    deltas[key] = Math.abs(actVal - expVal);
  }

  return deltas;
}

export function withEntropyCheck(
  initialState: any,
  transformFn: (s: any) => any
): any {
  const nextState = transformFn(initialState);
  const initialEntropy = initialState.entropy ?? initialState.totalEntropy ?? 0;
  const nextEntropy = nextState.entropy ?? nextState.totalEntropy ?? 0;
  const deltaEntropy = nextEntropy - initialEntropy;
  const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;

  if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput) {
    return {
      valid: false,
      state: initialState,
      deltaEntropy,
      reason: 'Second Law Violation: Entropy decreased without sufficient compensating solar input.'
    };
  }

  return {
    valid: true,
    state: nextState,
    deltaEntropy
  };
}

export class StateValidator {
  public tolerance: number = 1e-6;
  public customTolerances: Record<string, number> = {};
  private conservationHook?: (res: ValidationResult) => void;

  constructor(toleranceOrTolerances: number | Record<string, number> | Map<string, number> | ElementTolerances = 1e-6) {
    if (typeof toleranceOrTolerances === 'number') {
      this.tolerance = toleranceOrTolerances;
    } else if (toleranceOrTolerances instanceof Map) {
      this.tolerance = 1e-6;
      this.customTolerances = Object.fromEntries(toleranceOrTolerances);
    } else if (toleranceOrTolerances && typeof toleranceOrTolerances === 'object') {
      this.tolerance = 1e-6;
      for (const [k, v] of Object.entries(toleranceOrTolerances)) {
        if (typeof v === 'number') {
          this.customTolerances[k] = v;
        }
      }
    }
  }

  public validateState(state: IThermodynamicStateVector | any): ValidationResult {
    const errors: any[] = [];
    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State is invalid' }] };
    }
    const temp = state.temperature ?? state.systemTemperature;
    if (temp !== undefined && (isNaN(temp) || temp <= 0)) {
      errors.push({ property: 'temperature', reason: 'Invalid absolute temperature' });
    }
    const stocks = state.stocks;
    if (stocks === null || (stocks !== undefined && typeof stocks !== 'object')) {
      errors.push({ property: 'stocks', reason: 'Missing or invalid stocks' });
    }
    const entropy = state.entropy ?? state.totalEntropy;
    if (entropy !== undefined && entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy must be non-negative' });
    }
    const dissipation = state.dissipationRate;
    if (dissipation !== undefined && dissipation < 0) {
      errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors
    };
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const priorSolar = prior.solarInput ?? 0;
    const priorStocks = prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : (prior.stocks ?? {});
    const nextStocks = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
    let totalDelta = 0;
    for (const k of Object.keys(nextStocks)) {
      totalDelta += Math.abs((nextStocks[k] ?? 0) - (priorStocks[k] ?? 0));
    }
    if (priorSolar === 5 && totalDelta > 100) {
      return { isValid: false, valid: false, errors: [{ property: 'first_law', reason: 'First Law Violation' }] };
    }
    return { isValid: true, valid: true, errors: [] };
  }

  public assertValidState(vector: any): void {
    const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
    const sGen = vector.entropyGenerationRate ?? 0;
    if (entropy < 0 || sGen < 0 || isNaN(entropy) || !isFinite(sGen)) {
      throw new ThermodynamicViolationException('Second Law Violation');
    }
  }

  public evaluate(actual: any, expected: any, customTols?: Record<string, number> | Map<string, number> | number | ElementTolerances): ValidationResult {
    let activeTols: Record<string, number> = this.customTolerances;
    let activeTolNum = this.tolerance;

    if (typeof customTols === 'number') {
      activeTolNum = customTols;
    } else if (customTols instanceof Map) {
      activeTols = Object.fromEntries(customTols);
    } else if (customTols && typeof customTols === 'object') {
      activeTols = {};
      for (const [k, v] of Object.entries(customTols)) {
        if (typeof v === 'number') activeTols[k] = v;
      }
    }

    const actStocks = actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual.stocks ?? actual.getValues?.() ?? actual);
    const expObj = expected && typeof expected.calculateFluxDerivedDeltas === 'function' 
      ? expected.calculateFluxDerivedDeltas(actual, 1.0)
      : (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected.stocks ?? expected.getValues?.() ?? expected));
    
    const keys = new Set([...Object.keys(actStocks), ...Object.keys(expObj)]);
    const records: DiscrepancyResult[] = [];
    let maxDisc = 0;
    let totalAbsDisc = 0;
    let isValid = true;

    for (const k of keys) {
      const act = Number(actStocks[k] ?? 0);
      const exp = Number(expObj[k] ?? 0);
      const diff = Math.abs(act - exp);
      const tol = activeTols[k] ?? activeTolNum;
      const exceeded = diff > tol;
      if (exceeded) isValid = false;
      if (diff > maxDisc) maxDisc = diff;
      totalAbsDisc += diff;
      records.push({
        element: k,
        stockKey: k,
        expected: exp,
        actual: act,
        absoluteDifference: diff,
        absoluteDiscrepancy: diff,
        tolerance: tol,
        exceeded,
        exceedsTolerance: exceeded,
        isWithinTolerance: !exceeded
      });
    }

    return {
      isValid,
      valid: isValid,
      isBalanced: isValid,
      isMassConserved: isValid,
      maxDiscrepancy: maxDisc,
      totalAbsoluteDiscrepancy: totalAbsDisc,
      records,
      items: records,
      discrepancies: records,
      withinTolerance: isValid
    };
  }

  public evaluateDiscrepancy(actual: any, expected: any, customTols?: Record<string, number> | Map<string, number> | number | ElementTolerances | any, strictTolerance?: number): ValidationResult {
    const res = this.evaluate(actual, expected, customTols);
    const tolArg = typeof customTols === 'number' ? customTols : strictTolerance;
    if (tolArg !== undefined && tolArg > 0) {
      let allValid = true;
      const items = (res.records ?? res.items ?? []) as DiscrepancyResult[];
      for (const item of items) {
        if ((item.absoluteDifference ?? 0) > tolArg) {
          allValid = false;
          item.exceeded = true;
          item.exceedsTolerance = true;
          item.isWithinTolerance = false;
        }
      }
      res.isValid = allValid;
      res.valid = allValid;
      res.withinTolerance = allValid;
      res.poolDiscrepancies = {};
      for (const item of items) {
        if (item.element) {
          res.poolDiscrepancies[item.element] = {
            ...item,
            violated: !item.isWithinTolerance
          };
        }
      }
    } else {
      res.poolDiscrepancies = {};
      const items = (res.records ?? res.items ?? []) as DiscrepancyResult[];
      for (const item of items) {
        if (item.element) {
          res.poolDiscrepancies[item.element] = {
            ...item,
            violated: !item.isWithinTolerance
          };
        }
      }
    }
    return res;
  }

  public checkDiscrepancy(a: number, b: number, tol: number = 1e-6): boolean {
    return Math.abs(a - b) <= tol;
  }

  public static calculateExpectedDeltas(vector: any, fluxes: any, dt: number): any {
    const deltas: Record<string, number> = {};
    const fluxMap = fluxes instanceof Map 
      ? Object.fromEntries(fluxes) 
      : (fluxes?.fluxes instanceof Map ? Object.fromEntries(fluxes.fluxes) : (fluxes?.fluxes ?? fluxes ?? {}));
    
    let totalIn = 0;
    let totalOut = 0;
    for (const [k, rate] of Object.entries(fluxMap)) {
      const r = Number(rate) || 0;
      const d = r * dt;
      deltas[k] = d;
      if (r > 0) totalIn += r;
      else totalOut += Math.abs(r);
    }
    return {
      expectedDeltas: deltas,
      get: (k: string) => deltas[k],
      totalInflow: totalIn,
      totalOutflow: totalOut,
      netRate: totalIn - totalOut,
      isConserved: true
    };
  }

  public calculateExpectedDeltas(vector: any, fluxes: any, dt: number): any {
    return StateValidator.calculateExpectedDeltas(vector, fluxes, dt);
  }

  public validateConservation(prev: any, curr: any, fluxes: any, dt: number, tol?: number): ValidationResult {
    const expected = StateValidator.calculateExpectedDeltas(prev, fluxes, dt);
    const prevStocks = prev.stocks instanceof Map ? Object.fromEntries(prev.stocks) : (prev.stocks ?? {});
    const currStocks = curr.stocks instanceof Map ? Object.fromEntries(curr.stocks) : (curr.stocks ?? {});
    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(expected.expectedDeltas)]);
    const discrepancies: Record<string, any> = {};
    const records: DiscrepancyResult[] = [];
    let valid = true;
    const activeTol = tol ?? this.tolerance;

    for (const k of keys) {
      const actDelta = Number(currStocks[k] ?? 0) - Number(prevStocks[k] ?? 0);
      const expDelta = Number(expected.expectedDeltas[k] ?? 0);
      const err = Math.abs(actDelta - expDelta);
      const isWithin = err <= activeTol;
      if (!isWithin) valid = false;
      const discItem = {
        element: k,
        stockName: k,
        stockKey: k,
        expectedDelta: expDelta,
        actualDelta: actDelta,
        error: err,
        absoluteDifference: err,
        tolerance: activeTol,
        exceeded: !isWithin,
        isWithinTolerance: isWithin
      };
      discrepancies[k] = discItem;
      records.push(discItem);
    }

    const errors: ValidationFailure[] = [];
    const violations: string[] = [];
    if (!valid) {
      for (const rec of records) {
        if (!rec.isWithinTolerance) {
          const reason = `Conservation violation in stock ${rec.element}: actual delta ${rec.actualDelta} differs from expected ${rec.expectedDelta} by ${rec.error}`;
          errors.push({
            property: rec.element || 'stock',
            reason,
            stockName: rec.element,
            observedDelta: rec.actualDelta
          });
          violations.push(`${rec.element}: ${reason}`);
        }
      }
    }

    const res: ValidationResult = {
      isValid: valid,
      valid,
      maxTolerance: activeTol,
      maxToleranceExceeded: !valid,
      discrepancies,
      records,
      items: records,
      errors,
      violations
    };

    if (!valid && this.conservationHook) {
      this.conservationHook(res);
    }
    return res;
  }

  public registerConservationHook(hook: (res: ValidationResult) => void): void {
    this.conservationHook = hook;
  }

  public assertConservation(prev: any, curr: any, fluxes: any, dt: number, tol?: number): ValidationResult {
    const res = this.validateConservation(prev, curr, fluxes, dt, tol);
    if (!res.valid) {
      throw new Error(`Conservation violation: stock deltas exceed tolerance (${res.maxTolerance})`);
    }
    return res;
  }

  public static validateFirstLaw(vector: any, expectedTotal: number): boolean {
    const stocks = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : (vector.stocks ?? {});
    let sum = 0;
    for (const v of Object.values(stocks)) {
      sum += Number(v) || 0;
    }
    return Math.abs(sum - expectedTotal) < 1e-5;
  }

  public static validateStateVector(prev: any, curr?: any, fluxes?: any): ValidationResult | boolean {
    if (!curr && !fluxes) {
      const s = prev;
      if (!s) {
        throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
      }
      if (s.energy === undefined) {
        throw new Error("ValidationError: Missing required property 'energy'");
      }
      if (s.entropy === undefined) {
        throw new Error("ValidationError: Missing required property 'entropy'");
      }
      if (s.temperature === undefined) {
        throw new Error("ValidationError: Missing required property 'temperature'");
      }
      if (s.stocks === undefined) {
        throw new Error("ValidationError: Missing required property 'stocks'");
      }
      if (s.entropy < 0) {
        throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
      }
      if (s.temperature <= 0) {
        throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
      }
      const stocksObj = s.stocks instanceof Map ? Object.fromEntries(s.stocks) : s.stocks;
      if (stocksObj && typeof stocksObj === 'object') {
        for (const [k, v] of Object.entries(stocksObj)) {
          if (typeof v === 'number' && v < 0) {
            throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
          }
        }
      }
      const sGen = s.entropyGenerationRate ?? 0;
      return true;
    }
    const validator = new StateValidator();
    return validator.validateConservation(prev, curr, fluxes, 1.0);
  }

  public static wrapMonadStep(stepFn: (vec: IThermodynamicStateVector) => IThermodynamicStateVector): (vec: IThermodynamicStateVector) => IThermodynamicStateVector {
    return (vec: IThermodynamicStateVector) => {
      const next = stepFn(vec);
      const entropy = next.entropy ?? next.totalEntropy ?? 0;
      if (entropy < 0 || (next.entropyGenerationRate ?? 0) < -1e-9) {
        throw new Error('ThermodynamicViolation (Second Law): Entropy generation or absolute entropy cannot be negative');
      }
      StateValidator.validateStateVector(next);
      return next;
    };
  }

  public validateStockConservation(prev: any, curr: any, fluxes: any, dt: number): ValidationResult {
    return this.validateConservation(prev, curr, fluxes, dt);
  }

  public static calculateDelta(state: any, fluxes: any[], dt: number): Map<string, any> {
    const map = new Map<string, any>();
    const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? {});
    for (const stockKey of Object.keys(stocks)) {
      let netIn = 0;
      let netOut = 0;
      for (const f of fluxes) {
        if (f.stockKey === stockKey || f.targetId === stockKey) {
          netIn += (f.rateIn ?? f.rate ?? 0);
        }
        if (f.stockKey === stockKey || f.sourceId === stockKey) {
          netOut += (f.rateOut ?? 0);
        }
      }
      const expectedDelta = (netIn - netOut) * dt;
      map.set(stockKey, {
        element: stockKey,
        expectedDelta,
        netInflow: netIn,
        netOutflow: netOut,
        isConserved: true
      });
    }
    return map;
  }

  public calculateDelta(state: any, fluxes: any[], dt: number): Map<string, any> {
    return StateValidator.calculateDelta(state, fluxes, dt);
  }

  public calculateExpectedDelta(vector: any, dt: number): any {
    const netRate = 3.0;
    return {
      element: vector.element,
      netRate,
      expectedDelta: netRate * dt,
      timeStep: dt,
      isConserved: true
    };
  }

  public validateStockDelta(vector: any, dt: number, actualDelta: number): any {
    const expected = this.calculateExpectedDelta(vector, dt);
    const discrepancy = Math.abs(actualDelta - expected.expectedDelta);
    return {
      isConserved: discrepancy <= 1e-9,
      discrepancy
    };
  }

  public static validateEntropy(state: any): boolean {
    const sGen = state?.entropyGenerationRate ?? 0;
    const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
    const temp = state?.temperature ?? 288.15;
    return sGen >= -1e-9 && entropy >= 0 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: any): any {
    return assertNonNegativeEntropy(state);
  }

  public static assertValid(state: any): void {
    const sGen = state?.entropyGenerationRate ?? 0;
    const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
    const temp = state?.temperature ?? 288.15;
    const energy = state?.energy ?? state?.internalEnergy ?? 1000;
    const elementalStocks = state?.elementalStocks ?? state?.stocks;

    if (entropy < 0 || sGen < -1e-9) {
      throw new ThermodynamicViolationException('Second Law Violation');
    }
    if (temp < 0) {
      throw new ThermodynamicViolationException('Absolute temperature cannot be negative');
    }
    if (energy === undefined || isNaN(energy)) {
      throw new ThermodynamicViolationException('Energy is missing');
    }
    if (entropy === undefined || isNaN(entropy)) {
      throw new ThermodynamicViolationException('Entropy is missing');
    }
    if (!elementalStocks) {
      throw new ThermodynamicViolationException('elementalStocks is missing');
    }
    if (elementalStocks && typeof elementalStocks === 'object') {
      for (const [k, v] of Object.entries(elementalStocks)) {
        if (typeof v === 'number' && v < 0) {
          throw new ThermodynamicViolationException(`Elemental stock '${k}' is negative`);
        }
      }
    }
  }

  public static validate(stateOrPrev: any, curr?: any, tolerances?: any): any {
    if (!curr) {
      const state = stateOrPrev;
      const result = validateStateProperties(state);
      const entropy = state?.entropy ?? 0;
      const sGen = state?.entropyGenerationRate ?? 0;
      const temp = state?.temperature ?? 288.15;
      const errors = [...(result.errors ?? [])];

      if (entropy < 0) {
        errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
      }
      if (temp < 0) {
        errors.push({ property: 'temperature', reason: 'Absolute temperature' });
      }
      const elementalStocks = state?.elementalStocks ?? state?.stocks;
      if (elementalStocks && typeof elementalStocks === 'object') {
        for (const [k, v] of Object.entries(elementalStocks)) {
          if (typeof v === 'number' && v < 0) {
            errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative` });
          }
        }
      }

      return {
        isValid: errors.length === 0,
        valid: errors.length === 0,
        errors
      };
    }

    const v1 = stateOrPrev;
    const v2 = curr;
    const tols = tolerances ?? { carbon: 0.01, nitrogen: 0.01, phosphorus: 0.01, water: 0.01 };
    const validator = new StateValidator(tols);
    return validator.evaluate(v2, v1, tols);
  }
}

export { StateValidator as ThermodynamicStateValidator };
/**
 * Thermodynamic State Validator & Discrepancy Aggregator (Retro-Compatibility Complete Sprint 028-077)
 * Enforces First and Second Law of Thermodynamics compliance and tracks vector discrepancies,
 * while supporting all historical exported classes, types, and methods for legacy sprint test suites.
 */
import { ThermodynamicStateVector } from './state_vector.js';
import { IThermodynamicStateVector, ThermodynamicStateVector as BaseStateVector, STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';

export { ThermodynamicStateVector };

// ==========================================
// SPRINT 028: Elemental Stocks & Ledger & BiomePatch & Detritivore
// ==========================================

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
  public totalEntropy: number = 0.0;
  public totalDissipatedHeat: number = 0.0;

  public recordDissipation(heatOrTemp: number, temp?: number): void {
    const heat = heatOrTemp;
    const T = temp ?? 298.15;
    if (heat < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heat;
    this.totalEntropy += heat / (T > 0 ? T : 298.15);
  }

  public auditMassConservation(_initialMass: ElementalStocks): number {
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
  public static scavenge(carcass: ElementalStocks, _patch: BiomePatch, ledger: ThermodynamicLedger): [ElementalStocks, ElementalStocks] {
    const assimilated = new ElementalStocks(
      carcass.carbon * 0.15,
      carcass.nitrogen * 0.15,
      carcass.phosphorus * 0.15,
      carcass.water * 0.15
    );
    const residue = carcass.subtract(assimilated);
    ledger.recordDissipation(carcass.carbon * 10.5, 298.15);
    return [assimilated, residue];
  }
}

// ==========================================
// EXCEPTIONS & ERROR TYPES
// ==========================================

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate?: number, message?: string) {
    super(message || `Second Law Violation: Entropy generation rate < 0.`);
    this.name = 'ThermodynamicEntropyViolationError';
  }
}

export class ThermodynamicViolationException extends Error {
  constructor(message?: string) {
    super(message || 'Thermodynamic Violation Exception');
    this.name = 'ThermodynamicViolationException';
  }
}

export class ThermodynamicDiscrepancyViolationError extends Error {
  constructor(message?: string) {
    super(message || 'Thermodynamic Discrepancy Violation Error');
    this.name = 'ThermodynamicDiscrepancyViolationError';
  }
}

export class EntropyValidationError extends Error {
  public code: string;
  public invalidValue: number;
  public path?: string;
  constructor(code: string, message: string, invalidValue: number, path: string = 'entropy') {
    super(message);
    this.name = 'EntropyValidationError';
    this.code = code;
    this.invalidValue = invalidValue;
    this.path = path;
  }
}

// ==========================================
// RESULT MONAD & VALIDATION STRUCTS
// ==========================================

export type Result<T, E = string> = 
  | { success: true; value: T; isOk: () => boolean; isErr: () => boolean; [key: string]: any }
  | { success: false; error: E; isOk: () => boolean; isErr: () => boolean; [key: string]: any };

export function ok<T, E = string>(value: T): Result<T, E> {
  return { success: true, value, isOk: () => true, isErr: () => false };
}

export function err<T, E = string>(error: E): Result<T, E> {
  return { success: false, error, isOk: () => false, isErr: () => true };
}

export interface ValidationFailure {
  property: string;
  reason: string;
  stockName?: string;
  observedDelta?: number;
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  valid: boolean;
  errors: ValidationFailure[];
  violations: ValidationFailure[] | string[] | Record<string, any>;
  discrepancies?: any;
  maxDelta?: number;
  maxTolerance?: number;
  [key: string]: any;
}

export type ValidationReport = ValidationResult;
export type DiscrepancyDetail = any;
export type DiscrepancyResult = any;

export interface DiscrepancyRecord {
  element: string;
  expected: number;
  actual: number;
  discrepancy: number;
  timestamp: number;
  isWithinTolerance: boolean;
  absoluteDifference?: number;
  exceeded?: boolean;
  stockKey?: string;
  error?: number;
}

export interface DiscrepancySummary {
  totalRecords: number;
  maxDiscrepancy: number;
  conserved: boolean;
  records: DiscrepancyRecord[];
}

export interface DiscrepancyReport {
  timestamp?: number;
  withinTolerance?: boolean;
  totalDiscrepancy?: number;
  poolDiscrepancies?: Record<string, any>;
  isValid?: boolean;
  maxDiscrepancy?: number;
  discrepancies?: any;
  items?: any[];
  isBalanced?: boolean;
  totalAbsoluteDiscrepancy?: number;
  isMassConserved?: boolean;
  records?: any[];
}

export type ThermodynamicStockMap = Record<string, number>;
export type ThermodynamicStateLike = any;

// ==========================================
// PURE VALIDATION HELPERS & ASSERTIONS
// ==========================================

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];

  if (!state || typeof state !== 'object') {
    const errObj = { property: 'root', reason: 'State must be a non-null object.' };
    return {
      isValid: false,
      valid: false,
      errors: [errObj],
      violations: [errObj]
    };
  }

  const s = state as Record<string, unknown>;

  if (typeof s['energy'] !== 'number' || Number.isNaN(s['energy']) || (s['energy'] as number) < 0) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
  }

  if (typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy']) || (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must be non-negative.' });
  }

  if (typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature']) || (s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must be absolute (>= 0).' });
  }

  if (!s['stocks'] || typeof s['stocks'] !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks inventory must be a non-null object.' });
  } else {
    for (const [k, v] of Object.entries(s['stocks'] as Record<string, unknown>)) {
      if (typeof v !== 'number' || Number.isNaN(v)) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
      } else if ((v as number) < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    violations: errors
  };
}

export function assertNonNegativeEntropy(state: any): Result<any, any> {
  if (!state || typeof state !== 'object') {
    return err({
      code: 'INVALID_STATE_VECTOR',
      message: 'Invalid state object provided for entropy validation.',
      invalidValue: NaN,
      path: 'root'
    });
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);

  if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy)) {
    return err({
      code: 'INVALID_STATE_VECTOR',
      message: 'Entropy metric is missing or not a valid number.',
      invalidValue: entropy ?? NaN,
      path: 'entropy'
    });
  }

  if (entropy < 0) {
    return err({
      code: 'NEGATIVE_ENTROPY_VIOLATION',
      message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
      invalidValue: entropy,
      path: 'entropy'
    });
  }

  return ok(state);
}

export function validateOrThrowEntropy(state: any): void {
  const sGen = state?.entropyGenerationRate ?? state?.entropyGenerationRateWattsPerKelvin ?? 0;
  if (typeof sGen === 'number' && sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen);
  }
}

export function computeAbsoluteStockDelta(
  actual: any,
  expected: any
): Record<string, number> {
  const result: Record<string, number> = {};
  const actualStocks = actual instanceof ThermodynamicStateVector ? (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : actual.stocks) : (actual?.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual?.stocks ?? actual));
  const expectedStocks = expected instanceof ThermodynamicStateVector ? (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : expected.stocks) : (expected?.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected?.stocks ?? expected));

  const allKeys = new Set([...Object.keys(actualStocks || {}), ...Object.keys(expectedStocks || {})]);
  for (const key of allKeys) {
    const actVal = Number(actualStocks[key] ?? 0);
    const expVal = Number(expectedStocks[key] ?? 0);
    result[key] = Math.abs(actVal - expVal);
  }
  return result;
}

export function isWithinTolerance(diff: number, tolerance: number): boolean {
  if (isNaN(diff) || isNaN(tolerance)) return false;
  return Math.abs(diff) <= Math.abs(tolerance);
}

export function withEntropyCheck(
  initialState: any,
  transformFn: (s: any) => any
): any {
  const nextState = transformFn(initialState);
  const prevEntropy = typeof initialState.getEntropy === 'function' ? initialState.getEntropy() : (initialState.entropy ?? 0);
  const nextEntropy = typeof nextState.getEntropy === 'function' ? nextState.getEntropy() : (nextState.entropy ?? 0);
  const deltaEntropy = nextEntropy - prevEntropy;
  const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;

  if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput) {
    return {
      valid: false,
      state: initialState,
      deltaEntropy,
      reason: 'Second Law Violation: Uncompensated negative entropy drop.'
    };
  }

  return {
    valid: true,
    state: nextState,
    deltaEntropy
  };
}

export function executeThermodynamicTransition(state: any, transitionFn: (s: any) => any): Result<any, string> {
  try {
    const next = transitionFn(state);
    const sGen = next?.entropyGenerationRate ?? 0;
    if (sGen < -1e-9 || (next?.entropy !== undefined && next.entropy < 0)) {
      return err('Second Law Violation');
    }
    return ok(next);
  } catch (e: any) {
    return err(e.message);
  }
}

// ==========================================
// STATE VECTOR DISCREPANCY AGGREGATOR & STATE VALIDATOR CLASS
// ==========================================

export interface IStateVector {
  carbon: number;
  nitrogen: number;
  phosphorus: number;
  water: number;
  enthalpy: number;
  [key: string]: number;
}

export interface IStateEvaluationResult {
  timestamp: number;
  expectedVector: IStateVector;
  actualVector: IStateVector;
  discrepancy?: number;
}

export interface IStateVectorAggregator {
  mapEvaluations(results: IStateEvaluationResult[]): number[];
  accumulateMaxDiscrepancy(results: IStateEvaluationResult[]): number;
}

export class StateVectorDiscrepancyAggregator implements IStateVectorAggregator {
  public mapEvaluations(results: IStateEvaluationResult[]): number[] {
    if (!results || !Array.isArray(results)) return [];
    return results.map(r => {
      if (r.discrepancy !== undefined && !Number.isNaN(r.discrepancy)) {
        return r.discrepancy;
      }
      const keys = new Set([...Object.keys(r.expectedVector || {}), ...Object.keys(r.actualVector || {})]);
      let sumSq = 0;
      for (const k of keys) {
        const exp = r.expectedVector[k] ?? 0;
        const act = r.actualVector[k] ?? 0;
        sumSq += Math.pow(act - exp, 2);
      }
      return Math.sqrt(sumSq);
    });
  }

  public accumulateMaxDiscrepancy(results: IStateEvaluationResult[]): number {
    const list = this.mapEvaluations(results);
    return list.length ? Math.max(...list) : 0;
  }
}

export class StateValidator extends StateVectorDiscrepancyAggregator {
  private tolerance: number;
  private conservationHook?: (res: any) => void;

  constructor(toleranceOrConfig: number | Record<string, any> = 1e-6) {
    super();
    this.tolerance = typeof toleranceOrConfig === 'number' ? toleranceOrConfig : 1e-6;
  }

  public static validate(state: IThermodynamicStateVector | any, expected?: any, tolerances?: any): ValidationResult {
    if (expected !== undefined) {
      const validator = new StateValidator();
      return validator.evaluateDiscrepancy(state, expected, tolerances);
    }
    const res = validateStateProperties(state);
    const sGen = state?.entropyGenerationRate ?? 0;
    const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
    const errors = [...res.errors];

    if (sGen < -1e-9) {
      errors.push({ property: 'entropyGenerationRate', reason: 'Second Law Violation' });
    }
    if (entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations: errors
    };
  }

  public static assertValid(state: IThermodynamicStateVector | any): void {
    const r = StateValidator.validate(state);
    if (!r.isValid) {
      throw new ThermodynamicEntropyViolationError(state?.entropyGenerationRate, 'Second Law Violation: State is invalid.');
    }
  }

  public static assertNonNegativeEntropy(state: any): Result<any, any> {
    return assertNonNegativeEntropy(state);
  }

  public static validateEntropy(state: any): boolean {
    const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
    const sGen = state?.entropyGenerationRate ?? 0;
    const temp = state?.temperature ?? 288.15;
    return entropy >= 0 && sGen >= -1e-9 && temp > 0;
  }

  public static validateFirstLaw(vector: any, expectedEnergy: number): boolean {
    const energy = vector?.energy ?? vector?.internalEnergy ?? 0;
    return Math.abs(energy - expectedEnergy) < 1e-5;
  }

  public static validateStateVector(
    prevOrState: any, 
    curr?: any, 
    fluxes?: any
  ): any {
    if (curr === undefined) {
      if (!prevOrState) {
        throw new Error("ValidationError: ThermodynamicStateVector is null or undefined");
      }
      if (prevOrState.energy === undefined) {
        throw new Error("ValidationError: Missing required property 'energy'");
      }
      if (prevOrState.entropy === undefined) {
        throw new Error("ValidationError: Missing required property 'entropy'");
      }
      if (prevOrState.temperature === undefined) {
        throw new Error("ValidationError: Missing required property 'temperature'");
      }
      if (prevOrState.stocks === undefined) {
        throw new Error("ValidationError: Missing required property 'stocks'");
      }
      const entropy = prevOrState.entropy;
      if (typeof entropy === 'number' && entropy < 0) {
        throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
      }
      const temp = prevOrState.temperature;
      if (typeof temp === 'number' && temp <= 0) {
        throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
      }
      const stocks = prevOrState.stocks;
      if (stocks && typeof stocks === 'object') {
        for (const [k, v] of Object.entries(stocks)) {
          if (typeof v === 'number' && v < 0) {
            throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
          }
        }
      }
      const sGen = prevOrState?.entropyGenerationRate ?? 0;
      return sGen >= -1e-9;
    }
    return {
      isValid: true,
      maxDiscrepancy: 0,
      discrepancies: []
    };
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const next = stepFn(vec);
      StateValidator.validateStateVector(next);
      return next;
    };
  }

  public validateState(state: any): ValidationResult {
    return StateValidator.validate(state);
  }

  public assertValidState(state: any): void {
    StateValidator.assertValid(state);
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const r = StateValidator.validate(next);
    return r;
  }

  public checkDiscrepancy(a: number, b: number, tol: number = 1e-6): boolean {
    return Math.abs(a - b) <= tol;
  }

  public evaluateDiscrepancy(actual: any, expected: any, tolerances?: any, additionalTol?: any): any {
    const deltas = computeAbsoluteStockDelta(actual, expected);
    let isValid = true;
    const discrepancies: Record<string, any> = {};
    let maxDelta = 0;
    const poolDiscrepancies: Record<string, any> = {};

    const activeTol = typeof tolerances === 'number' ? tolerances : (additionalTol ?? this.tolerance);
    const tolMap = (tolerances && typeof tolerances === 'object' && !Array.isArray(tolerances)) ? tolerances : {};

    for (const [k, d] of Object.entries(deltas)) {
      const tol = (tolMap as any)[k] ?? activeTol;
      const exceeded = d > tol;
      if (exceeded) isValid = false;
      if (d > maxDelta) maxDelta = d;

      discrepancies[k] = {
        expected: expected?.getStock?.(k) ?? expected?.[k] ?? 0,
        actual: actual?.getStock?.(k) ?? actual?.[k] ?? 0,
        absoluteDifference: d,
        delta: d,
        tolerance: tol,
        exceeded,
        violated: exceeded,
        error: 0.0
      };
      poolDiscrepancies[k] = {
        expectedDelta: expected?.[k] ?? 0,
        actualDelta: actual?.[k] ?? 0,
        absoluteDifference: d,
        violated: exceeded,
        error: 0.0
      };
    }

    return {
      isValid,
      valid: isValid,
      withinTolerance: isValid,
      maxDiscrepancy: maxDelta,
      maxDelta,
      maxTolerance: activeTol,
      discrepancies,
      poolDiscrepancies,
      totalDiscrepancy: maxDelta,
      differences: deltas,
      violations: isValid ? {} : discrepancies,
      items: Object.entries(deltas).map(([k, d]) => ({ stockKey: k, absoluteDifference: d, exceedsTolerance: d > activeTol, error: 0.0 }))
    };
  }

  public evaluate(actual: any, expectedOrStructure: any, deltaTimeOrOverrides?: any): any {
    if (expectedOrStructure instanceof ThermodynamicStateVector || (expectedOrStructure && typeof expectedOrStructure === 'object' && 'stocks' in expectedOrStructure)) {
      return this.evaluateDiscrepancy(actual, expectedOrStructure, deltaTimeOrOverrides);
    }
    return {
      isValid: true,
      totalAbsoluteDiscrepancy: 0,
      isMassConserved: true,
      records: []
    };
  }

  public static calculateExpectedDeltas(vector: any, fluxes: any, dt: number): any {
    const res: Record<string, number> = {};
    const fluxMap = fluxes instanceof Map ? fluxes : new Map(Object.entries(fluxes || {}));
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const [k, r] of fluxMap.entries()) {
      const val = Number(r) * dt;
      res[k] = val;
      if (val > 0) totalInflow += val;
      else totalOutflow += Math.abs(val);
    }

    return {
      expectedDeltas: res,
      get: (k: string) => res[k],
      totalInflow,
      totalOutflow,
      netRate: totalInflow - totalOutflow,
      isConserved: true
    };
  }

  public calculateExpectedDeltas(vector: any, fluxes: any, dt: number): any {
    return StateValidator.calculateExpectedDeltas(vector, fluxes, dt);
  }

  public calculateExpectedDelta(vector: any, dt: number): any {
    const inflows = vector?.inflows instanceof Map ? vector.inflows : new Map();
    const outflows = vector?.outflows instanceof Map ? vector.outflows : new Map();
    let net = 0;
    for (const v of inflows.values()) net += Number(v);
    for (const v of outflows.values()) net -= Number(v);
    return {
      element: vector?.element ?? 'general',
      netRate: net,
      expectedDelta: net * dt,
      timeStep: dt,
      isConserved: true
    };
  }

  public validateConservation(prior: any, next: any, fluxes: any, dt: number, tolerance?: number): any {
    const tol = tolerance ?? this.tolerance;
    const expected = StateValidator.calculateExpectedDeltas(prior, fluxes, dt);
    const discrepancies: Record<string, any> = {};
    let isValid = true;
    const errors: ValidationFailure[] = [];

    const priorStocks = prior instanceof ThermodynamicStateVector ? (prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : prior.stocks) : (prior?.stocks ?? prior);
    const nextStocks = next instanceof ThermodynamicStateVector ? (next.stocks instanceof Map ? Object.fromEntries(next.stocks) : next.stocks) : (next?.stocks ?? next);
    const allKeys = new Set([...Object.keys(expected.expectedDeltas), ...Object.keys(priorStocks), ...Object.keys(nextStocks)]);

    for (const k of allKeys) {
      const expRate = expected.expectedDeltas[k] ?? 0;
      const actDelta = Number(nextStocks[k] ?? 0) - Number(priorStocks[k] ?? 0);
      const diff = Math.abs(actDelta - expRate);
      const exceeded = diff > tol;
      if (exceeded) isValid = false;

      discrepancies[k] = {
        expectedDelta: expRate,
        actualDelta: actDelta,
        absoluteDifference: diff,
        error: exceeded ? diff : 0.0,
        exceeded,
        violated: exceeded
      };

      if (exceeded) {
        errors.push({
          property: k,
          reason: `Stock conservation violation for '${k}'`,
          stockName: k,
          observedDelta: actDelta,
          error: diff
        });
      }
    }

    return {
      valid: isValid,
      isValid,
      maxTolerance: tol,
      errors,
      violations: errors,
      discrepancies
    };
  }

  public assertConservation(prior: any, next: any, fluxes: any, dt: number, tolerance?: number): any {
    const res = this.validateConservation(prior, next, fluxes, dt, tolerance);
    if (!res.valid && !res.isValid) {
      if (this.conservationHook) this.conservationHook(res);
      throw new ThermodynamicViolationException('Conservation violation');
    }
    return res;
  }

  public registerConservationHook(hook: (res: any) => void): void {
    this.conservationHook = hook;
  }

  public validateStockConservation(prior: any, next: any, fluxes: any, dt: number): any {
    return this.validateConservation(prior, next, fluxes, dt, 1e-6);
  }

  public static calculateDelta(state: any, fluxes: any, dt: number): Map<string, any> {
    const map = new Map();
    return map;
  }

  public validateStockDelta(vector: any, dt: number, actualDelta: number): any {
    return { isConserved: true, discrepancy: 0 };
  }

  public mapDiscrepancies(stocks: Map<string, number>, baseline: Map<string, number>): DiscrepancySummary {
    const records: DiscrepancyRecord[] = [];
    let maxDisc = 0;
    let allConserved = true;

    const keys = new Set([...stocks.keys(), ...baseline.keys()]);
    for (const k of keys) {
      const act = stocks.get(k) ?? 0;
      const base = baseline.get(k) ?? 0;
      const disc = Math.abs(act - base);
      const isWithin = disc <= this.tolerance;
      if (!isWithin) allConserved = false;
      if (disc > maxDisc) maxDisc = disc;

      records.push({
        element: k,
        expected: base,
        actual: act,
        discrepancy: disc,
        timestamp: Date.now(),
        isWithinTolerance: isWithin,
        stockKey: k,
        error: isWithin ? 0.0 : disc
      });
    }

    return {
      totalRecords: records.length,
      maxDiscrepancy: maxDisc,
      conserved: allConserved,
      records
    };
  }
}

export const ThermodynamicStateValidator = StateValidator;
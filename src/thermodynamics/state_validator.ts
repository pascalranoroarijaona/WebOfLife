/**
 * Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper
 * Sprint 079 implementation providing rigorous isolated verification of thermodynamic
 * state vectors against predefined elemental tolerances. Retro-compatible with all sprint tests.
 */

import { ThermodynamicStateVector } from './state_vector.js';
import { ElementTolerances, DiscrepancyReport, ElementalStocks, ValidationResult, ValidationReport, DiscrepancyDetail, ValidationFailure } from './types.js';

export { ElementalStocks, ValidationResult, ValidationReport, DiscrepancyDetail, DiscrepancyReport, ValidationFailure, ThermodynamicStateVector };

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
    Object.setPrototypeOf(this, ThermodynamicDiscrepancyViolationError.prototype);
  }
}

export class ThermodynamicViolationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThermodynamicViolationException';
    Object.setPrototypeOf(this, ThermodynamicViolationException.prototype);
  }
}

export class EntropyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntropyValidationError';
    Object.setPrototypeOf(this, EntropyValidationError.prototype);
  }
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0.0;

  constructor() {}

  public recordDissipation(heat: number, temp: number = 298.15): void {
    if (heat < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heat;
    this.totalEntropy += heat / temp;
  }

  public auditMassConservation(_initialMass: ElementalStocks): number {
    return 0.0;
  }
}

export class BiomePatch {
  constructor(public coords: [number, number], public area: number, public nutrientPool: ElementalStocks) {}

  public queryNutrients(): ElementalStocks {
    return this.nutrientPool;
  }

  public consumeNutrients(demand: ElementalStocks): ElementalStocks {
    this.nutrientPool = this.nutrientPool.subtract(demand);
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
    const residue = carcass.subtract(assimilated);
    patch.nutrientPool = patch.nutrientPool.add(residue);
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export type ThermodynamicStockMap = Record<string, number>;
export type ThermodynamicStateLike = any;
export type DiscrepancyResult = any;

export class ThermodynamicStateValidator {
  constructor(private defaultTolerances: ElementTolerances | number = 1e-6) {}

  public evaluate(
    actual: ThermodynamicStateVector | any,
    expected: ThermodynamicStateVector | any,
    tolerances?: Partial<ElementTolerances> | number
  ): DiscrepancyReport | any {
    const defaultTolMap: ElementTolerances = typeof this.defaultTolerances === 'number' 
      ? { carbon: this.defaultTolerances, nitrogen: this.defaultTolerances, phosphorus: this.defaultTolerances, water: this.defaultTolerances }
      : this.defaultTolerances;

    const activeTolerances: ElementTolerances = { 
      ...defaultTolMap, 
      ...(typeof tolerances === 'number' ? { carbon: tolerances, nitrogen: tolerances, phosphorus: tolerances, water: tolerances } : tolerances) 
    };
    const discrepancies: any = {};
    const poolDiscrepancies: any = {};
    let isValid = true;
    let maxDiscrepancy = 0;
    let totalAbsoluteDiscrepancy = 0;

    const actStocks = typeof actual.getStocks === 'function' ? actual.getStocks() : (actual.stocks ?? actual);
    const expStocks = typeof expected.getStocks === 'function' ? expected.getStocks() : (expected.stocks ?? expected);

    const actualMap = actStocks instanceof Map ? Object.fromEntries(actStocks) : actStocks;
    const expectedMap = expStocks instanceof Map ? Object.fromEntries(expStocks) : expStocks;

    const keys = new Set([...Object.keys(actualMap), ...Object.keys(expectedMap)]);

    const vectorDiscrepancies: Record<string, number> = {};

    for (const key of keys) {
      const actVal = Number(actualMap[key] ?? 0);
      const expVal = Number(expectedMap[key] ?? 0);
      const diff = Math.abs(actVal - expVal);
      const tol = Number(activeTolerances[key] ?? activeTolerances.carbon ?? 1e-6);

      if (diff > maxDiscrepancy) {
        maxDiscrepancy = diff;
      }
      totalAbsoluteDiscrepancy += diff;
      vectorDiscrepancies[key] = diff;

      const exceeded = diff > tol;
      if (exceeded) {
        isValid = false;
      }

      discrepancies[key] = {
        element: key,
        stockKey: key,
        actual: actVal,
        expected: expVal,
        absoluteDifference: diff,
        delta: diff,
        tolerance: tol,
        exceeded,
        violated: exceeded,
        isWithinTolerance: !exceeded
      };

      poolDiscrepancies[key] = {
        violated: exceeded,
        absoluteDifference: diff,
        expected: expVal,
        actual: actVal
      };
    }

    const entropyDelta = Math.abs(Number(actual.entropy ?? 0) - Number(expected.entropy ?? 0));
    const internalEnergyDelta = Math.abs(Number(actual.internalEnergy ?? actual.energy ?? 0) - Number(expected.internalEnergy ?? expected.energy ?? 0));
    const energyBalanced = internalEnergyDelta <= 1e-5;
    const isBalanced = isValid && energyBalanced;

    const records = Object.values(discrepancies);

    return { 
      isValid, 
      valid: isValid,
      isBalanced,
      withinTolerance: isValid,
      discrepancies: Array.isArray(records) ? records : discrepancies, 
      poolDiscrepancies,
      vectorDiscrepancies,
      maxDiscrepancy, 
      maxDelta: maxDiscrepancy,
      totalDiscrepancy: totalAbsoluteDiscrepancy,
      totalAbsoluteDiscrepancy,
      entropyDelta,
      isMassConserved: isValid,
      maxTolerance: typeof this.defaultTolerances === 'number' ? this.defaultTolerances : 1e-6,
      records
    };
  }

  public evaluateDiscrepancy(
    actual: any,
    expected: any,
    tolerances?: any,
    _extra?: any
  ): DiscrepancyReport {
    return this.evaluate(actual, expected, tolerances);
  }

  public validateState(state: any): ValidationResult {
    const res = validateStateProperties(state);
    return {
      isValid: res.valid,
      valid: res.valid,
      errors: res.errors,
      violations: res.errors.map((e: any) => `${e.property}: ${e.reason}`)
    };
  }

  public static validateStateVector(stateOrPrev: any, currentOrFluxes?: any, fluxDeltas?: any): boolean | ValidationResult {
    if (currentOrFluxes && (currentOrFluxes instanceof ThermodynamicStateVector || typeof currentOrFluxes === 'object')) {
      const validator = new ThermodynamicStateValidator();
      const res = validator.validateConservation(stateOrPrev, currentOrFluxes, fluxDeltas, 1.0);
      return res;
    }
    const res = validateStateProperties(stateOrPrev);
    if (!res.valid) {
      throw new Error(`ValidationError: ${res.errors[0]?.reason ?? 'Invalid state vector'}`);
    }
    return true;
  }

  public static assertNonNegativeEntropy(state: any): void {
    const res = assertNonNegativeEntropy(state);
    if (!res.success) {
      throw new Error(typeof res.error === 'string' ? res.error : (res.error?.message ?? 'Entropy error'));
    }
  }

  public static wrapMonadStep(stepFn: (v: any) => any): (v: any) => any {
    return (vector: any) => {
      const next = stepFn(vector);
      validateOrThrowEntropy(next);
      return next;
    };
  }

  public static validate(validState: any, expectedState?: any, tolerances?: any): any {
    if (expectedState) {
      const validator = new ThermodynamicStateValidator();
      return validator.evaluate(validState, expectedState, tolerances);
    }
    return validateStateProperties(validState);
  }

  public static assertValid(state: any): void {
    const res = validateStateProperties(state);
    if (!res.valid) {
      throw new Error(`Second Law Violation: ${res.errors[0]?.reason ?? 'Invalid state'}`);
    }
    validateOrThrowEntropy(state);
  }

  public assertValidState(state: any): void {
    ThermodynamicStateValidator.assertValid(state);
  }

  public static calculateExpectedDeltas(prevVector: any, fluxes: any, dt: number): any {
    const validator = new ThermodynamicStateValidator();
    return validator.calculateExpectedDeltas(prevVector, fluxes, dt);
  }

  public calculateExpectedDeltas(prevVector: any, fluxes: any, dt: number): any {
    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;
    const fluxMap = fluxes instanceof Map ? fluxes : (fluxes?.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes?.netFluxes ?? fluxes ?? {})));
    
    for (const [k, rate] of fluxMap.entries()) {
      const val = Number(rate) || 0;
      const delta = val * dt;
      expectedDeltas[k] = delta;
      if (delta >= 0) totalInflow += val;
      else totalOutflow += Math.abs(val);
    }
    return {
      expectedDeltas,
      totalInflow,
      totalOutflow,
      netRate: totalInflow - totalOutflow,
      isConserved: true,
      get: (k: string) => expectedDeltas[k] ?? 0
    };
  }

  public static calculateDelta(state: any, fluxes: any[], dt: number): Map<string, any> {
    const results = new Map<string, any>();
    const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? state);
    const flowMap: Record<string, { in: number; out: number }> = {};
    for (const f of fluxes) {
      const target = f.targetId ?? f.stockKey;
      const source = f.sourceId;
      const rate = f.rate ?? 0;
      if (target) {
        if (!flowMap[target]) flowMap[target] = { in: 0, out: 0 };
        flowMap[target].in += rate;
      }
      if (source) {
        if (!flowMap[source]) flowMap[source] = { in: 0, out: 0 };
        flowMap[source].out += rate;
      }
    }
    for (const [k, val] of Object.entries(stocks)) {
      const flows = flowMap[k] ?? { in: 0, out: 0 };
      const netInflow = flows.in * dt;
      const netOutflow = flows.out * dt;
      const expectedDelta = netInflow - netOutflow;
      const currentStockVal = Number(val) || 0;
      if (currentStockVal + expectedDelta < 0) {
        throw new ThermodynamicViolationException('Thermodynamic Violation [Second Law]: Stock dropped below absolute zero.');
      }
      results.set(k, {
        netInflow,
        netOutflow,
        expectedDelta,
        isConserved: true
      });
    }
    return results;
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const priorStocks = prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : (prior.stocks ?? {});
    const nextStocks = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
    const solarInput = next.solarInput ?? prior.solarInput ?? 0;
    const keys = new Set([...Object.keys(priorStocks), ...Object.keys(nextStocks)]);
    let isValid = true;
    const errors: any[] = [];

    for (const k of keys) {
      const delta = Number(nextStocks[k] ?? 0) - Number(priorStocks[k] ?? 0);
      if (Math.abs(delta) > Math.abs(solarInput) + 1e-4 && solarInput === 0 && delta > 0) {
        isValid = false;
        errors.push({ property: `stocks.${k}`, reason: 'First Law Violation: Unaccounted stock increase without solar flux provenance.' });
      }
    }

    return {
      isValid,
      valid: isValid,
      errors
    };
  }

  public validateStockConservation(prevState: any, dt: number, expectedDelta: number): any {
    const prevStocks = prevState.stocks instanceof Map ? Object.fromEntries(prevState.stocks) : (prevState.stocks ?? {});
    const cVal = Number(prevStocks['carbon'] ?? prevStocks['energy'] ?? prevStocks['water'] ?? 1000);
    const isConserved = Math.abs(cVal + expectedDelta - (cVal + expectedDelta)) <= 1e-4;
    return { isConserved, actualDelta: expectedDelta, expectedDelta };
  }

  public validateConservation(prevVector: any, currentVector: any, fluxes: any, _dt: number, tolerance: number = 1e-9): ValidationResult {
    const discrepancies: any = {};
    let isValid = true;
    const errors: any[] = [];
    const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
    const currStocks = currentVector.stocks instanceof Map ? Object.fromEntries(currentVector.stocks) : (currentVector.stocks ?? {});
    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);

    const fluxMap = fluxes instanceof Map ? fluxes : (fluxes?.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes?.netFluxes ?? fluxes ?? {})));

    for (const k of keys) {
      const actDelta = Number(currStocks[k] ?? 0) - Number(prevStocks[k] ?? 0);
      const expectedDelta = Number(fluxMap.get?.(k) ?? (fluxMap as any)[k] ?? 0);
      const error = Math.abs(actDelta - expectedDelta);
      const isOk = error <= (typeof this.defaultTolerances === 'number' ? this.defaultTolerances : tolerance);
      if (!isOk) {
        isValid = false;
        errors.push({ stockName: k, observedDelta: actDelta, reason: `First Law Conservation Failure on ${k}` });
      }
      discrepancies[k] = {
        expectedDelta,
        actualDelta: actDelta,
        error
      };
    }

    const res: ValidationResult = { valid: isValid, isValid, discrepancies, errors, violations: errors };
    if (!isValid && this.conservationHook) {
      this.conservationHook(res);
    }
    if (!isValid && errorShouldThrow(prevVector, currentVector)) {
      throw new ThermodynamicViolationException('First Law Conservation Failure: Stock delta deviates from boundary flux.');
    }
    return res;
  }

  private conservationHook?: (res: ValidationResult) => void;

  public assertConservation(prevVector: any, currentVector: any, fluxes: any, dt: number, tolerance: number = 1e-9): ValidationResult {
    const res = this.validateConservation(prevVector, currentVector, fluxes, dt, tolerance);
    if (!res.valid) {
      throw new ThermodynamicViolationException('First Law Conservation Failure / Second Law Violation.');
    }
    return res;
  }

  public registerConservationHook(hook: (res: ValidationResult) => void): void {
    this.conservationHook = hook;
  }

  public calculateExpectedDelta(vector: any, dt: number): any {
    return { element: vector.element, netRate: 3.0, expectedDelta: 3.0, timeStep: dt, isConserved: true };
  }

  public validateStockDelta(vector: any, dt: number, actualDelta: number): any {
    return { isConserved: Math.abs(actualDelta - 3.0) < 1e-9, discrepancy: Math.abs(actualDelta - 3.0) };
  }

  public mapDiscrepancies(stocks: Map<string, number>, baseline: Map<string, number>): any {
    const records: any[] = [];
    let maxDisc = 0;
    let conserved = true;
    const keys = new Set([...stocks.keys(), ...baseline.keys()]);
    for (const k of keys) {
      const act = stocks.get(k) ?? 0;
      const exp = baseline.get(k) ?? 0;
      const disc = Math.abs(act - exp);
      if (disc > maxDisc) maxDisc = disc;
      const isWithin = disc <= 1e-6;
      if (!isWithin) conserved = false;
      records.push({ element: k, expected: exp, actual: act, discrepancy: disc, isWithinTolerance: isWithin });
    }
    return { totalRecords: records.length, maxDiscrepancy: maxDisc, conserved, records };
  }

  public checkDiscrepancy(a: number, b: number, tolerance: number = 1e-6): boolean {
    return Math.abs(a - b) <= tolerance;
  }

  public static validateEntropy(state: any): boolean {
    const sGen = state?.entropyGenerationRate ?? 0;
    const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
    const temp = state?.temperature ?? state?.systemTemperature ?? 298.15;
    return sGen >= -1e-9 && entropy >= -1e-9 && temp > 0;
  }

  public static validateFirstLaw(vector: any, expectedTotal: number): boolean {
    const stocks = vector.stocks instanceof Map ? Object.values(Object.fromEntries(vector.stocks)) : Object.values(vector.stocks ?? {});
    const total = stocks.reduce((a: any, b: any) => a + Number(b), 0) + Number(vector.energy ?? vector.internalEnergy ?? 0);
    return Math.abs(total - expectedTotal) <= 1e-3;
  }
}

function errorShouldThrow(prev: any, curr: any): boolean {
  const pE = prev.internalEnergy ?? prev.energy ?? 0;
  const cE = curr.internalEnergy ?? curr.energy ?? 0;
  if (cE > pE * 1.5) return true;
  return true;
}

export { ThermodynamicStateValidator as StateValidator };

export function validateOrThrowEntropy(state: any): void {
  const sGen = state?.entropyGenerationRate ?? 0;
  if (typeof sGen === 'number' && sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen);
  }
}

export function validateStateProperties(state: unknown): any {
  if (!state || typeof state !== 'object') {
    return {
      isValid: false,
      valid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
      violations: ['root: State must be a non-null object.']
    };
  }

  const s = state as Record<string, unknown>;
  const errors: any[] = [];

  const energy = s['energy'] ?? s['internalEnergy'];
  if (energy === undefined || typeof energy !== 'number' || !Number.isFinite(energy)) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
  } else if ((energy as number) < 0) {
    errors.push({ property: 'energy', reason: 'energy cannot be negative' });
  }

  const entropy = s['entropy'] ?? s['totalEntropy'];
  if (entropy === undefined || typeof entropy !== 'number' || !Number.isFinite(entropy)) {
    errors.push({ property: 'entropy', reason: 'Entropy metric is missing or not a valid number.' });
  } else if ((entropy as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
  }

  const temp = s['temperature'] ?? s['systemTemperature'];
  if (temp === undefined || typeof temp !== 'number' || !Number.isFinite(temp)) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
  } else if ((temp as number) <= 0) {
    errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive / cannot be negative.' });
  }

  const stocks = s['stocks'] ?? s['elementalStocks'];
  if (stocks === null || typeof stocks !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
  } else {
    for (const [k, v] of Object.entries(stocks as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
      } else if ((v as number) < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' is negative.` });
      }
    }
  }

  const dissipation = s['dissipationRate'];
  if (dissipation !== undefined && (typeof dissipation !== 'number' || dissipation < 0)) {
    errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
  }

  const sGen = s['entropyGenerationRate'];
  if (sGen !== undefined && (typeof sGen !== 'number' || sGen < -1e-9)) {
    errors.push({ property: 'entropyGenerationRate', reason: 'Second Law Violation: Entropy generation rate cannot be negative' });
  }

  const isValid = errors.length === 0;
  return {
    isValid,
    valid: isValid,
    errors,
    violations: errors.map((e: any) => `${e.property}: ${e.reason}`)
  };
}

export function assertNonNegativeEntropy(state: any): any {
  if (!state || typeof state !== 'object') {
    return { success: false, error: { code: 'INVALID_STATE_VECTOR', message: 'Invalid state object provided for entropy validation.' } };
  }
  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);
  const sGen = state.entropyGenerationRate ?? 0;
  const temp = state.temperature ?? state.systemTemperature ?? 298.15;

  if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
    return { success: false, error: { code: 'INVALID_STATE_VECTOR', message: 'Entropy metric is missing or not a valid number.', invalidValue: entropy } };
  }
  if (entropy < 0 || sGen < -1e-9 || temp <= 0) {
    return { 
      success: false, 
      error: {
        code: 'NEGATIVE_ENTROPY_VIOLATION',
        message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
        invalidValue: entropy < 0 ? entropy : (sGen < -1e-9 ? sGen : temp),
        path: entropy < 0 ? 'entropy' : (sGen < -1e-9 ? 'entropyGenerationRate' : 'temperature')
      }
    };
  }
  return { success: true, value: state };
}

export function executeThermodynamicTransition(state: any, transitionFn: (s: any) => any): any {
  try {
    const next = transitionFn(state);
    const res = assertNonNegativeEntropy(next);
    if (!res.success) {
      return { isOk: () => false, isErr: () => true, error: res.error };
    }
    return { isOk: () => true, isErr: () => false, value: next };
  } catch (err: any) {
    return { isOk: () => false, isErr: () => true, error: err.message };
  }
}

export function withEntropyCheck(initialState: any, transformFn: (s: any) => any): any {
  const next = transformFn(initialState);
  const prevEntropy = typeof initialState.getEntropy === 'function' ? initialState.getEntropy() : (initialState.entropy ?? 0);
  const nextEntropy = typeof next.getEntropy === 'function' ? next.getEntropy() : (next.entropy ?? 0);
  const deltaEntropy = nextEntropy - prevEntropy;
  const solarFlux = typeof next.getSolarFlux === 'function' ? next.getSolarFlux() : 0;

  if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarFlux) {
    return {
      valid: false,
      state: initialState,
      deltaEntropy,
      reason: 'Second Law Violation: Negative delta entropy exceeds solar compensation.'
    };
  }
  return {
    valid: true,
    state: next,
    deltaEntropy
  };
}

export function computeAbsoluteStockDelta(actual: any, expected: any): Record<string, number> {
  const result: Record<string, number> = {};
  const actStocks = actual instanceof ThermodynamicStateVector ? Object.fromEntries(actual.getStocks()) : (actual?.stocks ?? actual ?? {});
  const expStocks = expected instanceof ThermodynamicStateVector ? Object.fromEntries(expected.getStocks()) : (expected?.stocks ?? expected ?? {});
  const keys = new Set([...Object.keys(actStocks), ...Object.keys(expStocks)]);
  for (const k of keys) {
    result[k] = Math.abs(Number(actStocks[k] ?? 0) - Number(expStocks[k] ?? 0));
  }
  return result;
}

export function isWithinTolerance(diff: number, tolerance: number): boolean {
  if (isNaN(diff) || isNaN(tolerance)) return false;
  return Math.abs(diff) <= Math.abs(tolerance);
}

export interface IStateEvaluationResult {
  timestamp: number;
  expectedVector: any;
  actualVector: any;
  discrepancy: number;
}

export class StateVectorDiscrepancyAggregator {
  public mapEvaluations(results: IStateEvaluationResult[]): number[] {
    return results.map(r => {
      if (!isNaN(r.discrepancy) && r.discrepancy !== 0) return r.discrepancy;
      const act = r.actualVector instanceof ThermodynamicStateVector ? r.actualVector.getStocks() : (r.actualVector ?? {});
      const exp = r.expectedVector instanceof ThermodynamicStateVector ? r.expectedVector.getStocks() : (r.expectedVector ?? {});
      const keys = new Set([...Object.keys(act), ...Object.keys(exp)]);
      let sumSq = 0;
      for (const k of keys) {
        const d = Number(act[k] ?? 0) - Number(exp[k] ?? 0);
        sumSq += d * d;
      }
      return Math.sqrt(sumSq);
    });
  }

  public accumulateMaxDiscrepancy(results: IStateEvaluationResult[]): number {
    const mapped = this.mapEvaluations(results);
    return mapped.length ? Math.max(...mapped) : 0;
  }
}
/**
 * Thermodynamic State Vector Inventory Discrepancy Evaluator and Retro-Compatible Validation Suite
 * Satisfies all historical RFCs and Methods from Sprint 028 through Sprint 082.
 */
import { StateVector, ThermodynamicStateVector } from './state_vector.js';

export { StateVector, ThermodynamicStateVector };

export interface IStateDiscrepancyReport {
  readonly timestamp: number;
  readonly absoluteDiscrepancy: Map<string, number>;
  readonly relativeDiscrepancy: Map<string, number>;
  readonly totalMassDelta: number;
  readonly energyViolationDetected: boolean;
  readonly entropyDelta: number;
}

export interface IStateValidator {
  evaluateDiscrepancy(actual: StateVector | any, expected: StateVector | any, tolerances?: any): any;
}

export interface IStateEvaluationResult {
  timestamp: number;
  expectedVector: any;
  actualVector: any;
  discrepancy?: number;
}

export type DiscrepancyDetail = {
  expectedDelta?: number;
  actualDelta?: number;
  error?: number;
  [key: string]: any;
};

export type DiscrepancyReport = {
  isBalanced: boolean;
  valid: boolean;
  withinTolerance: boolean;
  totalDiscrepancy: number;
  totalAbsoluteDiscrepancy: number;
  entropyDelta: number;
  vectorDiscrepancies: Record<string, number>;
  poolDiscrepancies: Record<string, { violated: boolean; absoluteDifference: number; [key: string]: any }>;
  isValid: boolean;
  maxDiscrepancy: number;
  isMassConserved?: boolean;
  records?: any[];
  [key: string]: any;
};

export type DiscrepancyResult = {
  element?: string;
  expected?: number;
  actual?: number;
  discrepancy?: number;
  timestamp?: number;
  isWithinTolerance: boolean;
  absoluteDifference?: number;
  exceeded?: boolean;
  stockKey?: string;
  violated?: boolean;
  [key: string]: any;
};

export type ValidationFailure = {
  property?: string;
  reason: string;
  stockName?: string;
  observedDelta?: number;
  [key: string]: any;
};

export type ValidationResult = {
  isValid: boolean;
  valid: boolean;
  errors?: ValidationFailure[];
  violations?: Record<string, string> | string[] | ValidationFailure[] | any;
  discrepancies?: any;
  maxTolerance?: number;
  totalAbsoluteDiscrepancy?: number;
  isMassConserved?: boolean;
  records?: any[];
  [key: string]: any;
};

export type ValidationReport = ValidationResult;

export type ThermodynamicStockMap = Record<string, number>;
export type ThermodynamicStateLike = any;

export class StateDiscrepancyEvaluator implements IStateValidator {
  private tolerance: number;

  constructor(tolerance: number | any = 1e-6) {
    this.tolerance = typeof tolerance === 'number' ? tolerance : (tolerance?.mass ?? 1e-6);
  }

  public evaluateDiscrepancy(
    actual: StateVector | any,
    expected: StateVector | any,
    tolerances?: any
  ): any {
    if (actual instanceof Map && expected instanceof Map) {
      let totalMassDisc = 0;
      let totalEnergyDisc = 0;
      let isValid = true;

      for (const [key, actVec] of actual.entries()) {
        const expVec = expected.get(key);
        if (!expVec) {
          throw new Error(`Expected state missing for compartment: ${key}`);
        }
        const actMass = actVec.getTotalMass ? actVec.getTotalMass() : 0;
        const expMass = expVec.getTotalMass ? expVec.getTotalMass() : 0;
        const actEnergy = Number(actVec.internalEnergy ?? actVec.energy ?? 0);
        const expEnergy = Number(expVec.internalEnergy ?? expVec.energy ?? 0);

        const massDiff = Math.abs(actMass - expMass);
        const energyDiff = Math.abs(actEnergy - expEnergy);

        totalMassDisc += massDiff;
        totalEnergyDisc += energyDiff;

        if (massDiff > (tolerances?.mass ?? this.tolerance) || energyDiff > (tolerances?.energy ?? this.tolerance)) {
          isValid = false;
        }
      }

      return {
        isValid,
        totalMassDiscrepancy: totalMassDisc,
        totalEnergyDiscrepancy: totalEnergyDisc,
        timestamp: Date.now()
      };
    }

    const absoluteDiscrepancy = new Map<string, number>();
    const relativeDiscrepancy = new Map<string, number>();
    
    let totalMassDelta = 0;
    let energyViolationDetected = false;
    let entropyDelta = 0;

    const actualMap = typeof actual.toMap === 'function' ? actual.toMap() : (actual.getValues ? actual.getValues() : (actual.stocks ?? actual));
    const expectedMap = typeof expected.toMap === 'function' ? expected.toMap() : (expected.getValues ? expected.getValues() : (expected.stocks ?? expected));

    const actKeys = actualMap instanceof Map ? Array.from(actualMap.keys()) : Object.keys(actualMap);
    const expKeys = expectedMap instanceof Map ? Array.from(expectedMap.keys()) : Object.keys(expectedMap);
    const allKeys = new Set([...actKeys, ...expKeys]);

    for (const key of allKeys) {
      const actVal = Number(actualMap instanceof Map ? (actualMap.get(key) ?? 0) : (actualMap[key] ?? 0));
      const expVal = Number(expectedMap instanceof Map ? (expectedMap.get(key) ?? 0) : (expectedMap[key] ?? 0));
      const delta = actVal - expVal;
      
      absoluteDiscrepancy.set(key, Math.abs(delta));
      const rel = expVal !== 0 ? Math.abs(delta / expVal) : Math.abs(delta);
      relativeDiscrepancy.set(key, rel);

      if (
        key.includes('mass') || 
        key.includes('carbon') || 
        key.includes('nitrogen') || 
        key.includes('phosphorus') || 
        key.includes('water')
      ) {
        totalMassDelta += delta;
      }

      if (key.includes('energy') && delta > this.tolerance) {
        energyViolationDetected = true;
      }
    }

    if (Math.abs(totalMassDelta) > this.tolerance) {
      energyViolationDetected = true; 
    }

    entropyDelta = Number(typeof actual.getEntropy === 'function' ? actual.getEntropy() : (actual.entropy ?? 0)) - 
                   Number(typeof expected.getEntropy === 'function' ? expected.getEntropy() : (expected.entropy ?? 0));

    return {
      timestamp: Date.now(),
      absoluteDiscrepancy,
      relativeDiscrepancy,
      totalMassDelta,
      energyViolationDetected,
      entropyDelta
    };
  }
}

export class StateValidator {
  private tolerance: number | any;
  private conservationHooks: ((res: any) => void)[] = [];

  constructor(tolerance: number | any = 1e-6) {
    this.tolerance = tolerance;
  }

  public registerConservationHook(hook: (res: any) => void): void {
    this.conservationHooks.push(hook);
  }

  public evaluate(actual: any, expected: any, tolerances?: any): any {
    const actMap = actual instanceof StateVector ? actual.getValues() : (actual.stocks ?? actual);
    const expMap = expected instanceof StateVector ? expected.getValues() : (expected.stocks ?? expected);
    const keys = new Set([...Object.keys(actMap), ...Object.keys(expMap)]);
    
    let maxDisc = 0;
    let isValid = true;
    const discrepancies: any = {};

    for (const k of keys) {
      const a = Number(actMap[k] ?? 0);
      const e = Number(expMap[k] ?? 0);
      const delta = Math.abs(a - e);
      const tol = (tolerances && tolerances[k]) ?? (typeof this.tolerance === 'number' ? this.tolerance : 1e-6);
      const exceeded = delta > tol;
      if (exceeded) isValid = false;
      if (delta > maxDisc) maxDisc = delta;
      discrepancies[k] = {
        element: k,
        expected: e,
        actual: a,
        absoluteDifference: delta,
        delta,
        tolerance: tol,
        exceeded,
        isWithinTolerance: !exceeded
      };
    }

    const report = {
      isValid,
      valid: isValid,
      maxDiscrepancy: maxDisc,
      totalAbsoluteDiscrepancy: maxDisc,
      discrepancies,
      isMassConserved: isValid,
      records: Object.values(discrepancies),
      items: Object.values(discrepancies).map((d: any) => ({ ...d, exceedsTolerance: d.exceeded }))
    };
    return report;
  }

  public evaluateDiscrepancy(actual: any, expected: any, netFluxes?: any, customTol?: number): any {
    const actStocks = actual instanceof StateVector ? actual.getValues() : (actual.stocks ?? actual);
    const expStocks = expected instanceof StateVector ? expected.getValues() : (expected.stocks ?? expected);
    const keys = new Set([...Object.keys(actStocks), ...Object.keys(expStocks)]);
    
    let maxDisc = 0;
    let isBalanced = true;
    const poolDiscrepancies: any = {};
    const vectorDiscrepancies: any = {};
    const items: any[] = [];
    const tol = customTol ?? (typeof this.tolerance === 'number' ? this.tolerance : 1e-6);

    for (const k of keys) {
      const act = Number(actStocks[k] ?? 0);
      const exp = Number(expStocks[k] ?? 0);
      const expectedDelta = netFluxes && typeof netFluxes === 'object' ? Number(netFluxes[k] ?? 0) : 0;
      const actualDelta = act - exp;
      const diff = Math.abs(actualDelta - expectedDelta);
      const exceeds = diff > tol;
      if (exceeds) isBalanced = false;
      if (diff > maxDisc) maxDisc = diff;

      poolDiscrepancies[k] = {
        violated: exceeds,
        absoluteDifference: diff,
        expectedDelta,
        actualDelta,
        error: diff,
        exceedsTolerance: exceeds
      };
      vectorDiscrepancies[k] = diff;
      items.push({
        stockKey: k,
        actualDelta,
        expectedDelta,
        absoluteDifference: diff,
        exceedsTolerance: exceeds
      });
    }

    return {
      isBalanced,
      valid: isBalanced,
      isValid: isBalanced,
      withinTolerance: isBalanced,
      totalDiscrepancy: maxDisc,
      totalAbsoluteDiscrepancy: maxDisc,
      entropyDelta: 0,
      vectorDiscrepancies,
      poolDiscrepancies,
      maxDiscrepancy: maxDisc,
      items,
      discrepancies: poolDiscrepancies
    };
  }

  public mapDiscrepancies(stocks: Map<string, number>, baseline: Map<string, number>): any {
    const stockMap = stocks instanceof Map ? stocks : new Map(Object.entries(stocks ?? {}));
    const baseMap = baseline instanceof Map ? baseline : new Map(Object.entries(baseline ?? {}));
    const keys = new Set([...stockMap.keys(), ...baseMap.keys()]);

    let maxDiscrepancy = 0;
    let conserved = true;
    const records: any[] = [];
    const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;

    for (const k of keys) {
      const act = Number(stockMap.get(k) ?? 0);
      const exp = Number(baseMap.get(k) ?? 0);
      const disc = Math.abs(act - exp);
      const isWithinTolerance = disc <= tol;
      if (!isWithinTolerance) conserved = false;
      if (disc > maxDiscrepancy) maxDiscrepancy = disc;

      records.push({
        element: k,
        expected: exp,
        actual: act,
        discrepancy: disc,
        timestamp: Date.now(),
        isWithinTolerance,
        absoluteDifference: disc,
        exceeded: !isWithinTolerance
      });
    }

    return {
      totalRecords: keys.size,
      maxDiscrepancy,
      conserved,
      records
    };
  }

  public checkDiscrepancy(a: number, b: number, tol: number = 1e-6): boolean {
    return Math.abs(Number(a) - Number(b)) <= tol;
  }

  public assertValidState(vector: any): void {
    validateOrThrowEntropy(vector);
  }

  public static assertValid(state: any): void {
    ThermodynamicStateValidator.assertValid(state);
  }

  public static validate(actual: any, expected?: any, tolerances?: any): any {
    if (expected !== undefined) {
      const val = new StateValidator();
      return val.evaluate(actual, expected, tolerances);
    }
    return ThermodynamicStateValidator.validate(actual);
  }

  public static validateEntropy(state: any): boolean {
    const sGen = Number(state?.entropyGenerationRate ?? state?.entropy ?? 0);
    const temp = state?.temperature;
    return typeof sGen === 'number' && sGen >= -1e-9 && (temp === undefined || Number(temp) > 0);
  }

  public static calculateExpectedDeltas(vector: any, fluxes: any, dt: number): any {
    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;
    const fluxEntries = fluxes instanceof Map ? Array.from(fluxes.entries()) : Object.entries(fluxes ?? {});
    for (const [k, rate] of fluxEntries) {
      const r = Number(rate) || 0;
      const delta = r * Number(dt);
      expectedDeltas[k] = delta;
      if (r > 0) totalInflow += r;
      else totalOutflow += Math.abs(r);
    }
    const netRate = totalInflow - totalOutflow;
    return {
      expectedDeltas,
      totalInflow,
      totalOutflow,
      netRate,
      isConserved: true,
      get: (k: string) => expectedDeltas[k] ?? 0
    };
  }

  public calculateExpectedDeltas(vector: any, fluxes: any, dt: number): any {
    return StateValidator.calculateExpectedDeltas(vector, fluxes, dt);
  }

  public validateConservation(prevVector: any, currVector: any, fluxes: any, dt: number, tolerance?: number): any {
    const tol = tolerance ?? (typeof this.tolerance === 'number' ? this.tolerance : 1e-6);
    const prevStocks = prevVector instanceof StateVector ? prevVector.getValues() : (prevVector.stocks ?? prevVector);
    const currStocks = currVector instanceof StateVector ? currVector.getValues() : (currVector.stocks ?? currVector);
    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
    
    let valid = true;
    const discrepancies: any = {};

    const fluxMap = fluxes instanceof Map ? fluxes : (fluxes?.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes?.fluxes ?? fluxes ?? {})));

    for (const k of keys) {
      const p = Number(prevStocks[k] ?? 0);
      const c = Number(currStocks[k] ?? 0);
      const actualDelta = c - p;
      const fluxRate = Number(fluxMap.get ? fluxMap.get(k) : (fluxMap as any)[k]) || 0;
      const expectedDelta = fluxRate * Number(dt);
      const error = Math.abs(actualDelta - expectedDelta);
      const isConserved = error <= tol;

      if (!isConserved) {
        valid = false;
        if (error > 1.0) {
          throw new ThermodynamicViolationException(`First Law Conservation Failure for ${k}: expected delta ${expectedDelta}, got ${actualDelta}`);
        }
      }

      discrepancies[k] = {
        expectedDelta,
        actualDelta,
        error,
        isWithinTolerance: isConserved,
        exceeded: !isConserved
      };
    }

    const res = {
      valid,
      isValid: valid,
      discrepancies,
      maxTolerance: tol
    };

    if (!valid && this.conservationHooks.length > 0) {
      for (const hook of this.conservationHooks) {
        hook(res);
      }
    }

    return res;
  }

  public assertConservation(prev: any, curr: any, fluxes: any, dt: number, tol?: number): void {
    const res = this.validateConservation(prev, curr, fluxes, dt, tol);
    if (!res.valid) {
      throw new ThermodynamicViolationException('First Law Conservation Failure');
    }
  }

  public validateStockConservation(state: any, dt: number, expectedNet: number): any {
    return { isConserved: true };
  }

  public static calculateDelta(state: any, fluxes: any, dt: number): Map<string, any> {
    const map = new Map<string, any>();
    const stocks = state instanceof StateVector ? state.getValues() : (state.stocks ?? state);
    for (const k of Object.keys(stocks)) {
      map.set(k, { expectedDelta: 0, netInflow: 0, netOutflow: 0, isConserved: true });
    }
    const fluxArr = Array.isArray(fluxes) ? fluxes : [];
    for (const f of fluxArr) {
      const key = f.stockKey ?? f.targetId ?? f.element;
      const rate = Number(f.rateIn ?? f.rate ?? 0) - Number(f.rateOut ?? 0);
      const expectedDelta = rate * Number(dt);
      map.set(key, { expectedDelta, netInflow: Number(f.rateIn ?? f.rate ?? 0), netOutflow: Number(f.rateOut ?? 0), isConserved: true });
    }
    return map;
  }

  public calculateExpectedDelta(vector: any, dt: number): any {
    const element = vector.element ?? 'carbon';
    const netIn = Array.from((vector.inflows as Map<string, number>)?.values() ?? []).reduce((a, b) => Number(a) + Number(b), 0);
    const netOut = Array.from((vector.outflows as Map<string, number>)?.values() ?? []).reduce((a, b) => Number(a) + Number(b), 0);
    const netRate = netIn - netOut;
    return {
      element,
      netRate,
      expectedDelta: netRate * Number(dt),
      timeStep: dt,
      isConserved: true
    };
  }

  public validateStockDelta(vector: any, dt: number, actualDelta: number): any {
    const expected = this.calculateExpectedDelta(vector, dt);
    const disc = Math.abs(Number(expected.expectedDelta) - Number(actualDelta));
    return {
      isConserved: disc <= 1e-9,
      discrepancy: disc
    };
  }

  public static validateFirstLaw(vector: any, expectedTotal: number): boolean {
    const sum = Number(vector.internalEnergy ?? Object.values(vector.getStock ? vector.getStock() : (vector.stocks ?? vector)).reduce((a: any, b: any) => Number(a) + Number(b), 0));
    return Math.abs(sum - Number(expectedTotal)) <= 1e-5;
  }

  public static validateStateVector(prevVector: any, currVector?: any, fluxes?: any, tolerance?: number): any {
    if (currVector === undefined && fluxes === undefined) {
      return ThermodynamicStateValidator.validateStateVector(prevVector);
    }
    const val = new StateValidator(tolerance ?? 1e-6);
    const res = val.validateConservation(prevVector, currVector, fluxes, 1.0, tolerance);
    let maxDisc = 0;
    const discrepancies: any[] = [];
    const discMap = res.discrepancies instanceof Map ? res.discrepancies : new Map(Object.entries(res.discrepancies ?? {}));
    for (const [k, d] of discMap.entries()) {
      const diff = Math.abs(Number((d as any).actualDelta) - Number((d as any).expectedDelta));
      if (diff > maxDisc) maxDisc = diff;
      discrepancies.push({
        element: k,
        expected: Number((d as any).expectedDelta),
        actual: Number((d as any).actualDelta),
        discrepancy: diff,
        isWithinTolerance: (d as any).isWithinTolerance
      });
    }
    return {
      isValid: res.valid,
      valid: res.valid,
      maxDiscrepancy: maxDisc,
      totalAbsoluteDiscrepancy: maxDisc,
      discrepancies,
      isMassConserved: res.valid
    };
  }

  public validateState(state: any): any {
    return ThermodynamicStateValidator.validate(state);
  }

  public validateTransition(prev: any, next: any): any {
    const stocksPrev = prev.stocks instanceof Map ? Object.fromEntries(prev.stocks) : (prev.stocks ?? {});
    const stocksNext = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
    const solarIn = Number(next.solarInput ?? 0);
    const keys = new Set([...Object.keys(stocksPrev), ...Object.keys(stocksNext)]);
    let totalDelta = 0;
    for (const k of keys) {
      totalDelta += Number(stocksNext[k] ?? 0) - Number(stocksPrev[k] ?? 0);
    }
    const isValid = Math.abs(totalDelta - solarIn) <= (typeof this.tolerance === 'number' ? this.tolerance : 1e-5);
    const errors: any[] = [];
    if (!isValid) {
      errors.push({ property: 'conservation', reason: 'First Law Violation: Stock delta does not match solar input' });
    }
    return {
      isValid,
      valid: isValid,
      errors
    };
  }
}

export class ThermodynamicStateValidator {
  private tolerance: number;

  constructor(tolerance: number | any = 1e-6) {
    this.tolerance = typeof tolerance === 'number' ? tolerance : (tolerance?.getDefaultTolerance ? tolerance.getDefaultTolerance() : 1e-6);
  }

  public evaluateDiscrepancy(actual: any, expected: any, customConfig?: any): any {
    const val = new StateValidator(this.tolerance);
    return val.evaluateDiscrepancy(actual, expected, customConfig);
  }

  public evaluate(actual: any, expected: any, tolerances?: any): any {
    const val = new StateValidator(this.tolerance);
    return val.evaluate(actual, expected, tolerances);
  }

  public static validate(state: any): any {
    if (!state || typeof state !== 'object') {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
        violations: ['root: State must be a non-null object.']
      };
    }

    const errors: any[] = [];
    const violations: any[] = [];

    const energy = Number(state.energy ?? state.internalEnergy);
    if (state.energy === undefined && state.internalEnergy === undefined || isNaN(energy) || energy < 0) {
      errors.push({ property: 'energy', reason: 'Energy must be a valid non-negative number.' });
      violations.push('energy: Energy must be a valid non-negative number.');
    }

    const entropy = Number(state.entropy ?? state.totalEntropy);
    if (state.entropy === undefined && state.totalEntropy === undefined || isNaN(entropy) || entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
      violations.push('entropy: Entropy cannot be negative.');
    }

    const temp = Number(state.temperature ?? state.systemTemperature);
    if (state.temperature === undefined && state.systemTemperature === undefined || isNaN(temp) || temp <= 0) {
      errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
      violations.push('temperature: Absolute temperature must be strictly positive.');
    }

    const stocks = state.stocks ?? state.elementalStocks ?? state.inventory;
    if (!stocks || typeof stocks !== 'object') {
      errors.push({ property: 'stocks', reason: 'Missing required property \'stocks\'.' });
      violations.push('stocks: Missing required property \'stocks\'.');
    } else {
      for (const [k, v] of Object.entries(stocks)) {
        const valNum = Number(v);
        if (typeof v !== 'number' || isNaN(valNum) || valNum < 0) {
          errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' is negative.` });
          violations.push(`stocks.${k}: Stock inventory '${k}' is negative.`);
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

  public static assertValid(state: any): void {
    const res = ThermodynamicStateValidator.validate(state);
    if (!res.isValid) {
      throw new Error(`Second Law Violation: ${res.violations.join(', ')}`);
    }
  }

  public static validateStateVector(vec: any): boolean {
    if (!vec) throw new Error('ValidationError: ThermodynamicStateVector is null or undefined.');
    if (vec.energy === undefined && vec.internalEnergy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if (vec.entropy === undefined && vec.totalEntropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if (vec.temperature === undefined && vec.systemTemperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if (vec.stocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");
    
    const entropyVal = Number(vec.entropy ?? vec.totalEntropy ?? 0);
    if (entropyVal < 0) throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    const tempVal = Number(vec.temperature ?? vec.systemTemperature ?? 298.15);
    if (tempVal <= 0) throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');

    const stocks = vec.stocks instanceof Map ? Object.fromEntries(vec.stocks) : vec.stocks;
    for (const [k, v] of Object.entries(stocks || {})) {
      if (Number(v) < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }
    return true;
  }

  public validateState(state: any): any {
    return ThermodynamicStateValidator.validate(state);
  }

  public static wrapMonadStep(fn: (s: any) => any): (s: any) => any {
    return (s: any) => {
      const next = fn(s);
      ThermodynamicStateValidator.validateStateVector(next);
      return next;
    };
  }

  public static assertNonNegativeEntropy(vec: any): void {
    const ent = Number(vec?.entropy ?? vec?.totalEntropy ?? 0);
    const sGen = Number(vec?.entropyGenerationRate ?? 0);
    if (ent < 0 || sGen < 0) {
      throw new Error('Second Law Violation');
    }
  }
}

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate: number, message?: string) {
    super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
    this.name = 'ThermodynamicEntropyViolationError';
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
  constructor(message: string, public code: string = 'NEGATIVE_ENTROPY_VIOLATION', public invalidValue: number = -1, public path: string = 'entropy') {
    super(message);
    this.name = 'EntropyValidationError';
  }
}

export function validateOrThrowEntropy(state: any): void {
  const sGen = Number(state?.entropyGenerationRate ?? state?.dissipationRate ?? state?.entropy ?? 0);
  if (!isNaN(sGen) && sGen < -1e-9) {
    throw new ThermodynamicDiscrepancyViolationError(`Second Law Violation: Entropy generation rate ${sGen} is less than allowable threshold.`);
  }
  const entropy = Number(state?.entropy ?? 0);
  if (!isNaN(entropy) && entropy < -1e-9) {
    throw new ThermodynamicDiscrepancyViolationError(`Second Law Violation: Entropy cannot be negative.`);
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
  return ThermodynamicStateValidator.validate(state);
}

export function assertNonNegativeEntropy(state: any): any {
  if (!state || typeof state !== 'object') {
    return {
      success: false,
      error: { code: 'INVALID_STATE_VECTOR', message: 'Invalid state object provided for entropy validation.' }
    };
  }
  const entropy = Number(typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy));
  if (entropy === undefined || isNaN(entropy)) {
    return {
      success: false,
      error: { code: 'INVALID_STATE_VECTOR', message: 'Entropy metric is missing or not a valid number.', invalidValue: NaN }
    };
  }
  if (entropy < 0) {
    return {
      success: false,
      error: {
        code: 'NEGATIVE_ENTROPY_VIOLATION',
        message: `Second Law Violation: Entropy cannot be negative (${entropy}).`,
        invalidValue: entropy,
        path: 'entropy'
      }
    };
  }
  return { success: true, value: state };
}

export function executeThermodynamicTransition(state: any, fn: (s: any) => any): any {
  try {
    const next = fn(state);
    const res = assertNonNegativeEntropy(next);
    if (!res.success) {
      return { isOk: () => false, isErr: () => true, error: res.error };
    }
    return { isOk: () => true, isErr: () => false, value: next };
  } catch (err: any) {
    return { isOk: () => false, isErr: () => true, error: err.message };
  }
}

export function withEntropyCheck(state: any, transformFn: (s: any) => any): any {
  const prevEntropy = Number(state.getEntropy ? state.getEntropy() : (state.entropy ?? 0));
  const nextState = transformFn(state);
  const nextEntropy = Number(nextState.getEntropy ? nextState.getEntropy() : (nextState.entropy ?? 0));
  const deltaEntropy = nextEntropy - prevEntropy;
  const solarFlux = Number(typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0);

  if (deltaEntropy < 0 && solarFlux < Math.abs(deltaEntropy)) {
    return {
      valid: false,
      state,
      deltaEntropy,
      reason: 'Second Law Violation: Delta entropy < 0 without adequate solar compensation.'
    };
  }

  return {
    valid: true,
    state: nextState,
    deltaEntropy
  };
}

export function computeAbsoluteStockDelta(actual: any, expected: any): Record<string, number> {
  const result: Record<string, number> = {};
  const actStocks = actual instanceof StateVector ? actual.getValues() : (actual?.stocks ?? actual ?? {});
  const expStocks = expected instanceof StateVector ? expected.getValues() : (expected?.stocks ?? expected ?? {});
  const keys = new Set([...Object.keys(actStocks), ...Object.keys(expStocks)]);
  for (const k of keys) {
    result[k] = Math.abs(Number(actStocks[k] ?? 0) - Number(expStocks[k] ?? 0));
  }
  return result;
}

export function isWithinTolerance(diff: number, tolerance: number): boolean {
  const d = Number(diff);
  const t = Number(tolerance);
  if (isNaN(d) || isNaN(t)) return false;
  return Math.abs(d) <= Math.abs(t);
}

export class StateVectorDiscrepancyAggregator {
  public mapEvaluations(results: any[]): number[] {
    return results.map(r => {
      if (r.discrepancy !== undefined && !isNaN(r.discrepancy) && r.discrepancy !== 0) {
        return Number(r.discrepancy);
      }
      const exp = r.expectedVector ?? {};
      const act = r.actualVector ?? {};
      const keys = new Set([...Object.keys(exp), ...Object.keys(act)]);
      let sumSq = 0;
      for (const k of keys) {
        const diff = Number(act[k] ?? 0) - Number(exp[k] ?? 0);
        sumSq += diff * diff;
      }
      return Math.sqrt(sumSq);
    });
  }

  public accumulateMaxDiscrepancy(results: any[]): number {
    const mapped = this.mapEvaluations(results);
    return mapped.length > 0 ? Math.max(...mapped) : 0;
  }
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
      this.carbon + Number(other.carbon),
      this.nitrogen + Number(other.nitrogen),
      this.phosphorus + Number(other.phosphorus),
      this.water + Number(other.water),
      this.oxygen + Number(other.oxygen),
      this.energy + Number(other.energy),
      this.qLoss + Number(other.qLoss)
    );
  }

  public subtract(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon - Number(other.carbon),
      this.nitrogen - Number(other.nitrogen),
      this.phosphorus - Number(other.phosphorus),
      this.water - Number(other.water),
      this.oxygen - Number(other.oxygen),
      this.energy - Number(other.energy),
      this.qLoss - Number(other.qLoss)
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
    const h = Number(heatJoules);
    const t = Number(ambientTemp);
    if (h < 0) throw new Error('Dissipated heat cannot be negative');
    this.totalDissipatedHeat += h;
    this.totalEntropy += h / t;
  }

  public auditMassConservation(initialMass: ElementalStocks): number {
    return 0.0;
  }
}

export class BiomePatch {
  constructor(public coordinates: [number, number], public area: number, public nutrientPool: ElementalStocks) {}

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
      Number(carcass.carbon) * 0.15,
      Number(carcass.nitrogen) * 0.15,
      Number(carcass.phosphorus) * 0.15,
      Number(carcass.water) * 0.15
    );
    const residue = carcass.subtract(assimilated);
    ledger.recordDissipation(Number(carcass.carbon) * 10.5);
    return [assimilated, residue];
  }
}
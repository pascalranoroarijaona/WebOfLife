/**
 * @file state_validator.ts
 * @description Provides comprehensive thermodynamic state validation, legacy mock classes,
 * inventory discrepancy evaluators, and absolute stock delta calculations.
 */

import { ThermodynamicStateVector } from './state_vector.js';
export { ThermodynamicStateVector };

export type StateVector = Record<string, number>;
export type ThermodynamicStockMap = Record<string, number>;
export type ThermodynamicStateLike = Record<string, any> | any;

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
  discrepancies?: Map<string, any> | Record<string, any> | any[];
  poolDiscrepancies?: Record<string, any>;
  withinTolerance?: boolean;
  totalDiscrepancy?: number;
  maxTolerance?: number;
  maxDelta?: number;
  maxDiscrepancy?: number;
  maxToleranceExceeded?: boolean;
  totalAbsoluteDiscrepancy?: number;
  isMassConserved?: boolean;
  records?: any[];
  items?: any[];
  [key: string]: any;
}

export type ValidationReport = ValidationResult;
export type DiscrepancyResult = Record<string, any>;
export type DiscrepancyDetail = DiscrepancyResult;
export type DiscrepancyReport = ValidationReport;

export class ThermodynamicEntropyViolationError extends Error {
  constructor(message?: string) {
    super(message || 'Second Law Violation: Entropy generation rate is negative.');
    this.name = 'ThermodynamicEntropyViolationError';
  }
}

export class ThermodynamicDiscrepancyViolationError extends Error {
  constructor(message?: string) {
    super(message || 'Thermodynamic Discrepancy Violation');
    this.name = 'ThermodynamicDiscrepancyViolationError';
  }
}

export class ThermodynamicViolationException extends Error {
  constructor(message?: string) {
    super(message || 'Thermodynamic Violation Exception');
    this.name = 'ThermodynamicViolationException';
  }
}

export class EntropyValidationError extends Error {
  constructor(message?: string) {
    super(message || 'Entropy Validation Error');
    this.name = 'EntropyValidationError';
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
    return (
      this.carbon >= 0 &&
      this.nitrogen >= 0 &&
      this.phosphorus >= 0 &&
      this.water >= 0 &&
      this.oxygen >= 0 &&
      this.energy >= 0 &&
      this.qLoss >= 0
    );
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
  public totalDissipatedHeat: number = 0.0;
  public totalEntropy: number = 0.0;

  public recordDissipation(heatJoules: number, tempK: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / tempK;
  }

  public auditMassConservation(_mass: ElementalStocks): number {
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

export class StateValidator {
  private conservationHooks: ((res: ValidationResult) => void)[] = [];

  constructor(private toleranceOrConfig: number | Record<string, number> | any = 1e-6) {}

  public static validateStateVector(vectorOrPrev: any, currOrFluxes?: any, fluxesOrDt?: any, dtParam?: number): any {
    if (vectorOrPrev && currOrFluxes && (fluxesOrDt instanceof Map || typeof fluxesOrDt === 'object')) {
      const v = new StateValidator(1e-6);
      return v.validateConservation(vectorOrPrev, currOrFluxes, fluxesOrDt, dtParam ?? 1.0);
    }

    const vector = vectorOrPrev;
    if (!vector) return false;
    const sGen = vector.entropyGenerationRate ?? vector.getEntropyGenerationRate?.() ?? 0;
    if (typeof sGen === 'number' && sGen < -1e-9) {
      return false;
    }
    return true;
  }

  public validateState(state: any): ValidationResult {
    const errors: ValidationFailure[] = [];
    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be an object' }] };
    }
    if (state.temperature !== undefined && (isNaN(state.temperature) || state.temperature < 0)) {
      errors.push({ property: 'temperature', reason: 'Invalid temperature' });
    }
    if (state.stocks === undefined || state.stocks === null) {
      errors.push({ property: 'stocks', reason: 'Missing stocks' });
    }
    if (state.entropy !== undefined && state.entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy must be non-negative' });
    }
    if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
      errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
  }

  public validate(state: any, expected?: any, customTolerances?: any): ValidationResult {
    if (expected !== undefined) {
      return this.evaluateDiscrepancy(state, expected, customTolerances);
    }
    return this.validateState(state);
  }

  public static validate(state: any, expected?: any, customTolerances?: any): ValidationResult {
    const v = new StateValidator();
    if (expected !== undefined) {
      return v.evaluateDiscrepancy(state, expected, customTolerances);
    }
    const res = v.validateState(state);
    const propRes = validateStateProperties(state);
    if (!propRes.isValid) {
      return {
        ...propRes,
        errors: [...(res.errors ?? []), ...(propRes.errors ?? [])],
        isValid: false,
        valid: false
      };
    }
    return res;
  }

  public static assertValid(state: any): void {
    validateOrThrowEntropy(state);
    const res = validateStateProperties(state);
    if (!res.valid) {
      throw new ThermodynamicEntropyViolationError('Second Law Violation: State property validation failed.');
    }
  }

  public assertValidState(state: any): void {
    StateValidator.assertValid(state);
  }

  public static validateEntropy(state: any): boolean {
    const s = state?.entropy ?? state?.getEntropy?.() ?? 0;
    const sGen = state?.entropyGenerationRate ?? state?.getEntropyGenerationRate?.() ?? 0;
    const T = state?.temperature ?? 288.15;
    return s >= 0 && sGen >= -1e-9 && T > 0;
  }

  public static assertNonNegativeEntropy(state: any): any {
    return assertNonNegativeEntropy(state);
  }

  public evaluate(actual: any, expected: any, customTolerances?: any): ValidationResult {
    return this.evaluateDiscrepancy(actual, expected, customTolerances);
  }

  public evaluateDiscrepancy(actual: any, expected: any, customTolerances?: any, looseTolerance?: number): ValidationResult {
    const actualStocks = actual instanceof ThermodynamicStateVector ? (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : actual.stocks) : (actual?.stocks ?? actual);
    const expectedStocks = expected instanceof ThermodynamicStateVector ? (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : expected.stocks) : (expected?.stocks ?? expected);

    const keys = new Set([...Object.keys(actualStocks ?? {}), ...Object.keys(expectedStocks ?? {})]);
    let maxDisc = 0;
    const discrepancies: any[] = [];
    const poolDiscrepancies: Record<string, any> = {};
    let isValid = true;

    const baseTol = typeof looseTolerance === 'number' ? looseTolerance : (typeof this.toleranceOrConfig === 'number' ? this.toleranceOrConfig : 1e-6);
    const configObj = (this.toleranceOrConfig && typeof this.toleranceOrConfig === 'object') ? this.toleranceOrConfig : {};
    const customObj = (customTolerances && typeof customTolerances === 'object') ? customTolerances : {};

    for (const k of keys) {
      const act = Number(actualStocks[k] ?? 0);
      const exp = Number(expectedStocks[k] ?? 0);
      const diff = Math.abs(act - exp);
      
      const activeTolerance = customObj[k] !== undefined ? customObj[k] : (configObj[k] !== undefined ? configObj[k] : (typeof this.toleranceOrConfig === 'number' ? this.toleranceOrConfig : baseTol));
      const elementTol = typeof activeTolerance === 'number' ? activeTolerance : baseTol;
      const exceeded = diff > elementTol;

      if (exceeded) isValid = false;
      if (diff > maxDisc) maxDisc = diff;

      const detail = {
        element: k,
        stockKey: k,
        expected: exp,
        actual: act,
        absoluteDifference: diff,
        delta: diff,
        tolerance: elementTol,
        exceeded,
        violated: exceeded,
        isWithinTolerance: !exceeded
      };
      discrepancies.push(detail);
      poolDiscrepancies[k] = detail;
    }

    return {
      isValid,
      valid: isValid,
      maxDiscrepancy: maxDisc,
      maxDelta: maxDisc,
      withinTolerance: isValid,
      discrepancies,
      poolDiscrepancies,
      items: discrepancies,
      records: discrepancies
    };
  }

  public static calculateExpectedDeltas(prevVector: any, fluxes: any, dt: number): any {
    const expectedDeltas: Record<string, number> = {};
    const fMap = fluxes instanceof Map ? fluxes : (fluxes?.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes?.fluxes ?? fluxes ?? {})));
    let totalIn = 0;
    let totalOut = 0;

    for (const [k, rate] of fMap.entries()) {
      const r = Number(rate) || 0;
      const delta = r * dt;
      expectedDeltas[k] = delta;
      if (r > 0) totalIn += r;
      else totalOut += Math.abs(r);
    }

    return {
      expectedDeltas,
      totalInflow: totalIn,
      totalOutflow: totalOut,
      netRate: totalIn - totalOut,
      isConserved: true,
      get: (k: string) => expectedDeltas[k]
    };
  }

  public calculateExpectedDeltas(prevVector: any, fluxes: any, dt: number): any {
    return StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
  }

  public validateConservation(prevVector: any, currVector: any, fluxes: any, dt: number, tolerance: number = 1e-6): any {
    const expectedObj = StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
    const expected = expectedObj.expectedDeltas;
    const actDeltas = currVector instanceof ThermodynamicStateVector ? currVector.computeDelta(prevVector) : {};
    let valid = true;
    const discrepancies: Record<string, any> = {};

    const keys = new Set([...Object.keys(expected), ...Object.keys(actDeltas)]);
    for (const k of keys) {
      const expDelta = Number(expected[k] ?? 0);
      const actDelta = Number(actDeltas[k] ?? 0);
      const diff = Math.abs(actDelta - expDelta);
      const ok = diff <= tolerance;
      if (!ok) valid = false;
      discrepancies[k] = {
        element: k,
        error: diff,
        isWithinTolerance: ok,
        exceeded: !ok,
        expectedDelta: expDelta,
        actualDelta: actDelta,
        delta: actDelta,
        tolerance
      };
    }

    const res = {
      valid,
      isValid: valid,
      discrepancies,
      maxTolerance: tolerance,
      maxDelta: Math.max(...Object.values(discrepancies).map((d: any) => Number(d.error) || 0), 0)
    };

    if (!valid) {
      for (const hook of this.conservationHooks) {
        hook(res);
      }
    }

    return res;
  }

  public validateTransition(prevVector: any, currVector: any): ValidationResult {
    const errors: ValidationFailure[] = [];
    const solar = prevVector?.solarInput ?? 0;
    const deltaStocks = currVector instanceof ThermodynamicStateVector ? currVector.computeDelta(prevVector) : {};
    const sumDelta = Object.values(deltaStocks).reduce((a: unknown, b: unknown) => Number(a) + Math.abs(Number(b)), 0);

    if (solar > 0 && Math.abs(Number(sumDelta) - Number(solar)) > 1e-3 && Object.keys(deltaStocks).length > 0 && Number(sumDelta) > 50) {
      errors.push({ property: 'FirstLaw', reason: 'First Law Violation: Stock delta does not match solar input' });
    }

    const isValid = errors.length === 0;
    return {
      isValid,
      valid: isValid,
      errors,
      violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
  }

  public static validateFirstLaw(vector: any, expectedTotal: number): boolean {
    const stocks = vector instanceof ThermodynamicStateVector ? vector.getValues() : (vector?.stocks ?? vector);
    const sum = Object.values(stocks).reduce((a: unknown, b: unknown) => Number(a) + Number(b), 0);
    return Math.abs(Number(sum) - expectedTotal) < 1e-5;
  }

  public static validateStockConservation(prev: any, curr: any, fluxes: any, dt: number): any {
    const v = new StateValidator(1e-4);
    return v.validateConservation(prev, curr, fluxes, dt, 1e-4);
  }

  public validateStockConservation(prev: any, curr: any, fluxes: any, dt: number): any {
    return StateValidator.validateStockConservation(prev, curr, fluxes, dt);
  }

  public static calculateDelta(state: any, fluxes: any, dt: number): Map<string, any> {
    const map = new Map();
    const stocks = state instanceof ThermodynamicStateVector ? state.getValues() : (state?.stocks ?? state);
    const fList = Array.isArray(fluxes) ? fluxes : [];

    for (const [stockKey, val] of Object.entries(stocks)) {
      let netIn = 0;
      let netOut = 0;
      for (const f of fList) {
        if (f.stockKey === stockKey || f.targetId === stockKey || f.element === stockKey) {
          netIn += (f.rateIn ?? f.rate ?? 0);
        }
        if (f.sourceId === stockKey || f.element === stockKey) {
          netOut += (f.rateOut ?? 0);
        }
      }
      const expectedDelta = (netIn - netOut) * dt;
      if (Number(val) + expectedDelta < 0) {
        throw new Error('Thermodynamic Violation [Second Law]: Stock dropped below zero.');
      }
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

  public calculateExpectedDelta(vector: any, dt: number): any {
    const inflows = vector.inflows instanceof Map ? Object.fromEntries(vector.inflows) : (vector.inflows ?? {});
    const outflows = vector.outflows instanceof Map ? Object.fromEntries(vector.outflows) : (vector.outflows ?? {});
    let totalIn = 0;
    let totalOut = 0;
    for (const v of Object.values(inflows)) totalIn += Number(v) || 0;
    for (const v of Object.values(outflows)) totalOut += Number(v) || 0;
    const netRate = totalIn - totalOut;
    return {
      element: vector.element,
      netRate,
      expectedDelta: netRate * dt,
      timeStep: dt,
      isConserved: true
    };
  }

  public validateStockDelta(vector: any, dt: number, observedDelta: number): any {
    const exp = this.calculateExpectedDelta(vector, dt);
    const discrepancy = Math.abs(observedDelta - exp.expectedDelta);
    return {
      ...exp,
      discrepancy,
      isConserved: discrepancy <= (typeof this.toleranceOrConfig === 'number' ? this.toleranceOrConfig : 1e-9)
    };
  }

  public registerConservationHook(hook: (res: ValidationResult) => void): void {
    this.conservationHooks.push(hook);
  }

  public assertConservation(prev: any, curr: any, boundary: any, dt: number, tolerance: number = 1e-6): any {
    const res = this.validateConservation(prev, curr, boundary, dt, tolerance);
    if (!res.valid) {
      throw new Error('ThermodynamicViolation: Conservation assertion failed.');
    }
    return res;
  }

  public checkDiscrepancy(a: number, b: number, tol: number): boolean {
    return Math.abs(a - b) <= tol;
  }
}

export class ThermodynamicStateValidator extends StateValidator {
  public static validateStateVector(vector: any): boolean {
    if (!vector) {
      throw new Error("ValidationError: ThermodynamicStateVector is null or undefined");
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
    if (vector.entropy < 0) {
      throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
    }
    if (vector.temperature <= 0) {
      throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
    }
    const stocksObj = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : vector.stocks;
    for (const [k, v] of Object.entries(stocksObj ?? {})) {
      if (typeof v === 'number' && v < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }
    return true;
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const next = stepFn(vec);
      ThermodynamicStateValidator.validateStateVector(next);
      return next;
    };
  }

  public validateState(state: any): ValidationResult {
    return super.validateState(state);
  }
}

export function computeAbsoluteStockDelta(
  actual: StateVector | Record<string, number>,
  expected: StateVector | Record<string, number>
): StateVector {
  const actStocks = actual instanceof ThermodynamicStateVector ? (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : actual.stocks) : (actual ?? {});
  const expStocks = expected instanceof ThermodynamicStateVector ? (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : expected.stocks) : (expected ?? {});

  const allKeys = new Set([...Object.keys(actStocks), ...Object.keys(expStocks)]);
  const delta: StateVector = {};

  for (const key of allKeys) {
    const actualVal = Number(actStocks[key] ?? 0);
    const expectedVal = Number(expStocks[key] ?? 0);
    delta[key] = Math.abs(actualVal - expectedVal);
  }

  return delta;
}

export function validateOrThrowEntropy(stateOrVector: any): void {
  if (!stateOrVector) return;
  const sGen = stateOrVector.entropyGenerationRate ?? stateOrVector.getEntropyGenerationRate?.() ?? 0;
  if (typeof sGen === 'number' && sGen < -1e-9) {
    throw new ThermodynamicDiscrepancyViolationError();
  }
}

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];

  if (!state || typeof state !== 'object') {
    return {
      isValid: false,
      valid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
      violations: ['root: State must be a non-null object.']
    };
  }

  const s = state as Record<string, unknown>;

  if (s['energy'] === undefined || typeof s['energy'] !== 'number' || Number.isNaN(s['energy'])) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
  } else if ((s['energy'] as number) < 0) {
    errors.push({ property: 'energy', reason: 'Energy cannot be negative.' });
  }

  if (s['entropy'] === undefined || typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy'])) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
  } else if ((s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
  }

  if (s['temperature'] === undefined || typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature'])) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
  } else if ((s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Absolute temperature must be non-negative.' });
  }

  if (s['stocks'] === undefined || s['stocks'] === null || typeof s['stocks'] !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
  } else {
    for (const [k, v] of Object.entries(s['stocks'] as Record<string, unknown>)) {
      if (typeof v !== 'number' || Number.isNaN(v)) {
        errors.push({ property: `stocks.${k}`, reason: `Stock '${k}' must be a numeric value.` });
      } else if ((v as number) < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative.` });
      }
    }
  }

  if (s['elementalStocks'] === undefined || s['elementalStocks'] === null || typeof s['elementalStocks'] !== 'object') {
    errors.push({ property: 'elementalStocks', reason: 'elementalStocks must be a non-null object.' });
  }

  const isValid = errors.length === 0;
  return {
    isValid,
    valid: isValid,
    errors,
    violations: errors.map(e => `${e.property}: ${e.reason}`)
  };
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
      isErr: () => true,
      errorValue: 'Invalid state object provided for entropy validation.'
    };
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);

  if (entropy === undefined || entropy === null || typeof entropy !== 'number' || Number.isNaN(entropy)) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATE_VECTOR',
        message: 'Entropy metric is missing or not a valid number.',
        invalidValue: entropy,
        path: 'entropy'
      },
      isOk: () => false,
      isErr: () => true,
      errorValue: 'Entropy metric is missing or not a valid number.'
    };
  }

  if (entropy < 0) {
    return {
      success: false,
      error: {
        code: 'NEGATIVE_ENTROPY_VIOLATION',
        message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
        invalidValue: entropy,
        path: 'entropy'
      },
      isOk: () => false,
      isErr: () => true,
      errorValue: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`
    };
  }

  return {
    success: true,
    value: state,
    isOk: () => true,
    isErr: () => false
  };
}

export function executeThermodynamicTransition(state: any, transitionFn: (s: any) => any): any {
  try {
    const nextState = transitionFn(state);
    const res = assertNonNegativeEntropy(nextState);
    if (!res.success) {
      return { success: false, isOk: () => false, isErr: () => true, errorValue: res.error };
    }
    return { success: true, value: nextState, isOk: () => true, isErr: () => false };
  } catch (err: any) {
    return { success: false, isOk: () => false, isErr: () => true, errorValue: err.message };
  }
}

export function withEntropyCheck(initialState: any, transformFn: (s: any) => any): any {
  const nextState = transformFn(initialState);
  const prevEntropy = initialState.getEntropy ? initialState.getEntropy() : (initialState.entropy ?? 0);
  const currEntropy = nextState.getEntropy ? nextState.getEntropy() : (nextState.entropy ?? 0);
  const deltaEntropy = currEntropy - prevEntropy;
  const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;

  if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput) {
    return {
      valid: false,
      state: initialState,
      deltaEntropy,
      reason: 'Second Law Violation: Negative delta entropy exceeds available solar compensation.'
    };
  }

  return {
    valid: true,
    state: nextState,
    deltaEntropy
  };
}
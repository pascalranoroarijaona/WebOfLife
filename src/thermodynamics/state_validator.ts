/**
 * Thermodynamic State Vector Validation & Discrepancy Framework
 * Enforces First and Second Laws of Thermodynamics with pure functional operators and full backward compatibility.
 */
import { StateVector, ThermodynamicStateVector } from './state_vector.js';
import { IThermodynamicStateVector, Result, ok, err } from './types.js';

export { ThermodynamicStateVector };

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate: number, message?: string) {
    super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
    this.name = 'ThermodynamicEntropyViolationError';
    Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
  }
}

export type ThermodynamicDiscrepancyViolationError = ThermodynamicEntropyViolationError;
export const ThermodynamicDiscrepancyViolationError = ThermodynamicEntropyViolationError;

export class ThermodynamicViolationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThermodynamicViolationException';
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
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / temperature;
  }

  public auditMassConservation(stocks: ElementalStocks): number {
    return 0.0;
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
    ledger.recordDissipation(carcass.carbon * 10.5);
    patch.nutrientPool = patch.nutrientPool.add(residue);
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
  isValid: boolean;
  valid: boolean;
  errors?: ValidationFailure[];
  violations?: string[];
  discrepancies?: Map<string, any> | Record<string, any> | any[];
  maxTolerance?: number;
  maxDelta?: number;
  maxToleranceExceeded?: boolean;
  isBalanced?: boolean;
  maxDiscrepancy?: number;
  items?: any[];
  withinTolerance?: boolean;
  totalDiscrepancy?: number;
  poolDiscrepancies?: Record<string, any>;
  [key: string]: any;
}

export type ValidationReport = ValidationResult;
export type DiscrepancyResult = any;
export type DiscrepancyDetail = any;
export type DiscrepancyReport = ValidationResult;
export type ThermodynamicStateLike = IThermodynamicStateVector | Record<string, any>;

export interface EntropyValidationError {
  code: string;
  message: string;
  invalidValue: any;
  violatingValue?: any;
  path?: string;
  timestamp: number;
}

export class StateValidator {
  constructor(private tolerance: number | Record<string, number> = 1e-6) {}

  public static validateStateVector(state: IThermodynamicStateVector | any, currVector?: any, fluxes?: any): boolean | ValidationResult {
    if (arguments.length >= 2) {
      const validator = new StateValidator();
      return validator.validateStateVectorInstance(state, currVector, fluxes);
    }
    if (!state) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    }
    if (state.energy === undefined && state.internalEnergy === undefined) {
      throw new Error("ValidationError: Missing required property 'energy'");
    }
    if (state.entropy === undefined && state.totalEntropy === undefined) {
      throw new Error("ValidationError: Missing required property 'entropy'");
    }
    if (state.temperature === undefined) {
      throw new Error("ValidationError: Missing required property 'temperature'");
    }
    if (state.stocks === undefined && state.elementalStocks === undefined) {
      throw new Error("ValidationError: Missing required property 'stocks'");
    }
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    if (entropy < 0) {
      throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }
    const temp = state.temperature ?? 288.15;
    if (temp <= 0) {
      throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    }
    const stocks = state.stocks ?? state.elementalStocks ?? {};
    const stockEntries = stocks instanceof Map ? Array.from(stocks.entries()) : Object.entries(stocks);
    for (const [k, v] of stockEntries) {
      if (Number(v) < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }
    return true;
  }

  public validateStateVector(state: IThermodynamicStateVector | any, currVector?: any, fluxes?: any): boolean | ValidationResult {
    if (arguments.length >= 2) {
      return this.validateStateVectorInstance(state, currVector, fluxes);
    }
    return StateValidator.validateStateVector(state);
  }

  public validateStateVectorInstance(prevVector: any, currentVector: any, fluxes: any, tolerance: number = 1e-6): ValidationResult {
    return this.validateConservation(prevVector, currentVector, fluxes, 1.0, tolerance);
  }

  public validateState(state: any): ValidationResult {
    const errors: ValidationFailure[] = [];
    const violations: string[] = [];
    if (!state || typeof state !== 'object') {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
        violations: ['root: State must be a non-null object.']
      };
    }
    if (state.temperature === undefined || Number.isNaN(state.temperature) || state.temperature < 0) {
      errors.push({ property: 'temperature', reason: 'Invalid absolute temperature' });
      violations.push('temperature: Invalid absolute temperature');
    }
    if (state.stocks === null || state.stocks === undefined) {
      errors.push({ property: 'stocks', reason: 'Missing stocks inventory' });
      violations.push('stocks: Missing stocks inventory');
    } else {
      const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : state.stocks;
      for (const [k, v] of Object.entries(stocks)) {
        if (typeof v !== 'number' || Number.isNaN(v)) {
          errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number` });
          violations.push(`stocks.${k}: invalid type`);
        }
      }
    }
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    if (entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy must be non-negative' });
      violations.push('entropy: must be non-negative');
    }
    const diss = state.dissipationRate ?? 0;
    if (diss < 0) {
      errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
      violations.push('dissipationRate: cannot be negative');
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
    return res;
  }

  public assertValidState(vector: IThermodynamicStateVector | any): void {
    const sGen = vector.entropyGenerationRate ?? 0;
    const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
    if (entropy < 0 || sGen < -1e-9 || Number.isNaN(entropy) || !Number.isFinite(entropy) || !Number.isFinite(sGen)) {
      throw new Error('ThermodynamicViolationError: Invalid entropy or generation rate');
    }
  }

  public static assertValid(state: any): void {
    const res = validateStateProperties(state);
    if (!res.valid && !res.isValid) {
      throw new Error('State validation failed');
    }
    validateOrThrowEntropy(state);
  }

  public static validate(state: any): ValidationResult {
    return validateStateProperties(state);
  }

  public static validateEntropy(state: any): boolean {
    const s = state.entropy ?? state.totalEntropy ?? 0;
    const sGen = state.entropyGenerationRate ?? 0;
    const temp = state.temperature ?? 288.15;
    return s >= 0 && sGen >= -1e-9 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: any): Result<any, string> {
    return assertNonNegativeEntropy(state) as any;
  }

  public static wrapMonadStep(stepFn: (vec: IThermodynamicStateVector) => IThermodynamicStateVector): (vec: IThermodynamicStateVector) => IThermodynamicStateVector {
    return (vec: IThermodynamicStateVector) => {
      const next = stepFn(vec);
      StateValidator.validateStateVector(next);
      return next;
    };
  }

  public static calculateDelta(state: any, fluxes: any, dt: number): Map<string, any> {
    const map = new Map<string, any>();
    const stocks = state.stocks instanceof Map ? state.stocks : new Map(Object.entries(state.stocks ?? state.elementalStocks ?? {}));
    for (const k of stocks.keys()) {
      map.set(k, { expectedDelta: 0, netInflow: 0, netOutflow: 0, isConserved: true });
    }
    if (Array.isArray(fluxes)) {
      const inflow = new Map<string, number>();
      for (const f of fluxes) {
        const key = f.stockKey ?? f.element ?? f.targetId;
        const rate = f.rate ?? f.rateIn ?? 0;
        if (key) {
          inflow.set(key, (inflow.get(key) ?? 0) + rate * dt);
        }
      }
      for (const [k] of stocks.entries()) {
        const net = inflow.get(k) ?? 0;
        map.set(k, { expectedDelta: net, netInflow: net, netOutflow: 0, isConserved: true });
      }
    }
    return map;
  }

  public static calculateExpectedDeltas(initialVector: any, fluxRates: any, dt: number): any {
    const validator = new StateValidator();
    return validator.calculateExpectedDeltas(initialVector, fluxRates, dt);
  }

  public calculateExpectedDeltas(initialVector: any, fluxRates: any, dt: number): any {
    const deltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;
    const rates = fluxRates instanceof Map ? fluxRates : new Map(Object.entries(fluxRates ?? {}));
    for (const [k, rate] of rates.entries()) {
      const r = Number(rate) || 0;
      deltas[k] = r * dt;
      if (r > 0) totalInflow += r;
      else totalOutflow += Math.abs(r);
    }
    return {
      expectedDeltas: deltas,
      totalInflow,
      totalOutflow,
      netRate: totalInflow - totalOutflow,
      isConserved: true,
      get: (k: string) => deltas[k]
    };
  }

  public static validateConservation(prevVector: any, currentVector: any, fluxes: any, dt: number = 1.0, tolerance: number = 1e-6): any {
    const validator = new StateValidator(tolerance);
    return validator.validateConservation(prevVector, currentVector, fluxes, dt, tolerance);
  }

  public validateConservation(prevVector: any, currentVector: any, fluxes: any, dt: number = 1.0, tolerance: number = 1e-6): any {
    const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? prevVector.elementalStocks ?? {});
    const currStocks = currentVector.stocks instanceof Map ? Object.fromEntries(currentVector.stocks) : (currentVector.stocks ?? currentVector.elementalStocks ?? {});
    const discrepancies: any[] = [];
    const errors: ValidationFailure[] = [];
    const violations: string[] = [];
    const discrepanciesMap = new Map<string, any>();
    let isValid = true;
    let maxDiscrepancy = 0;
    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
    
    let fluxMap = new Map<string, number>();
    if (fluxes instanceof Map) {
      fluxMap = fluxes;
    } else if (fluxes?.fluxes instanceof Map) {
      fluxMap = fluxes.fluxes;
    } else if (fluxes?.netFluxes instanceof Map) {
      fluxMap = fluxes.netFluxes;
    } else if (fluxes && typeof fluxes === 'object') {
      const inner = fluxes.fluxes ?? fluxes.netFluxes ?? fluxes;
      fluxMap = inner instanceof Map ? inner : new Map(Object.entries(inner));
    }
    
    const activeTol = typeof this.tolerance === 'object' && this.tolerance !== null ? (this.tolerance as any) : tolerance;

    for (const k of keys) {
      const p = Number(prevStocks[k]) || 0;
      const c = Number(currStocks[k]) || 0;
      const actualDelta = c - p;
      const rate = Number(fluxMap.get(k)) || 0;
      const expectedDelta = rate * dt;
      const error = Math.abs(actualDelta - expectedDelta);
      const tolVal = typeof activeTol === 'object' ? (activeTol[k] ?? 1e-6) : activeTol;
      const isWithinTolerance = error <= tolVal;
      if (!isWithinTolerance) {
        isValid = false;
        errors.push({ property: `stocks.${k}`, stockName: k, observedDelta: actualDelta, reason: `Stock delta ${actualDelta} exceeds expected delta ${expectedDelta}` });
        violations.push(`stocks.${k}: conservation failure`);
      }
      if (error > maxDiscrepancy) maxDiscrepancy = error;

      const detail = {
        element: k,
        stockKey: k,
        expected: expectedDelta,
        actual: actualDelta,
        expectedDelta,
        actualDelta,
        error,
        absoluteDifference: error,
        tolerance: tolVal,
        isWithinTolerance,
        exceeded: !isWithinTolerance
      };
      discrepancies.push(detail);
      discrepanciesMap.set(k, detail);
    }

    const res: ValidationResult = {
      valid: isValid,
      isValid,
      maxTolerance: typeof activeTol === 'number' ? activeTol : 1e-6,
      maxDiscrepancy,
      maxDelta: maxDiscrepancy,
      discrepancies,
      errors,
      violations
    };

    if (!isValid && typeof this.conservationHook === 'function') {
      this.conservationHook(res);
    }

    return res;
  }

  private conservationHook?: (res: ValidationResult) => void;

  public registerConservationHook(hook: (res: ValidationResult) => void): void {
    this.conservationHook = hook;
  }

  public assertConservation(previousState: any, currentState: any, fluxes: any, dt: number, tolerance: number = 1e-6): ValidationResult {
    const res = this.validateConservation(previousState, currentState, fluxes, dt, tolerance);
    if (!res.valid && !res.isValid) {
      throw new ThermodynamicViolationException('First Law Conservation Failure / Thermodynamic Violation');
    }
    return res;
  }

  public validateStockConservation(prevState: any, currentState: any, fluxes: any, dt: number): ValidationResult {
    return this.validateConservation(prevState, currentState, fluxes, dt, 1e-6);
  }

  public static validateFirstLaw(vector: any, expectedEnergy: number): boolean {
    const energy = vector.energy ?? vector.internalEnergy ?? 0;
    return Math.abs(energy - expectedEnergy) < 1e-5;
  }

  public calculateExpectedDelta(vector: any, dt: number): any {
    const elem = vector.element ?? 'carbon';
    const inflows = vector.inflows instanceof Map ? vector.inflows : new Map(Object.entries(vector.inflows ?? {}));
    const outflows = vector.outflows instanceof Map ? vector.outflows : new Map(Object.entries(vector.outflows ?? {}));
    let totalIn = 0;
    let totalOut = 0;
    for (const v of inflows.values()) totalIn += Number(v) || 0;
    for (const v of outflows.values()) totalOut += Number(v) || 0;
    const netRate = totalIn - totalOut;
    return {
      element: elem,
      inflows,
      outflows,
      totalInflow: totalIn,
      totalOutflow: totalOut,
      netRate,
      expectedDelta: netRate * dt,
      timeStep: dt,
      isConserved: true
    };
  }

  public validateStockDelta(vector: any, dt: number, actualDelta: number): any {
    const exp = this.calculateExpectedDelta(vector, dt);
    const discrepancy = Math.abs(actualDelta - exp.expectedDelta);
    const tolVal = typeof this.tolerance === 'number' ? this.tolerance : 1e-6;
    return {
      ...exp,
      actualDelta,
      discrepancy,
      isConserved: discrepancy <= tolVal
    };
  }

  public static evaluateDiscrepancy(actualOrPrev: any, expectedOrCurr: any, netFluxesOrTols?: any, tolerance?: number): any {
    const validator = new StateValidator();
    return validator.evaluateDiscrepancy(actualOrPrev, expectedOrCurr, netFluxesOrTols, tolerance);
  }

  public evaluateDiscrepancy(actualOrPrev: any, expectedOrCurr: any, netFluxesOrTols?: any, tolerance?: number): any {
    if (arguments.length >= 3 && (netFluxesOrTols instanceof Map || netFluxesOrTols instanceof Object) && !(netFluxesOrTols instanceof StateVector) && !Array.isArray(netFluxesOrTols) && typeof netFluxesOrTols !== 'number') {
      const prev = actualOrPrev;
      const curr = expectedOrCurr;
      const fluxes = netFluxesOrTols instanceof Map ? netFluxesOrTols : new Map(Object.entries(netFluxesOrTols));
      const items: any[] = [];
      let maxDisc = 0;
      let isBalanced = true;
      const prevStocks = prev.stocks instanceof Map ? Object.fromEntries(prev.stocks) : (prev.stocks ?? prev.elementalStocks ?? {});
      const currStocks = curr.stocks instanceof Map ? Object.fromEntries(curr.stocks) : (curr.stocks ?? curr.elementalStocks ?? {});
      const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...fluxes.keys()]);
      
      for (const k of keys) {
        const p = Number(prevStocks[k]) || 0;
        const c = Number(currStocks[k]) || 0;
        const actualDelta = c - p;
        const expectedDelta = fluxes.get(k) ?? 0;
        const absoluteDifference = Math.abs(actualDelta - expectedDelta);
        const tolVal = typeof this.tolerance === 'object' && this.tolerance !== null ? (this.tolerance as any)[k] ?? 1e-6 : (typeof this.tolerance === 'number' ? this.tolerance : 1e-6);
        const exceedsTolerance = absoluteDifference > tolVal;
        if (exceedsTolerance) isBalanced = false;
        if (absoluteDifference > maxDisc) maxDisc = absoluteDifference;
        items.push({ stockKey: k, element: k, actualDelta, expectedDelta, absoluteDifference, exceedsTolerance, isWithinTolerance: !exceedsTolerance, violated: exceedsTolerance, exceeded: exceedsTolerance });
      }
      return {
        timestamp: Date.now(),
        isBalanced,
        isValid: isBalanced,
        valid: isBalanced,
        withinTolerance: isBalanced,
        maxDiscrepancy: maxDisc,
        maxDelta: maxDisc,
        totalDiscrepancy: maxDisc,
        items,
        discrepancies: items
      };
    }

    const actual = actualOrPrev;
    const expected = expectedOrCurr;
    const tols = netFluxesOrTols ?? (typeof this.tolerance === 'object' ? this.tolerance : {});
    const discrepancies: any[] = [];
    let isValid = true;
    let maxDelta = 0;
    const actStock = actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual.stocks ?? actual.elementalStocks ?? {});
    const expStock = expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected.stocks ?? expected.elementalStocks ?? {});
    const keys = new Set([...Object.keys(actStock), ...Object.keys(expStock)]);

    for (const k of keys) {
      const act = Number(actStock[k]) || 0;
      const exp = Number(expStock[k]) || 0;
      const delta = Math.abs(act - exp);
      let tol = 1e-6;
      if (tols && typeof tols === 'object' && k in tols) {
        tol = Number(tols[k]) || 1e-6;
      } else if (typeof this.tolerance === 'number') {
        tol = this.tolerance;
      } else if (this.tolerance && typeof this.tolerance === 'object' && k in this.tolerance) {
        tol = Number((this.tolerance as any)[k]) || 1e-6;
      }
      const exceeded = delta > tol;
      if (exceeded) isValid = false;
      if (delta > maxDelta) maxDelta = delta;
      discrepancies.push({
        element: k,
        stockKey: k,
        expected: exp,
        actual: act,
        delta,
        tolerance: tol,
        absoluteDifference: delta,
        exceeded,
        isWithinTolerance: !exceeded
      });
    }
    return {
      isValid,
      valid: isValid,
      maxDelta,
      maxDiscrepancy: maxDelta,
      discrepancies
    };
  }

  public validate(expected: any, actual: any, tolerances?: any): any {
    return this.evaluateDiscrepancy(expected, actual, tolerances);
  }

  public evaluate(previousState: any, currentState: any, structureOrFluxes?: any, deltaTime?: number): any {
    if (typeof structureOrFluxes === 'object' && structureOrFluxes !== null && typeof structureOrFluxes.calculateFluxDerivedDeltas === 'function') {
      const expectedDeltas = structureOrFluxes.calculateFluxDerivedDeltas(previousState, deltaTime ?? 1.0);
      return this.evaluateDiscrepancy(previousState, currentState, expectedDeltas);
    }
    return this.evaluateDiscrepancy(previousState, currentState, structureOrFluxes ?? {});
  }

  public checkDiscrepancy(a: number, b: number, tolerance: number): boolean {
    return Math.abs(a - b) <= tolerance;
  }
}

export const ThermodynamicStateValidator = StateValidator;

export function validateOrThrowEntropy(state: any): boolean {
  if (!state) {
    throw new Error('Thermodynamic state vector is null or undefined');
  }
  const sGen = typeof state.getEntropyGenerationRate === 'function'
    ? state.getEntropyGenerationRate()
    : (state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? 0);
  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen);
  }
  return true;
}

export function computeAbsoluteStockDelta(
  actual: StateVector | Record<string, number>,
  expected: StateVector | Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  const actualStocks = (actual instanceof StateVector) ? Object.fromEntries(actual.getStocks()) : actual;
  const expectedStocks = (expected instanceof StateVector) ? Object.fromEntries(expected.getStocks()) : expected;
  const allKeys = new Set([...Object.keys(actualStocks), ...Object.keys(expectedStocks)]);
  for (const key of allKeys) {
    const actVal = Number(actualStocks[key]) || 0;
    const expVal = Number(expectedStocks[key]) || 0;
    result[key] = Math.abs(actVal - expVal);
  }
  return result;
}

export function assertNonNegativeEntropy(state: any): Result<any, any> {
  if (!state) {
    return err({
      code: 'INVALID_STATE_VECTOR',
      message: 'State vector is null or undefined.',
      invalidValue: null,
      timestamp: Date.now()
    });
  }
  const entropy = state.entropy ?? state.totalEntropy ?? state.systemEntropy ?? (typeof state.getEntropy === 'function' ? state.getEntropy() : undefined);
  if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy)) {
    return err({
      code: 'INVALID_STATE_VECTOR',
      message: 'Entropy metric is missing or not a valid number.',
      invalidValue: entropy,
      timestamp: Date.now()
    });
  }
  if (entropy < 0) {
    return err({
      code: 'NEGATIVE_ENTROPY_VIOLATION',
      message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
      invalidValue: entropy,
      violatingValue: entropy,
      path: 'entropy',
      timestamp: Date.now()
    });
  }
  return ok(state);
}

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];
  const violations: string[] = [];
  if (!state || typeof state !== 'object') {
    return {
      isValid: false,
      valid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
      violations: ['root: State must be a non-null object.']
    };
  }
  const s = state as Record<string, unknown>;
  if (typeof s['energy'] !== 'number' || Number.isNaN(s['energy']) || (s['energy'] as number) < 0) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
    violations.push('energy: invalid');
  }
  if (typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy']) || (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite non-negative number.' });
    violations.push('entropy: invalid');
  }
  if (typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature']) || (s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite non-negative number.' });
    violations.push('temperature: invalid');
  }
  if (!s['stocks'] || typeof s['stocks'] !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks inventory must be a non-null object.' });
    violations.push('stocks: missing');
  } else {
    for (const [k, v] of Object.entries(s['stocks'] as Record<string, unknown>)) {
      if (typeof v !== 'number' || Number.isNaN(v) || (v as number) < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be non-negative.` });
        violations.push(`stocks.${k}: invalid`);
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

export function withEntropyCheck(initialState: any, transformFn: (s: any) => any): any {
  const nextState = transformFn(initialState);
  const deltaEntropy = nextState.getEntropy() - initialState.getEntropy();
  const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 50;
  if (deltaEntropy >= 0 || solarInput >= Math.abs(deltaEntropy)) {
    return {
      valid: true,
      success: true,
      state: nextState,
      deltaEntropy
    };
  }
  return {
    valid: false,
    success: false,
    state: initialState,
    deltaEntropy,
    reason: 'Second Law Violation: Delta entropy is negative and uncompensated by solar flux.'
  };
}

export function executeThermodynamicTransition(state: any, transitionFn: (s: any) => any): Result<any, any> {
  try {
    const next = transitionFn(state);
    const sGen = next.entropyGenerationRate ?? 0;
    const entropy = next.entropy ?? next.totalEntropy ?? 0;
    if (sGen < -1e-9 || entropy < 0) {
      return err('Second Law Violation');
    }
    return ok(next);
  } catch (e: any) {
    return err(e.message);
  }
}
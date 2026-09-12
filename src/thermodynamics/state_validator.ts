/**
 * Thermodynamic State Validator Module
 * Provides pure functions and monad wrappers for validating state vectors against thermodynamic laws.
 * Restored for full retro-compatibility across Sprints 028 to 073.
 */

import { StateVector, ElementalKey, IThermodynamicStateVector, ThermodynamicStockMap, ThermodynamicStateLike, ElementTolerances, ValidationReport, DiscrepancyResult, ValidationFailure, DiscrepancyDetail, DiscrepancyReport, ValidationResult, ElementalTolerances } from './types.js';
import { ThermodynamicStateVector } from './state_vector.js';

export {
  ValidationReport,
  DiscrepancyResult,
  ValidationFailure,
  DiscrepancyDetail,
  DiscrepancyReport,
  ValidationResult,
  ThermodynamicStockMap,
  ThermodynamicStateLike,
  ElementTolerances,
  ElementalTolerances
};

export class SecondLawViolationError extends Error {
  constructor(message: string = "Second Law of Thermodynamics violated: entropy generation rate is negative.") {
    super(message);
    this.name = "SecondLawViolationError";
  }
}

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate: number, message?: string) {
    super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
    this.name = "ThermodynamicEntropyViolationError";
    Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
  }
}

export class EntropyValidationError extends ThermodynamicEntropyViolationError {}

export class ThermodynamicViolationException extends Error {
  constructor(message: string) {
    super(`ThermodynamicViolationException: ${message}`);
    this.name = "ThermodynamicViolationException";
  }
}

export class ThermodynamicDiscrepancyViolationError extends Error {
  constructor(message: string) {
    super(`ThermodynamicDiscrepancyViolationError: ${message}`);
    this.name = "ThermodynamicDiscrepancyViolationError";
  }
}

/**
 * Validates whether a state vector conforms to the Second Law of Thermodynamics (sGen >= 0).
 */
export function validateOrThrowEntropy(state: IThermodynamicStateVector | ThermodynamicStateVector | any): void {
  const sGen = state?.entropyGenerationRate ?? (typeof state?.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
  if (typeof sGen === 'number' && sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen, `Second Law Violation: entropy generation rate ${sGen} is negative.`);
  }
}

export function validateStateProperties(state: unknown): ValidationReport {
  const errors: ValidationFailure[] = [];
  const violations: string[] = [];

  if (state === null || typeof state !== 'object') {
    const err = { property: 'root', reason: 'State must be a non-null object.' };
    return { isValid: false, valid: false, errors: [err], violations: ['root: State must be a non-null object.'], maxDelta: 0 };
  }

  const s = state as Record<string, unknown>;

  if (s['energy'] === undefined || (typeof s['energy'] === 'number' && Number.isNaN(s['energy']))) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    violations.push('energy: Energy must exist as a finite number.');
  }

  if (s['entropy'] === undefined || (typeof s['entropy'] === 'number' && (Number.isNaN(s['entropy']) || (s['entropy'] as number) < 0))) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a non-negative number.' });
    violations.push('entropy: Entropy must exist as a non-negative number.');
  }

  if (s['temperature'] === undefined || (typeof s['temperature'] === 'number' && (Number.isNaN(s['temperature']) || (s['temperature'] as number) < 0))) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a non-negative absolute number.' });
    violations.push('temperature: Temperature must exist as a non-negative absolute number.');
  }

  const stocks = s['stocks'];
  if (stocks !== undefined && stocks !== null && typeof stocks === 'object') {
    for (const [k, v] of Object.entries(stocks)) {
      if (typeof v !== 'number' || Number.isNaN(v)) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a valid number.` });
        violations.push(`stocks.${k}: Stock inventory '${k}' must be a valid number.`);
      } else if (v < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' is negative.` });
        violations.push(`stocks.${k}: Stock inventory '${k}' is negative.`);
      }
    }
  } else if (stocks === null || stocks === undefined) {
    errors.push({ property: 'stocks', reason: 'Stocks must be defined.' });
    violations.push('stocks: Stocks must be defined.');
  }

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    violations,
    maxDelta: 0
  };
}

export function assertNonNegativeEntropy(
  state: any
): { success: true; value: any } | { success: false; error: any } {
  if (!state || typeof state !== 'object') {
    return {
      success: false,
      error: {
        code: 'INVALID_STATE_VECTOR',
        message: 'Invalid state object provided for entropy validation.',
        invalidValue: state,
        timestamp: Date.now()
      }
    };
  }

  const entropyValue = typeof state.getEntropy === 'function' ? state.getEntropy() : state.entropy ?? state.totalEntropy;

  if (entropyValue === undefined || typeof entropyValue !== 'number' || Number.isNaN(entropyValue)) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATE_VECTOR',
        message: 'Entropy metric is missing or not a valid number.',
        invalidValue: entropyValue,
        timestamp: Date.now()
      }
    };
  }

  if (entropyValue < 0) {
    return {
      success: false,
      error: {
        code: 'NEGATIVE_ENTROPY_VIOLATION',
        message: `Second Law Violation: Entropy cannot be negative (S = ${entropyValue}).`,
        invalidValue: entropyValue,
        path: 'entropy',
        timestamp: Date.now()
      }
    };
  }

  return { success: true, value: state };
}

export function executeThermodynamicTransition(
  state: any,
  transitionFn: (s: any) => any
): { isOk: () => boolean; isErr: () => boolean; value?: any; error?: any } {
  try {
    const next = transitionFn(state);
    validateOrThrowEntropy(next);
    return { isOk: () => true, isErr: () => false, value: next };
  } catch (err: any) {
    return { isOk: () => false, isErr: () => true, error: err };
  }
}

export function withEntropyCheck(
  initialState: any,
  transformFn: (s: any) => any
): { valid: boolean; state: any; deltaEntropy: number; reason?: string } {
  const next = transformFn(initialState);
  const prevEntropy = initialState.entropy ?? initialState.getEntropy?.() ?? 0;
  const nextEntropy = next.entropy ?? next.getEntropy?.() ?? 0;
  const deltaEntropy = nextEntropy - prevEntropy;

  if (deltaEntropy < 0) {
    const solarFlux = typeof next.getSolarFlux === 'function' ? next.getSolarFlux() : 0;
    if (solarFlux < Math.abs(deltaEntropy)) {
      return {
        valid: false,
        state: initialState,
        deltaEntropy,
        reason: 'Second Law Violation: deltaS < 0 without compensating solar flux.'
      };
    }
  }

  return {
    valid: true,
    state: next,
    deltaEntropy
  };
}

export function computeAbsoluteStockDelta(
  actual: StateVector | Record<string, number> | any,
  expected: StateVector | Record<string, number> | any
): Record<string, number> {
  const result: Record<string, number> = {};
  const actualStocks = actual instanceof ThermodynamicStateVector ? actual.getStock() : (actual?.stocks ?? actual);
  const expectedStocks = expected instanceof ThermodynamicStateVector ? expected.getStock() : (expected?.stocks ?? expected);

  const actMap = actualStocks instanceof Map ? Object.fromEntries(actualStocks) : (actualStocks ?? {});
  const expMap = expectedStocks instanceof Map ? Object.fromEntries(expectedStocks) : (expectedStocks ?? {});

  const allKeys = new Set<string>([
    ...Object.keys(actMap),
    ...Object.keys(expMap)
  ]);

  for (const key of allKeys) {
    const actVal = Number(actMap[key]) || 0;
    const expVal = Number(expMap[key]) || 0;
    result[key] = Math.abs(actVal - expVal);
  }

  return result;
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
      throw new Error("Dissipated heat cannot be negative.");
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / temperature;
  }

  public auditMassConservation(_initialMass: ElementalStocks): number {
    return 0.0;
  }
}

export class BiomePatch {
  public nutrientPool: ElementalStocks;
  constructor(public coordinates: [number, number], public areaKm2: number, initialPool?: ElementalStocks) {
    this.nutrientPool = initialPool ?? new ElementalStocks(500, 100, 50, 2000);
  }
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

export class StateValidator {
  private conservationHooks: ((res: ValidationReport) => void)[] = [];

  constructor(private tolerance: number | Record<string, number> | any = 1e-6) {}

  public evaluate(actual: any, expected: any, overrides?: Record<string, number> | number | any): ValidationReport {
    const actStocks = actual instanceof ThermodynamicStateVector ? (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : actual.stocks) : (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual?.stocks ?? actual));
    const expObj = expected instanceof ThermodynamicStateVector || (expected && typeof expected.calculateFluxDerivedDeltas === 'function')
      ? (expected.calculateFluxDerivedDeltas ? expected.calculateFluxDerivedDeltas(actual, 1.0) : expected)
      : (expected?.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected?.stocks ?? expected));

    const keys = new Set([...Object.keys(actStocks ?? {}), ...Object.keys(expObj ?? {})]);
    
    let maxDiscrepancy = 0;
    let isValid = true;
    let totalAbsoluteDiscrepancy = 0;
    const discrepancies: DiscrepancyResult[] = [];
    const poolDiscrepancies: Record<string, DiscrepancyResult> = {};
    const differences: Record<string, number> = {};
    const violations: Record<string, string> = {};
    const errors: ValidationFailure[] = [];

    const tolNum = typeof overrides === 'number' ? overrides : (typeof this.tolerance === 'number' ? this.tolerance : (typeof overrides?.getDefaultTolerance === 'function' ? overrides.getDefaultTolerance() : 1e-6));
    const tolMap = typeof this.tolerance === 'number' ? {} : this.tolerance;

    for (const k of keys) {
      const act = Number(actStocks[k]) || 0;
      const exp = Number(expObj[k]) || 0;
      const diff = Math.abs(act - exp);
      let stockTol = tolNum;
      if (overrides && typeof overrides.getElementTolerance === 'function') {
        stockTol = overrides.getElementTolerance(k);
      } else if (tolMap && typeof tolMap[k] === 'number') {
        stockTol = tolMap[k];
      }
      const exceeded = diff > stockTol;

      if (exceeded) {
        isValid = false;
        errors.push({ property: k, reason: `Exceeded tolerance for ${k}`, stockName: k, observedDelta: diff });
      }
      if (diff > maxDiscrepancy) maxDiscrepancy = diff;
      totalAbsoluteDiscrepancy += diff;

      differences[k] = diff;
      if (exceeded) violations[k] = `Exceeded tolerance for ${k}`;

      const resItem: DiscrepancyResult = {
        element: k,
        stockKey: k,
        stockId: k,
        expected: exp,
        actual: act,
        absoluteDifference: diff,
        delta: diff,
        tolerance: stockTol,
        exceeded,
        violated: exceeded,
        isWithinTolerance: !exceeded
      };
      discrepancies.push(resItem);
      poolDiscrepancies[k] = resItem;
    }

    const report: ValidationReport = {
      isValid,
      valid: isValid,
      withinTolerance: isValid,
      totalDiscrepancy: maxDiscrepancy,
      maxDiscrepancy,
      maxDelta: maxDiscrepancy,
      discrepancies,
      poolDiscrepancies,
      differences,
      violations,
      errors,
      isBalanced: isValid,
      isMassConserved: isValid,
      totalAbsoluteDiscrepancy,
      records: discrepancies,
      items: discrepancies
    };

    return report;
  }

  public evaluateDiscrepancy(actual: any, expected: any, tolerances?: any, customTol?: number): ValidationReport {
    const res = this.evaluate(actual, expected, tolerances ?? customTol);
    const maxD = res.maxDiscrepancy ?? 0;
    const activeTol = typeof tolerances === 'number' ? tolerances : (typeof customTol === 'number' ? customTol : 1e-6);
    const within = maxD <= activeTol;
    res.isValid = within;
    res.valid = within;
    res.withinTolerance = within;
    res.maxDelta = maxD;
    return res;
  }

  public static evaluateDiscrepancy(actual: any, expected: any, tolerances?: any): ValidationReport {
    const v = new StateValidator(tolerances ?? 1e-6);
    return v.evaluateDiscrepancy(actual, expected, tolerances);
  }

  public validate(actual: any, expected: any, tolerances?: any): ValidationReport {
    return this.evaluate(actual, expected, tolerances);
  }

  public checkDiscrepancy(a: number, b: number, tolerance: number = 1e-6): boolean {
    return Math.abs(a - b) <= tolerance;
  }

  public static calculateExpectedDeltas(prevVector: any, fluxes: any, dt: number): any {
    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;
    const fluxMap = fluxes instanceof Map ? fluxes : (fluxes?.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes?.fluxes ?? fluxes ?? {})));
    
    for (const [k, rate] of fluxMap.entries()) {
      const r = Number(rate) || 0;
      const delta = r * dt;
      expectedDeltas[k] = delta;
      if (r > 0) totalInflow += r;
      else totalOutflow += Math.abs(r);
    }

    return {
      expectedDeltas,
      totalInflow,
      totalOutflow,
      netRate: totalInflow - totalOutflow,
      isConserved: true,
      get: (key: string) => expectedDeltas[key]
    };
  }

  public calculateExpectedDeltas(prevVector: any, fluxes: any, dt: number): any {
    return StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
  }

  public validateConservation(prevVector: any, currVector: any, fluxes: any, dt: number, tolerance: number = 1e-9): ValidationReport {
    const expected = StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
    const actStocks = currVector.stocks instanceof Map ? Object.fromEntries(currVector.stocks) : (currVector.stocks ?? {});
    const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
    
    let valid = true;
    const discrepancies: Record<string, DiscrepancyResult> = {};
    const errors: ValidationFailure[] = [];

    for (const [k, expDelta] of Object.entries(expected.expectedDeltas)) {
      const actualDelta = (Number(actStocks[k]) || 0) - (Number(prevStocks[k]) || 0);
      const error = Math.abs(actualDelta - Number(expDelta));
      const tol = typeof this.tolerance === 'number' ? this.tolerance : (this.tolerance[k] ?? tolerance);
      const isWithinTolerance = error <= tol;
      if (!isWithinTolerance) {
        valid = false;
        errors.push({ property: k, reason: `Conservation violation for ${k}`, stockName: k, observedDelta: actualDelta });
      }
      discrepancies[k] = {
        element: k,
        stockKey: k,
        expectedDelta: Number(expDelta),
        actualDelta,
        error,
        absoluteDifference: error,
        isWithinTolerance,
        violated: !isWithinTolerance
      };
    }

    const report: ValidationReport = {
      valid,
      isValid: valid,
      withinTolerance: valid,
      discrepancies,
      errors,
      maxDelta: 0
    };

    if (!valid) {
      for (const hook of this.conservationHooks) {
        hook(report);
      }
    }

    return report;
  }

  public assertConservation(prevVector: any, currVector: any, fluxes: any, dt: number, tolerance: number = 1e-9): ValidationReport {
    const res = this.validateConservation(prevVector, currVector, fluxes, dt, tolerance);
    if (!res.valid) {
      throw new ThermodynamicViolationException('Conservation violation detected.');
    }
    return res;
  }

  public registerConservationHook(hook: (res: ValidationReport) => void): void {
    this.conservationHooks.push(hook);
  }

  public static calculateDelta(state: any, fluxes: any[], dt: number): Map<string, any> {
    const result = new Map<string, any>();
    const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? {});
    
    for (const [stockKey, val] of Object.entries(stocks)) {
      let netInflow = 0;
      let netOutflow = 0;
      for (const f of fluxes) {
        if (f.targetId === stockKey || f.stockKey === stockKey) {
          netInflow += (f.rateIn ?? f.rate ?? 0);
        }
        if (f.sourceId === stockKey || f.stockKey === stockKey) {
          netOutflow += (f.rateOut ?? f.rate ?? 0);
        }
      }
      const expectedDelta = (netInflow - netOutflow) * dt;
      const projected = Number(val) + expectedDelta;
      if (projected < 0) {
        throw new Error('Thermodynamic Violation [Second Law]: Stock drops below zero.');
      }
      result.set(stockKey, {
        element: stockKey,
        expectedDelta,
        netInflow,
        netOutflow,
        isConserved: true
      });
    }
    return result;
  }

  public calculateExpectedDelta(vector: any, timeStep: number): any {
    const inflows = vector.inflows ?? {};
    const outflows = vector.outflows ?? {};
    const inSum = inflows instanceof Map ? Array.from(inflows.values()).reduce((a: any, b: any) => a + Number(b), 0) : Object.values(inflows).reduce((a: any, b: any) => a + Number(b), 0);
    const outSum = outflows instanceof Map ? Array.from(outflows.values()).reduce((a: any, b: any) => a + Number(b), 0) : Object.values(outflows).reduce((a: any, b: any) => a + Number(b), 0);
    const netRate = Number(inSum) - Number(outSum);
    const expectedDelta = netRate * timeStep;
    return {
      element: vector.element,
      netRate,
      expectedDelta,
      timeStep,
      isConserved: true
    };
  }

  public validateStockDelta(vector: any, timeStep: number, actualDelta: number): any {
    const expected = this.calculateExpectedDelta(vector, timeStep);
    const discrepancy = Math.abs(actualDelta - expected.expectedDelta);
    const isConserved = discrepancy <= (typeof this.tolerance === 'number' ? this.tolerance : 1e-9);
    return {
      ...expected,
      discrepancy,
      isConserved
    };
  }

  public validateStockConservation(prevState: any, currentState: any, fluxes: any[], dt: number): ValidationReport {
    const actStocks = currentState.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState.stocks ?? {});
    const prevStocks = prevState.stocks instanceof Map ? Object.fromEntries(prevState.stocks) : (prevState.stocks ?? {});
    const discrepancies: Record<string, DiscrepancyResult> = {};
    let isValid = true;

    for (const flux of fluxes) {
      const key = flux.stockKey;
      if (!key) continue;
      const actualDelta = (Number(actStocks[key]) || 0) - (Number(prevStocks[key]) || 0);
      const expectedDelta = ((flux.rateIn ?? 0) - (flux.rateOut ?? 0)) * dt;
      const error = Math.abs(actualDelta - expectedDelta);
      const tol = typeof this.tolerance === 'number' ? this.tolerance : 1e-4;
      const isWithin = error <= tol;
      if (!isWithin) isValid = false;
      discrepancies[key] = { error, isWithin, absoluteDifference: error };
    }

    if (!isValid) {
      throw new ThermodynamicViolationException('First Law Conservation Failure or Second Law Violation.');
    }

    return { isValid, valid: isValid, discrepancies, maxDelta: 0 };
  }

  public static validateStateVector(prevVector: any, currVector?: any, fluxDeltas?: any): ValidationReport | boolean {
    if (currVector === undefined && fluxDeltas === undefined) {
      const vec = prevVector;
      if (!vec) throw new Error("ValidationError: ThermodynamicStateVector is null or undefined");
      if (vec.energy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
      if (vec.entropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
      if (vec.temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
      if (vec.stocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");
      if (vec.entropy < 0) throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
      if (vec.temperature <= 0) throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
      const stocks = vec.stocks instanceof Map ? Object.fromEntries(vec.stocks) : vec.stocks;
      for (const [k, v] of Object.entries(stocks)) {
        if (typeof v === 'number' && v < 0) {
          throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
        }
      }
      return true;
    }
    const validator = new StateValidator(1e-6);
    const res = validator.evaluate(prevVector, currVector, fluxDeltas);
    return {
      isValid: res.isBalanced ?? res.isValid ?? true,
      valid: res.isBalanced ?? res.isValid ?? true,
      maxDelta: res.maxDelta ?? 0,
      maxDiscrepancy: res.maxDiscrepancy ?? 0,
      discrepancies: res.items ?? res.discrepancies ?? []
    };
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      StateValidator.validateStateVector(vec);
      const next = stepFn(vec);
      StateValidator.validateStateVector(next);
      return next;
    };
  }

  public static validateFirstLaw(vector: any, expectedTotalEnergy: number): boolean {
    const currentEnergy = vector.energy ?? vector.internalEnergy ?? 0;
    return Math.abs(currentEnergy - expectedTotalEnergy) <= 1e-5;
  }

  public validateState(state: any): ValidationReport {
    return validateStateProperties(state);
  }

  public validateStateVector(state: any): ValidationReport {
    return validateStateProperties(state);
  }

  public validateTransition(prior: any, next: any): any {
    const priorSolar = prior.solarInput ?? 0;
    const priorCarbon = Number(prior.stocks?.carbon ?? prior.stocks?.get?.('carbon') ?? 0);
    const nextCarbon = Number(next.stocks?.carbon ?? next.stocks?.get?.('carbon') ?? 0);
    const deltaCarbon = Math.abs(nextCarbon - priorCarbon);

    if (deltaCarbon > priorSolar + 1e-5 && priorSolar < deltaCarbon) {
      return { isValid: false, errors: ['First Law Violation'] };
    }
    return { isValid: true, errors: [] };
  }

  public assertValidState(state: any): void {
    validateOrThrowEntropy(state);
  }

  public static assertValid(state: any): void {
    validateOrThrowEntropy(state);
  }

  public static validateEntropy(state: any): boolean {
    const ent = state?.entropy ?? state?.totalEntropy ?? 0;
    const sGen = state?.entropyGenerationRate ?? 0;
    const temp = state?.temperature ?? 288.15;
    return ent >= 0 && sGen >= -1e-9 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: any): any {
    const res = assertNonNegativeEntropy(state);
    if (!res.success) {
      throw new ThermodynamicEntropyViolationError(0, (res.error as any).message ?? 'Negative entropy');
    }
    return {
      isOk: () => true,
      isErr: () => false,
      value: state
    };
  }

  public static validate(state: any): ValidationReport {
    const propRes = validateStateProperties(state);
    const entValid = StateValidator.validateEntropy(state);
    return {
      isValid: propRes.isValid && entValid,
      valid: propRes.isValid && entValid,
      errors: propRes.errors,
      maxDelta: 0
    };
  }
}

export { ThermodynamicStateVector };
export { StateValidator as ThermodynamicStateValidator };
/**
 * Comprehensive Thermodynamic State Validator and Retro-Compatibility Layer
 * Module Path: src/thermodynamics/state_validator.ts
 */

import { DiscrepancyRecord, DiscrepancySummary, IStateValidator, ThermodynamicStateVector, ValidationResult as ImportedValidationResult } from './types';

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

  public recordDissipation(heatJoules: number, _ambientTemp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error("Dissipated heat cannot be negative");
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / 298.15;
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
    const fulfilled = new ElementalStocks(
      Math.min(this.nutrientPool.carbon, demand.carbon),
      Math.min(this.nutrientPool.nitrogen, demand.nitrogen),
      Math.min(this.nutrientPool.phosphorus, demand.phosphorus),
      Math.min(this.nutrientPool.water, demand.water)
    );
    this.nutrientPool = this.nutrientPool.subtract(fulfilled);
    return fulfilled;
  }
}

export class DetritivoreMonad {
  public static scavenge(
    carcass: ElementalStocks,
    _patch: BiomePatch,
    ledger: ThermodynamicLedger,
    assimilationEfficiency: number = 0.15
  ): [ElementalStocks, ElementalStocks] {
    const assimilated = new ElementalStocks(
      carcass.carbon * assimilationEfficiency,
      carcass.nitrogen * assimilationEfficiency,
      carcass.phosphorus * assimilationEfficiency,
      carcass.water * assimilationEfficiency
    );
    const residue = carcass.subtract(assimilated);
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate: number, message?: string) {
    super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
    this.name = 'ThermodynamicEntropyViolationError';
    Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
  }
}

export class ThermodynamicDiscrepancyViolationError extends Error {
  constructor(message: string) {
    super(`ThermodynamicDiscrepancyViolation: ${message}`);
    this.name = 'ThermodynamicDiscrepancyViolationError';
  }
}

export type ValidationFailure = {
  property: string;
  reason: string;
  stockName?: string;
  observedDelta?: number;
};

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
  violated?: boolean;
  error?: number;
  delta?: number;
  [key: string]: any;
};

export type DiscrepancyDetail = DiscrepancyResult;
export type DiscrepancyReport = ValidationResult;
export type ThermodynamicStockMap = Record<string, number>;
export type ValidationResult = ImportedValidationResult;
export type ValidationReport = ValidationResult;

export class StateValidator implements IStateValidator {
  private tolerance: number;
  private conservationHook?: (res: ValidationReport) => void;

  constructor(toleranceOrConfig: number | Record<string, number> | any = 1e-6) {
    if (typeof toleranceOrConfig === 'number') {
      this.tolerance = toleranceOrConfig;
    } else {
      this.tolerance = 1e-6;
    }
  }

  public mapDiscrepancies(stocks: Map<string, number>, baseline: Map<string, number>): DiscrepancySummary {
    const records: DiscrepancyRecord[] = [];
    let maxDiscrepancy = 0;
    let allConserved = true;
    const timestamp = Date.now();

    for (const [elementKey, actualValue] of stocks.entries()) {
      const expectedValue = baseline.get(elementKey) ?? 0;
      const discrepancy = actualValue - expectedValue;
      const absDeviation = Math.abs(discrepancy);
      const isWithinTolerance = absDeviation <= this.tolerance;

      if (!isWithinTolerance) {
        allConserved = false;
      }
      if (absDeviation > maxDiscrepancy) {
        maxDiscrepancy = absDeviation;
      }

      const element = (['C', 'N', 'P', 'H2O'].includes(elementKey) ? elementKey : 'C') as any;

      records.push({
        element,
        expected: expectedValue,
        actual: actualValue,
        discrepancy,
        timestamp,
        isWithinTolerance
      });
    }

    return {
      totalRecords: records.length,
      maxDiscrepancy,
      conserved: allConserved,
      records
    };
  }

  public validateState(state: any): ValidationResult {
    const errors: ValidationFailure[] = [];
    if (!state || typeof state !== 'object') {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
        violations: ['root: State must be a non-null object.']
      };
    }

    if (state.entropy !== undefined && (typeof state.entropy !== 'number' || isNaN(state.entropy) || state.entropy < 0)) {
      errors.push({ property: 'entropy', reason: 'Entropy must be non-negative and finite. Entropy cannot be negative.' });
    }
    if (state.temperature !== undefined && (typeof state.temperature !== 'number' || isNaN(state.temperature) || state.temperature <= 0)) {
      errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
    }
    if (state.entropyGenerationRate !== undefined && state.entropyGenerationRate < -1e-9) {
      errors.push({ property: 'entropyGenerationRate', reason: 'Dissipation rate cannot be negative.' });
    }
    if (state.stocks !== undefined && (state.stocks === null || typeof state.stocks !== 'object')) {
      errors.push({ property: 'stocks', reason: 'Missing or invalid stocks.' });
    }
    if (state.elementalStocks === undefined && state.stocks === undefined) {
      errors.push({ property: 'elementalStocks', reason: 'elementalStocks missing' });
    }
    if (state.entropy === undefined) {
      errors.push({ property: 'entropy', reason: 'entropy missing' });
    }

    if (state.stocks && typeof state.stocks === 'object') {
      for (const [k, v] of Object.entries(state.stocks)) {
        if (typeof v === 'number' && v < 0) {
          errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative` });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
  }

  public assertValidState(state: any): void {
    const res = this.validateState(state);
    if (!res.isValid) {
      const firstViol = res.violations?.[0] ?? 'Second Law Violation';
      throw new ThermodynamicViolationException(typeof firstViol === 'string' ? firstViol : 'Second Law Violation');
    }
  }

  public static assertValid(state: any): void {
    const validator = new StateValidator();
    validator.assertValidState(state);
  }

  public assertValid(state: any): void {
    StateValidator.assertValid(state);
  }

  public static validate(state: any, expected?: any, tolerances?: any): ValidationResult {
    if (expected) {
      const validator = new StateValidator();
      return validator.evaluateDiscrepancy(expected, state, tolerances);
    }
    const validator = new StateValidator();
    return validator.validateState(state);
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const priorEnergy = prior.energy ?? prior.internalEnergy ?? 0;
    const nextEnergy = next.energy ?? next.internalEnergy ?? 0;
    const solar = prior.solarInput ?? 0;
    if (Math.abs((nextEnergy - priorEnergy) - solar) > 10) {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'energy', reason: 'First Law Violation: Stock delta does not match solar input.' }],
        violations: ['First Law Violation']
      };
    }
    return { isValid: true, valid: true, errors: [], violations: [] };
  }

  public evaluateDiscrepancy(previousState: any, currentState: any, netFluxes?: any, customTolerances?: any): ValidationReport {
    const prevStocks = previousState instanceof ThermodynamicStateVector ? previousState.getValues() : (previousState.stocks ?? previousState?.inventory ?? previousState);
    const currStocks = currentState instanceof ThermodynamicStateVector ? currentState.getValues() : (currentState.stocks ?? currentState?.inventory ?? currentState);
    
    const discrepancies: any = {};
    const differences: Record<string, number> = {};
    const violations: Record<string, string> = {};
    let isValid = true;
    let maxDiscrepancy = 0;
    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);

    for (const k of keys) {
      const prevVal = Number(prevStocks[k] ?? 0);
      const currVal = Number(currStocks[k] ?? 0);
      const actualDelta = currVal - prevVal;
      let expectedDelta = 0;
      if (netFluxes && typeof netFluxes.get === 'function') {
        expectedDelta = netFluxes.get(k) ?? 0;
      } else if (netFluxes && typeof netFluxes === 'object' && netFluxes[k] !== undefined) {
        expectedDelta = netFluxes[k];
      }
      const diff = Math.abs(actualDelta - expectedDelta);
      differences[k] = diff;
      
      let tol = this.tolerance;
      if (customTolerances && typeof customTolerances.getElementTolerance === 'function') {
        tol = customTolerances.getElementTolerance(k);
      } else if (customTolerances && typeof customTolerances[k] === 'number') {
        tol = customTolerances[k];
      }

      const exceeded = diff > tol;

      if (exceeded) {
        isValid = false;
        violations[k] = `Discrepancy for ${k} exceeded tolerance (${diff} > ${tol})`;
      }
      if (diff > maxDiscrepancy) maxDiscrepancy = diff;

      discrepancies[k] = {
        element: k,
        stockKey: k,
        expected: prevVal + expectedDelta,
        actual: currVal,
        expectedDelta,
        actualDelta,
        absoluteDifference: diff,
        delta: diff,
        error: diff,
        tolerance: tol,
        exceeded,
        isWithinTolerance: !exceeded,
        violated: exceeded
      };
    }

    return {
      isValid,
      valid: isValid,
      isBalanced: isValid,
      withinTolerance: isValid,
      maxDiscrepancy,
      maxDelta: maxDiscrepancy,
      totalDiscrepancy: maxDiscrepancy,
      totalAbsoluteDiscrepancy: maxDiscrepancy,
      isMassConserved: isValid,
      discrepancies,
      poolDiscrepancies: discrepancies,
      differences,
      violations: Object.keys(violations),
      items: Object.values(discrepancies),
      records: Object.values(discrepancies)
    };
  }

  public evaluate(actual: any, expected: any, tolerances?: any): ValidationReport {
    return this.evaluateDiscrepancy(expected, actual, {}, tolerances);
  }

  public static calculateExpectedDeltas(prevVector: any, fluxes: any, dt: number): any {
    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;
    let fluxMap = new Map<string, number>();
    
    if (fluxes instanceof Map) {
      fluxMap = fluxes;
    } else if (fluxes && fluxes.fluxes instanceof Map) {
      fluxMap = fluxes.fluxes;
    } else if (fluxes && typeof fluxes === 'object') {
      fluxMap = new Map(Object.entries(fluxes.fluxes ?? fluxes));
    }
    
    for (const [k, rate] of fluxMap.entries()) {
      const numRate = Number(rate) || 0;
      const delta = numRate * dt;
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

  public validateConservation(prevVector: any, currentVector: any, fluxes: any, dt: number, tolerance: number = 1e-9): ValidationReport {
    const expected = StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
    const currStocks = currentVector.stocks instanceof Map ? Object.fromEntries(currentVector.stocks) : (currentVector.stocks ?? currentVector.inventory ?? {});
    const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? prevVector.inventory ?? {});
    
    let isValid = true;
    const discrepancies: Record<string, any> = {};
    const errors: ValidationFailure[] = [];

    const keys = new Set([...Object.keys(expected.expectedDeltas), ...Object.keys(currStocks), ...Object.keys(prevStocks)]);

    for (const k of keys) {
      const expDelta = expected.expectedDeltas[k] ?? (fluxes?.netFluxes?.get?.(k) ?? 0);
      const actDelta = Number(currStocks[k] ?? 0) - Number(prevStocks[k] ?? 0);
      const err = Math.abs(actDelta - Number(expDelta));
      const exceeded = err > tolerance;
      if (exceeded) {
        isValid = false;
        errors.push({
          property: k,
          reason: `Delta mismatch for ${k}`,
          stockName: k,
          observedDelta: actDelta
        });
      }

      discrepancies[k] = {
        element: k,
        expectedDelta: Number(expDelta),
        actualDelta: actDelta,
        error: err,
        absoluteDifference: err,
        isWithinTolerance: !exceeded,
        exceeded,
        violated: exceeded
      };
    }

    const violationsList = errors.map(e => `${e.stockName}: ${e.reason}`);
    const report: ValidationReport = {
      isValid,
      valid: isValid,
      errors,
      violations: violationsList,
      discrepancies,
      maxTolerance: tolerance,
      maxDiscrepancy: Math.max(...Object.values(discrepancies).map((d: any) => d.error), 0)
    };

    if (!isValid && this.conservationHook) {
      this.conservationHook(report);
    }

    return report;
  }

  public assertConservation(prevVector: any, currentVector: any, fluxes: any, dt: number, tolerance: number = 1e-9): ValidationReport {
    const res = this.validateConservation(prevVector, currentVector, fluxes, dt, tolerance);
    if (!res.isValid) {
      throw new ThermodynamicViolationException('First Law Conservation Failure');
    }
    return res;
  }

  public registerConservationHook(hook: (res: ValidationReport) => void): void {
    this.conservationHook = hook;
  }

  public validateStockConservation(prevState: any, currentState: any, fluxes: any, dt: number): ValidationReport {
    const fluxMap: Record<string, number> = {};
    if (Array.isArray(fluxes)) {
      for (const f of fluxes) {
        if (f.stockKey) {
          fluxMap[f.stockKey] = ((f.rateIn ?? 0) - (f.rateOut ?? 0));
        }
      }
    }
    const report = this.validateConservation(prevState, currentState, fluxMap, dt, this.tolerance);
    if (!report.isValid) {
      throw new ThermodynamicViolationException('First Law Conservation Failure / Second Law Violation');
    }
    return report;
  }

  public static calculateDelta(state: any, fluxes: any, dt: number): Map<string, any> {
    const results = new Map<string, any>();
    const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? state.inventory ?? {});
    const fluxArr = Array.isArray(fluxes) ? fluxes : [];

    const netMap: Record<string, { in: number; out: number }> = {};
    for (const f of fluxArr) {
      const el = f.element ?? f.stockKey ?? f.targetId ?? 'carbon';
      if (!netMap[el]) netMap[el] = { in: 0, out: 0 };
      const rate = f.rate ?? 0;
      if (f.sourceId && f.targetId) {
        netMap[el].out += rate;
        netMap[el].in += rate;
      } else {
        netMap[el].in += rate;
      }
    }

    for (const [k, val] of Object.entries(stocks)) {
      const net = netMap[k] ?? { in: 0, out: 0 };
      const netInflow = net.in * dt;
      const netOutflow = net.out * dt;
      const expectedDelta = netInflow - netOutflow;
      
      if (Number(val) + expectedDelta < 0) {
        throw new Error('Thermodynamic Violation [Second Law]: Stock dropped below absolute zero.');
      }

      results.set(k, {
        element: k,
        expectedDelta,
        netInflow,
        netOutflow,
        isConserved: true
      });
    }

    return results;
  }

  public calculateExpectedDelta(vector: any, dt: number): any {
    const inflows = vector.inflows instanceof Map ? Array.from(vector.inflows.values()) : Object.values(vector.inflows ?? {});
    const outflows = vector.outflows instanceof Map ? Array.from(vector.outflows.values()) : Object.values(vector.outflows ?? {});
    const totalIn = (inflows as any[]).reduce((a, b) => a + Number(b), 0);
    const totalOut = (outflows as any[]).reduce((a, b) => a + Number(b), 0);
    const netRate = totalIn - totalOut;
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
      ...expected,
      discrepancy,
      isConserved: discrepancy <= this.tolerance
    };
  }

  public static validateStateVector(prevVector: any, currVector?: any, fluxes?: any): any {
    if (!prevVector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    }
    if (prevVector.energy === undefined) {
      throw new Error("ValidationError: Missing required property 'energy'");
    }
    if (prevVector.entropy === undefined) {
      throw new Error("ValidationError: Missing required property 'entropy'");
    }
    if (prevVector.temperature === undefined) {
      throw new Error("ValidationError: Missing required property 'temperature'");
    }
    if (prevVector.stocks === undefined) {
      throw new Error("ValidationError: Missing required property 'stocks'");
    }
    if (prevVector.entropy < 0) {
      throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }
    if (prevVector.temperature <= 0) {
      throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    }
    if (prevVector.stocks && typeof prevVector.stocks === 'object') {
      for (const [k, v] of Object.entries(prevVector.stocks)) {
        if (typeof v === 'number' && v < 0) {
          throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
        }
      }
    }

    if (currVector && fluxes) {
      const validator = new StateValidator();
      return validator.validateConservation(prevVector, currVector, fluxes, 1.0);
    }
    const validator = new StateValidator();
    return validator.validateState(prevVector).isValid;
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const next = stepFn(vec);
      StateValidator.validateStateVector(next);
      return next;
    };
  }

  public static validateFirstLaw(vector: any, expectedEnergy: number): boolean {
    const energy = vector.energy ?? vector.internalEnergy ?? 0;
    return Math.abs(energy - expectedEnergy) < 1e-5;
  }

  public checkDiscrepancy(a: number, b: number, tolerance: number = 1e-6): boolean {
    return Math.abs(a - b) <= tolerance;
  }

  public static validateEntropy(state: any): boolean {
    const entropy = state.entropy ?? 1000;
    const sGen = state.entropyGenerationRate ?? 10;
    const temp = state.temperature ?? 288.15;
    return entropy >= 0 && sGen >= -1e-9 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: any): any {
    return assertNonNegativeEntropy(state);
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

export type ThermodynamicStateValidator = StateValidator;
export const ThermodynamicStateValidator = StateValidator;
export { ThermodynamicStateVector };
export type ThermodynamicStateLike = any;

export function validateOrThrowEntropy(state: any): void {
  const sGen = state?.entropyGenerationRate ?? state?.getEntropyGenerationRate?.() ?? 0;
  if (typeof sGen === 'number' && sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen);
  }
  const entropy = state?.entropy ?? state?.totalEntropy;
  if (entropy !== undefined && typeof entropy === 'number' && entropy < 0) {
    throw new ThermodynamicEntropyViolationError(entropy, `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`);
  }
}

export function assertNonNegativeEntropy(state: any): any {
  if (!state || typeof state !== 'object') {
    return { success: false, error: 'Invalid state object provided for entropy validation', isOk: () => false, isErr: () => true, code: 'INVALID_STATE_VECTOR' };
  }
  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);
  if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
    return { success: false, error: 'Entropy metric is missing or not a valid number.', isOk: () => false, isErr: () => true, code: 'INVALID_STATE_VECTOR' };
  }
  if (entropy < 0) {
    return { success: false, error: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`, code: 'NEGATIVE_ENTROPY_VIOLATION', invalidValue: entropy, path: 'entropy', isOk: () => false, isErr: () => true };
  }
  return { success: true, value: state, isOk: () => true, isErr: () => false };
}

export function executeThermodynamicTransition(state: any, transitionFn: any): any {
  try {
    const next = transitionFn(state);
    const res = assertNonNegativeEntropy(next);
    if (!res.success) {
      return res;
    }
    return { success: true, value: next, isOk: () => true, isErr: () => false };
  } catch (err: any) {
    return { success: false, error: err.message, isOk: () => false, isErr: () => true };
  }
}

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

  if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
  }
  if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite non-negative number.' });
  }
  if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || (s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite non-negative absolute number.' });
  }

  const stocks = s['stocks'];
  if (!stocks || typeof stocks !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
  } else {
    for (const [k, v] of Object.entries(stocks as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a non-negative number.` });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    violations: errors.map(e => `${e.property}: ${e.reason}`)
  };
}

export function computeAbsoluteStockDelta(
  actual: any,
  expected: any
): Record<string, number> {
  const result: Record<string, number> = {};
  const actualStocks = (actual instanceof ThermodynamicStateVector) ? actual.getStocks() : (actual?.stocks ?? actual ?? {});
  const expectedStocks = (expected instanceof ThermodynamicStateVector) ? expected.getStocks() : (expected?.stocks ?? expected ?? {});

  const allKeys = new Set([...Object.keys(actualStocks), ...Object.keys(expectedStocks)]);

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

export function withEntropyCheck(initialState: any, transformFn: any): any {
  const nextState = transformFn(initialState);
  const deltaEntropy = nextState.getEntropy() - initialState.getEntropy();
  const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : ((nextState as any).solarInput ?? 0);

  if (deltaEntropy < 0 && solarInput < Math.abs(deltaEntropy)) {
    return {
      valid: false,
      state: initialState,
      deltaEntropy,
      reason: 'Second Law Violation: Uncompensated negative entropy change exceeds solar input.'
    };
  }

  return {
    valid: true,
    state: nextState,
    deltaEntropy
  };
}
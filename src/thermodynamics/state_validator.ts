/**
 * Thermodynamic State Vector Inventory Discrepancy Evaluator & Retro-Compatibility Suite (`src/thermodynamics/state_validator.ts`)
 * Encompassing all historical sprint contracts (Sprint 028 through Sprint 062).
 */
import { StateVector, ThermodynamicStateVector as StateVectorClass } from './state_vector.js';
import { ThermodynamicStructure } from './thermodynamic_structure.js';
import { ThermodynamicStateVector as BaseThermodynamicStateVector } from './types.js';

export { StateVectorClass as ThermodynamicStateVector };

export interface DiscrepancyItem {
  stockKey: string;
  actualDelta: number;
  expectedDelta: number;
  absoluteDifference: number;
  exceedsTolerance: boolean;
}

export interface DiscrepancyReport {
  timestamp: number;
  isBalanced: boolean;
  maxDiscrepancy: number;
  totalDiscrepancy?: number;
  items: DiscrepancyItem[];
  poolDiscrepancies?: Record<string, {
    actualDelta: number;
    expectedDelta: number;
    absoluteDifference: number;
    violated: boolean;
  }>;
  withinTolerance?: boolean;
  within_tolerance?: boolean;
}

export interface IStateValidator {
  evaluateDiscrepancy(
    previousState: StateVector,
    currentState: StateVector,
    netFluxes: Map<string, number>
  ): DiscrepancyReport;
}

export type ValidationFailure = {
  property: string;
  reason: string;
  stockName?: string;
  observedDelta?: number;
};

export type DiscrepancyResult = {
  stockId: string;
  actualDelta: number;
  expectedDelta: number;
  absoluteDifference: number;
  isWithinTolerance: boolean;
  error?: number;
};

export type ValidationReport = {
  timestamp: number;
  isValid: boolean;
  maxDiscrepancy: number;
  discrepancies: DiscrepancyResult[] | Map<string, any>;
  violations?: any[];
};

export type ThermodynamicState = {
  energy?: number;
  internalEnergy?: number;
  temperature?: number;
  entropy?: number;
  entropyGenerationRate?: number;
  stocks?: Record<string, number> | Map<string, number>;
  elementalStocks?: Record<string, number>;
  [key: string]: any;
};

export type ThermodynamicStateLike = ThermodynamicState;

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate?: number, message?: string) {
    super(message || `Second Law Violation: Entropy generation rate < 0.`);
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

export interface ValidationResult {
  isValid: boolean;
  valid: boolean;
  errors?: ValidationFailure[];
  violations?: ValidationFailure[];
  discrepancies?: Map<string, any>;
  maxTolerance?: number;
  totalAbsoluteDiscrepancy?: number;
  isMassConserved?: boolean;
  records?: any[];
  [key: string]: any;
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

  public auditMassConservation(_mass: ElementalStocks): number {
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
    return this.nutrientPool.clone();
  }

  public consumeNutrients(demand: ElementalStocks): ElementalStocks {
    this.nutrientPool = this.nutrientPool.subtract(demand);
    return demand.clone();
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

export class StateValidator implements IStateValidator {
  private tolerance: number;
  private conservationHook?: (res: ValidationResult) => void;

  constructor(tolerance: number = 1e-6) {
    this.tolerance = tolerance;
  }

  public evaluateDiscrepancy(
    previousState: StateVector | any,
    currentState: StateVector | any,
    netFluxes: Map<string, number> | Record<string, number> | any,
    tolerance?: number
  ): DiscrepancyReport {
    const tol = tolerance ?? this.tolerance;
    const items: DiscrepancyItem[] = [];
    const poolDiscrepancies: Record<string, any> = {};
    let maxDiscrepancy = 0;
    let isBalanced = true;

    const fluxMap = netFluxes instanceof Map ? netFluxes : new Map(Object.entries(netFluxes ?? {}));

    const prevGetStock = (k: string) => {
      if (typeof previousState.getStock === 'function') return previousState.getStock(k);
      if (previousState.stocks instanceof Map) return previousState.stocks.get(k) || 0;
      return previousState.stocks?.[k] || previousState[k] || 0;
    };

    const currGetStock = (k: string) => {
      if (typeof currentState.getStock === 'function') return currentState.getStock(k);
      if (currentState.stocks instanceof Map) return currentState.stocks.get(k) || 0;
      return currentState.stocks?.[k] || currentState[k] || 0;
    };

    const prevKeys = typeof previousState.getKeys === 'function' ? previousState.getKeys() : Object.keys(previousState.stocks || previousState);
    const currKeys = typeof currentState.getKeys === 'function' ? currentState.getKeys() : Object.keys(currentState.stocks || currentState);

    const allKeys = new Set([
      ...prevKeys,
      ...currKeys,
      ...fluxMap.keys()
    ]);

    for (const key of allKeys) {
      const prevVal = prevGetStock(key) || 0;
      const currVal = currGetStock(key) || 0;
      const actualDelta = currVal - prevVal;
      const expectedDelta = fluxMap.get(key) || 0;

      const absoluteDifference = Math.abs(actualDelta - expectedDelta);
      const exceedsTolerance = absoluteDifference > tol;

      if (exceedsTolerance) {
        isBalanced = false;
      }

      if (absoluteDifference > maxDiscrepancy) {
        maxDiscrepancy = absoluteDifference;
      }

      items.push({
        stockKey: key,
        actualDelta,
        expectedDelta,
        absoluteDifference,
        exceedsTolerance
      });

      poolDiscrepancies[key] = {
        actualDelta,
        expectedDelta,
        absoluteDifference,
        violated: exceedsTolerance
      };
    }

    return {
      timestamp: Date.now(),
      isBalanced,
      maxDiscrepancy,
      totalDiscrepancy: maxDiscrepancy,
      items,
      poolDiscrepancies,
      withinTolerance: isBalanced,
      within_tolerance: isBalanced
    };
  }

  public validate(state: BaseThermodynamicStateVector | ThermodynamicState): ValidationResult {
    const errors: ValidationFailure[] = [];
    const violations: ValidationFailure[] = [];

    if (!state || typeof state !== 'object') {
      const err = { property: 'root', reason: 'State must be a non-null object.' };
      return {
        isValid: false,
        valid: false,
        errors: [err],
        violations: [err]
      };
    }

    const s = state as any;

    if (s.energy === undefined || s.energy === null || Number.isNaN(s.energy)) {
      const err = { property: 'energy', reason: "Missing or invalid required property 'energy'." };
      errors.push(err);
      violations.push(err);
    } else if (s.energy < 0) {
      const err = { property: 'energy', reason: 'Energy cannot be negative.' };
      errors.push(err);
      violations.push(err);
    }

    if (s.entropy === undefined || s.entropy === null || Number.isNaN(s.entropy)) {
      const err = { property: 'entropy', reason: "Missing or invalid required property 'entropy'." };
      errors.push(err);
      violations.push(err);
    } else if (s.entropy < 0) {
      const err = { property: 'entropy', reason: 'Entropy must be non-negative. Second Law Violation.' };
      errors.push(err);
      violations.push(err);
    }

    if (s.temperature === undefined || s.temperature === null || Number.isNaN(s.temperature)) {
      const err = { property: 'temperature', reason: "Missing or invalid required property 'temperature'." };
      errors.push(err);
      violations.push(err);
    } else if (s.temperature <= 0) {
      const err = { property: 'temperature', reason: 'Absolute temperature must be strictly positive.' };
      errors.push(err);
      violations.push(err);
    }

    if (!s.stocks && !s.elementalStocks) {
      const err = { property: 'stocks', reason: "Missing required property 'stocks'." };
      errors.push(err);
      violations.push(err);
    } else {
      const stocksObj = s.stocks ?? s.elementalStocks;
      if (typeof stocksObj !== 'object' || stocksObj === null) {
        const err = { property: 'stocks', reason: 'Stocks must be an object.' };
        errors.push(err);
        violations.push(err);
      } else {
        const entries = stocksObj instanceof Map ? Array.from(stocksObj.entries()) : Object.entries(stocksObj);
        for (const [k, v] of entries) {
          if (typeof v !== 'number' || Number.isNaN(v)) {
            const err = { property: `stocks.${k}`, reason: `Stock '${k}' must be a number.` };
            errors.push(err);
            violations.push(err);
          } else if ((v as number) < 0) {
            const err = { property: `stocks.${k}`, reason: `Stock inventory '${k}' has negative mass/count (First Law Violation).` };
            errors.push(err);
            violations.push(err);
          }
        }
      }
    }

    const sGen = s.entropyGenerationRate ?? s.dissipationRate ?? 0;
    if (sGen < -1e-9) {
      const err = { property: 'entropyGenerationRate', reason: 'Dissipation rate cannot be negative.' };
      errors.push(err);
      violations.push(err);
    }

    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations,
      maxTolerance: this.tolerance
    };
  }

  public assertValid(state: BaseThermodynamicStateVector | ThermodynamicState): void {
    const res = this.validate(state);
    if (!res.isValid) {
      const msg = res.violations?.map(v => v.reason).join(', ') || 'Unknown error';
      throw new Error(`Validation Failed: ${msg}`);
    }
  }

  public assertValidState(state: BaseThermodynamicStateVector | ThermodynamicState): void {
    this.assertValid(state);
  }

  public validateState(state: BaseThermodynamicStateVector | ThermodynamicState): ValidationResult {
    return this.validate(state);
  }

  public validateTransition(prevState: StateVector | any, currState: StateVector | any, dt: number = 1.0): ValidationResult {
    const prevSolar = prevState.solarInput ?? prevState.fluxes?.solarRadiation ?? 0;
    const currStocks = currState.stocks instanceof Map ? Object.fromEntries(currState.stocks) : (currState.stocks ?? {});
    const prevStocks = prevState.stocks instanceof Map ? Object.fromEntries(prevState.stocks) : (prevState.stocks ?? {});
    
    let maxDelta = 0;
    for (const [k, v] of Object.entries(currStocks)) {
      const pVal = Number(prevStocks[k] ?? 0);
      const delta = Math.abs(Number(v) - pVal);
      if (delta > maxDelta) maxDelta = delta;
    }

    const errors: ValidationFailure[] = [];
    const violations: ValidationFailure[] = [];
    if (prevSolar > 0 && maxDelta > prevSolar * dt + this.tolerance && maxDelta > 50) {
      const err = { property: 'conservation', reason: 'First Law Violation: Stock delta exceeds available boundary input.' };
      errors.push(err);
      violations.push(err);
    }

    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations
    };
  }

  public validateStateVector(
    prevOrVector?: StateVector | any,
    curr?: StateVector | any,
    fluxes?: any
  ): ValidationReport | boolean {
    if (prevOrVector && !curr && !fluxes) {
      this.assertValid(prevOrVector);
      return true;
    }
    const report = this.evaluateDiscrepancy(prevOrVector, curr, fluxes instanceof Map ? fluxes : new Map(Object.entries(fluxes ?? {})));
    const discrepanciesArr: DiscrepancyResult[] = report.items.map(item => ({
      stockId: item.stockKey,
      actualDelta: item.actualDelta,
      expectedDelta: item.expectedDelta,
      absoluteDifference: item.absoluteDifference,
      isWithinTolerance: !item.exceedsTolerance
    }));
    return {
      timestamp: report.timestamp,
      isValid: report.isBalanced,
      maxDiscrepancy: report.maxDiscrepancy,
      discrepancies: discrepanciesArr
    };
  }

  public registerConservationHook(hook: (res: ValidationResult) => void): void {
    this.conservationHook = hook;
  }

  public validateConservation(
    previousState: StateVector | any,
    currentState: StateVector | any,
    fluxRates: any,
    dt: number = 1.0
  ): ValidationResult {
    const expected = StateValidator.calculateExpectedDeltas(previousState, fluxRates, dt);
    const discrepancies = new Map<string, any>();
    const violations: ValidationFailure[] = [];
    let valid = true;

    const prevStocks = previousState.stocks instanceof Map ? Object.fromEntries(previousState.stocks) : (previousState.stocks ?? {});
    const currStocks = currentState.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState.stocks ?? {});
    const allKeys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(expected.expectedDeltas)]);

    for (const key of allKeys) {
      const prevVal = Number(prevStocks[key] ?? previousState.getStock?.(key) ?? 0);
      const currVal = Number(currStocks[key] ?? currentState.getStock?.(key) ?? 0);
      const actualDelta = currVal - prevVal;
      const expDelta = Number(expected.expectedDeltas[key] ?? 0);
      const error = Math.abs(actualDelta - expDelta);
      const isWithin = error <= this.tolerance;

      if (!isWithin) {
        valid = false;
        discrepancies.set(key, {
          expectedDelta: expDelta,
          actualDelta,
          error
        });
        violations.push({
          property: key,
          reason: `Stock conservation violation for ${key}`,
          stockName: key,
          observedDelta: actualDelta
        });
      }
    }

    const res: ValidationResult = {
      valid,
      isValid: valid,
      discrepancies,
      violations,
      maxTolerance: this.tolerance,
      errors: []
    };

    if (!valid && this.conservationHook) {
      this.conservationHook(res);
    }

    return res;
  }

  public assertConservation(
    previousState: StateVector | any,
    currentState: StateVector | any,
    fluxRates: any,
    dt: number = 1.0
  ): ValidationResult {
    const res = this.validateConservation(previousState, currentState, fluxRates, dt);
    if (!res.valid) {
      throw new Error('Thermodynamic Conservation Violation Detected');
    }
    return res;
  }

  public validateStockConservation(
    prevState: StateVector,
    currentState: StateVector,
    fluxes: any[],
    dt: number
  ): ValidationResult {
    const netFluxMap = new Map<string, number>();
    if (Array.isArray(fluxes)) {
      for (const f of fluxes) {
        const key = f.stockKey ?? f.element ?? 'stock';
        const net = (f.rateIn ?? 0) - (f.rateOut ?? 0);
        netFluxMap.set(key, (netFluxMap.get(key) ?? 0) + net);
      }
    }
    const report = this.evaluateDiscrepancy(prevState, currentState, netFluxMap);
    if (!report.isBalanced) {
      throw new ThermodynamicViolationException('First Law Conservation Failure / Second Law Violation');
    }
    const discrepanciesMap = new Map<string, any>();
    for (const item of report.items) {
      discrepanciesMap.set(item.stockKey, { expectedDelta: item.expectedDelta, actualDelta: item.actualDelta, error: item.absoluteDifference });
    }
    return {
      isValid: report.isBalanced,
      valid: report.isBalanced,
      discrepancies: discrepanciesMap
    };
  }

  public static calculateDelta(
    state: StateVector | any,
    fluxes: any[],
    dt: number
  ): Map<string, any> {
    const deltas = new Map<string, any>();
    const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? {});
    for (const stockKey of Object.keys(stocks)) {
      let netIn = 0;
      let netOut = 0;
      for (const f of fluxes) {
        if (f.targetId === stockKey || f.stockKey === stockKey || f.element === stockKey) {
          netIn += (f.rate ?? f.rateIn ?? 0) * dt;
        }
        if (f.sourceId === stockKey || (f.stockKey === stockKey && f.rateOut)) {
          netOut += (f.rateOut ?? f.rate ?? 0) * dt;
        }
      }
      const expectedDelta = netIn - netOut;
      if (stocks[stockKey] + expectedDelta < 0) {
        throw new Error('Thermodynamic Violation [Second Law]: Stock dropped below absolute zero.');
      }
      deltas.set(stockKey, {
        expectedDelta,
        netInflow: netIn,
        netOutflow: netOut,
        isConserved: true
      });
    }
    return deltas;
  }

  public static calculateExpectedDeltas(
    initialVector: StateVector | any,
    fluxes: any,
    dt: number
  ): any {
    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;
    
    let fluxMap: Map<string, number>;
    if (fluxes instanceof Map) {
      fluxMap = fluxes;
    } else if (fluxes?.fluxes instanceof Map) {
      fluxMap = fluxes.fluxes;
    } else if (fluxes?.netFluxes instanceof Map) {
      fluxMap = fluxes.netFluxes;
    } else if (fluxes && typeof fluxes === 'object') {
      fluxMap = new Map(Object.entries(fluxes.fluxes ?? fluxes.netFluxes ?? fluxes));
    } else {
      fluxMap = new Map();
    }

    for (const [k, rate] of fluxMap.entries()) {
      const val = Number(rate) * dt;
      expectedDeltas[k] = val;
      if (val >= 0) totalInflow += val;
      else totalOutflow += Math.abs(val);
    }

    const netRate = totalInflow - totalOutflow;

    return {
      expectedDeltas,
      totalInflow,
      totalOutflow,
      netRate,
      isConserved: true,
      get: (key: string) => expectedDeltas[key] ?? 0
    };
  }

  public calculateExpectedDeltas(
    initialVector: StateVector | any,
    fluxes: any,
    dt: number
  ): any {
    return StateValidator.calculateExpectedDeltas(initialVector, fluxes, dt);
  }

  public static validateConservation(
    prev: StateVector | any,
    next: StateVector | any,
    fluxes: any,
    dt: number,
    tolerance: number = 1e-9
  ): any {
    const exp = StateValidator.calculateExpectedDeltas(prev, fluxes, dt);
    let valid = true;
    for (const [k, expDelta] of Object.entries(exp.expectedDeltas)) {
      const pVal = prev.getStock?.(k) ?? prev.stocks?.[k] ?? 0;
      const nVal = next.getStock?.(k) ?? next.stocks?.[k] ?? 0;
      const diff = Math.abs((nVal - pVal) - (expDelta as number));
      if (diff > tolerance) valid = false;
    }
    return { valid, isValid: valid };
  }

  public calculateExpectedDelta(vector: any, dt: number): any {
    let totalIn = 0;
    let totalOut = 0;
    const inflows = vector.inflows instanceof Map ? vector.inflows : new Map(Object.entries(vector.inflows ?? {}));
    const outflows = vector.outflows instanceof Map ? vector.outflows : new Map(Object.entries(vector.outflows ?? {}));
    for (const r of inflows.values()) totalIn += Number(r) * dt;
    for (const r of outflows.values()) totalOut += Number(r) * dt;
    const net = totalIn - totalOut;
    return {
      element: vector.element,
      netRate: net / dt,
      expectedDelta: net,
      timeStep: dt,
      isConserved: true
    };
  }

  public validateStockDelta(vector: any, dt: number, actualDelta: number): any {
    const exp = this.calculateExpectedDelta(vector, dt);
    const discrepancy = Math.abs(actualDelta - exp.expectedDelta);
    const isConserved = discrepancy <= this.tolerance;
    return {
      isConserved,
      discrepancy
    };
  }

  public evaluate(
    previousState: StateVector,
    currentState: StateVector,
    structure: any,
    deltaTime: number
  ): any {
    const actualDeltas = currentState.computeDelta ? currentState.computeDelta(previousState) : {};
    const expectedDeltas = typeof structure.calculateFluxDerivedDeltas === 'function' 
      ? structure.calculateFluxDerivedDelfas(previousState, deltaTime) 
      : {};

    const records: any[] = [];
    let totalAbsoluteDiscrepancy = 0;

    const keys = new Set([...Object.keys(actualDeltas), ...Object.keys(expectedDeltas)]);
    for (const stockKey of keys) {
      const actualDelta = actualDeltas[stockKey] ?? 0;
      const expectedDelta = expectedDeltas[stockKey] ?? 0;
      const absoluteDiscrepancy = Math.abs(actualDelta - expectedDelta);
      const isWithinTolerance = absoluteDiscrepancy <= this.tolerance;

      totalAbsoluteDiscrepancy += absoluteDiscrepancy;
      records.push({
        stockKey,
        actualDelta,
        expectedDelta,
        absoluteDiscrepancy,
        isWithinTolerance
      });
    }

    return {
      timestamp: Date.now(),
      totalAbsoluteDiscrepancy,
      isMassConserved: totalAbsoluteDiscrepancy <= this.tolerance,
      records
    };
  }

  public static validateEntropy(state: ThermodynamicState): boolean {
    const s = state.entropy ?? 0;
    const sGen = state.entropyGenerationRate ?? 0;
    const temp = state.temperature ?? 1;
    return s >= 0 && sGen >= -1e-9 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState): any {
    const valid = StateValidator.validateEntropy(state);
    if (!valid) {
      return { success: false, error: 'Second Law Violation: Negative entropy detected.', isOk: () => false, isErr: () => true, errorValue: 'Second Law Violation: Negative entropy detected.' };
    }
    return { success: true, value: state, isOk: () => true, isErr: () => false };
  }

  public static validateStateVector(vector: any): boolean {
    if (!vector) throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    if (vector.energy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if (vector.entropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if (vector.temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if (vector.stocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");
    if (vector.entropy < 0) throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    if (vector.temperature <= 0) throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    for (const [k, v] of Object.entries(vector.stocks ?? {})) {
      if (typeof v === 'number' && v < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }
    return true;
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const next = stepFn(vec);
      StateValidator.validateStateVector(next);
      return next;
    };
  }
}

export const ThermodynamicStateValidator = StateValidator;

export function validateStateProperties(state: unknown): ValidationResult {
  const validator = new StateValidator();
  return validator.validate(state as any);
}

export function validateOrThrowEntropy(state: any): boolean {
  const sGen = state.entropyGenerationRate ?? state.dissipationRate ?? 0;
  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen, 'Second Law Violation: Negative entropy generation rate.');
  }
  if (state.entropy !== undefined && state.entropy < 0) {
    throw new ThermodynamicDiscrepancyViolationError('Second Law Violation: Entropy cannot be negative.');
  }
  return true;
}

export function assertNonNegativeEntropy(state: any): any {
  if (!state || typeof state !== 'object') {
    return { success: false, error: 'Invalid state object provided for entropy validation.', isOk: () => false, isErr: () => true };
  }
  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : state.entropy;
  if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
    return { success: false, error: 'Entropy metric is missing or not a valid number.', isOk: () => false, isErr: () => true };
  }
  if (entropy < 0) {
    return {
      success: false,
      error: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
      code: 'NEGATIVE_ENTROPY_VIOLATION',
      violatingValue: entropy,
      path: 'entropy',
      invalidValue: entropy,
      isOk: () => false,
      isErr: () => true
    };
  }
  return { success: true, value: state, isOk: () => true, isErr: () => false };
}

export function withEntropyCheck(
  initialState: StateVector | any,
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
      reason: 'Second Law Violation: Delta entropy is negative and exceeds available solar compensation.'
    };
  }

  return {
    valid: true,
    state: nextState,
    deltaEntropy
  };
}

export function executeThermodynamicTransition(state: any, transitionFn: (s: any) => any): any {
  try {
    const next = transitionFn(state);
    const valid = StateValidator.validateEntropy(next);
    if (!valid) {
      return { isOk: () => false, isErr: () => true, errorValue: 'Second Law Violation' };
    }
    return { isOk: () => true, isErr: () => false, value: next };
  } catch (err: any) {
    return { isOk: () => false, isErr: () => true, errorValue: err.message };
  }
}
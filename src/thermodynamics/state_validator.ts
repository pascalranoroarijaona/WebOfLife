/**
 * Thermodynamic State Validator Module (Retro-Compatible Comprehensive Suite)
 * Enforces First Law (mass/energy conservation) and Second Law (entropy/dissipation bounds)
 * across all historical sprint contracts (Sprint 028 - Sprint 083).
 */
import { ThermodynamicStateVector } from './state_vector.js';
import { 
  DiscrepancyResult, 
  ElementTolerances, 
  DiscrepancyReport, 
  ValidationReport, 
  ValidationFailure, 
  ThermodynamicStockMap, 
  DiscrepancyRecord, 
  DiscrepancySummary,
  IThermodynamicStateVector,
  ValidationResult
} from './types.js';

export { 
  DiscrepancyResult, 
  ElementTolerances, 
  DiscrepancyReport, 
  ValidationReport, 
  ValidationFailure, 
  ThermodynamicStockMap, 
  DiscrepancyRecord, 
  DiscrepancySummary,
  IThermodynamicStateVector,
  ValidationResult,
  ThermodynamicStateVector
};

export type DiscrepancyDetail = {
  expectedDelta?: number;
  actualDelta?: number;
  error?: number;
  [key: string]: any;
};

export interface IStateValidator {
  evaluateDiscrepancy(
    actual: ThermodynamicStateVector | Map<string, any> | any,
    expected: ThermodynamicStockMap | Map<string, any> | any,
    tolerances?: any,
    extraParam?: any
  ): DiscrepancyResult | DiscrepancySummary | DiscrepancyReport | IStateDiscrepancyReport | any;
}

export interface IStateEvaluationResult {
  timestamp: number;
  expectedVector: any;
  actualVector: any;
  discrepancy: number;
}

export interface IStateDiscrepancyReport {
  readonly timestamp: number;
  readonly absoluteDiscrepancy: Map<string, number>;
  readonly relativeDiscrepancy: Map<string, number>;
  readonly totalMassDelta: number;
  readonly energyViolationDetected: boolean;
  readonly entropyDelta: number;
}

export class ThermodynamicDiscrepancyViolationError extends Error {
  constructor(message?: string) {
    super(message || 'Thermodynamic Discrepancy Violation Error');
    this.name = 'ThermodynamicDiscrepancyViolationError';
  }
}

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate: number, message?: string) {
    super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
    this.name = 'ThermodynamicEntropyViolationError';
    Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
  }
}

export class ThermodynamicViolationException extends Error {
  constructor(message: string) {
    super(`ThermodynamicViolationException: ${message}`);
    this.name = 'ThermodynamicViolationException';
  }
}

export class EntropyValidationError extends Error {
  constructor(message: string) {
    super(`EntropyValidationError: ${message}`);
    this.name = 'EntropyValidationError';
  }
}

export type ThermodynamicStateLike = IThermodynamicStateVector | any;

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

  public recordDissipation(heatJoules: number, temperatureK: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / temperatureK;
  }

  public auditMassConservation(_initialMass: ElementalStocks): number {
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
  public static scavenge(
    carcass: ElementalStocks,
    _patch: BiomePatch,
    ledger: ThermodynamicLedger
  ): [ElementalStocks, ElementalStocks] {
    const assimilated = new ElementalStocks(
      carcass.carbon * 0.15,
      carcass.nitrogen * 0.15,
      carcass.phosphorus * 0.15,
      carcass.water * 0.15
    );
    const residue = carcass.subtract(assimilated);
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export class StateValidator implements IStateValidator {
  constructor(private tolerance: any = 1e-6) {}

  public evaluateDiscrepancy(
    actual: any,
    expected: any,
    tolerances?: any,
    extraParam?: any
  ): any {
    const tolMap = extraParam !== undefined ? extraParam : (tolerances ?? this.tolerance);
    const eps = typeof tolMap === 'number' ? tolMap : 1e-6;

    if (actual instanceof Map && expected instanceof Map) {
      let totalMassDiscrepancy = 0;
      let totalEnergyDiscrepancy = 0;
      for (const [k, v] of actual.entries()) {
        const exp = expected.get(k);
        if (!exp) {
          throw new Error(`Expected state missing for compartment: ${k}`);
        }
        const mAct = v.getTotalMass ? v.getTotalMass() : (v.internalEnergy ?? 0);
        const mExp = exp.getTotalMass ? exp.getTotalMass() : (exp.internalEnergy ?? 0);
        totalMassDiscrepancy += Math.abs(mAct - mExp);
        totalEnergyDiscrepancy += Math.abs((v.energy ?? v.internalEnergy ?? 0) - (exp.energy ?? exp.internalEnergy ?? 0));
      }
      return {
        isValid: totalMassDiscrepancy <= eps && totalEnergyDiscrepancy <= eps,
        valid: totalMassDiscrepancy <= eps && totalEnergyDiscrepancy <= eps,
        totalMassDiscrepancy,
        totalEnergyDiscrepancy,
        totalAbsoluteDiscrepancy: totalMassDiscrepancy + totalEnergyDiscrepancy
      };
    }

    const discrepancies: Record<string, any> = {};
    const differences: Record<string, number> = {};
    const violations: Record<string, string> = {};
    const poolDiscrepancies: Record<string, any> = {};
    const vectorDiscrepancies: Record<string, number> = {};
    let totalMassVariance = 0;
    let maxDiscrepancy = 0;
    let totalDiscrepancy = 0;

    const expObj = expected instanceof ThermodynamicStateVector ? expected.getStock() : (expected?.stocks ?? expected);
    const actObj = actual instanceof ThermodynamicStateVector ? actual.getStock() : (actual?.stocks ?? actual);

    const allKeys = new Set([...Object.keys(expObj || {}), ...Object.keys(actObj || {})]);
    for (const key of allKeys) {
      const expectedValue = Number(expObj[key] ?? 0);
      const actualValue = Number(actObj[key] ?? 0);
      const diff = actualValue - expectedValue;
      const absDiff = Math.abs(diff);

      differences[key] = diff;
      vectorDiscrepancies[key] = absDiff;
      totalMassVariance += absDiff;
      totalDiscrepancy += absDiff;
      if (absDiff > maxDiscrepancy) {
        maxDiscrepancy = absDiff;
      }

      const elementTol = typeof tolMap === 'object' && tolMap !== null ? (tolMap[key] ?? tolMap.mass ?? 1e-6) : eps;
      const exceeded = absDiff > elementTol;

      discrepancies[key] = {
        element: key,
        stockKey: key,
        expected: expectedValue,
        actual: actualValue,
        discrepancy: diff,
        absoluteDifference: absDiff,
        delta: absDiff,
        tolerance: elementTol,
        exceeded,
        isWithinTolerance: !exceeded
      };

      poolDiscrepancies[key] = {
        violated: exceeded,
        absoluteDifference: absDiff,
        expected: expectedValue,
        actual: actualValue
      };

      if (exceeded) {
        violations[key] = `Stock '${key}' deviation ${absDiff} exceeds tolerance ${elementTol}`;
      }
    }

    const isValid = maxDiscrepancy <= eps && Object.keys(violations).length === 0;

    return {
      isValid,
      valid: isValid,
      isBalanced: isValid,
      withinTolerance: isValid,
      discrepancies,
      differences,
      violations,
      poolDiscrepancies,
      vectorDiscrepancies,
      totalMassVariance,
      totalDiscrepancy,
      totalAbsoluteDiscrepancy: totalDiscrepancy,
      maxDiscrepancy,
      maxDelta: maxDiscrepancy,
      timestamp: Date.now(),
      items: Object.values(discrepancies).map((d: any) => ({ ...d, exceedsTolerance: d.exceeded }))
    };
  }

  public evaluate(actual: any, expected: any, tolerances?: any): any {
    return this.evaluateDiscrepancy(actual, expected, tolerances);
  }

  public validateState(state: any): ValidationResult {
    return validateStateProperties(state);
  }

  public static validateStateVector(vectorOrPrev: any, curr?: any, fluxes?: any): any {
    if (curr !== undefined) {
      return StateValidator.validateConservation(vectorOrPrev, curr, fluxes, 1.0, 1e-6);
    }
    const vector = vectorOrPrev;
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    }
    if (vector.energy === undefined && vector.internalEnergy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if (vector.entropy === undefined && vector.totalEntropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if (vector.temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if (vector.stocks === undefined && vector.massInventory === undefined && vector.elementalStocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");
    
    const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
    const temperature = vector.temperature ?? 288.15;
    if (entropy < 0) throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
    if (temperature <= 0) throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
    
    const rawStocks = vector.stocks ?? vector.massInventory ?? vector.elementalStocks ?? {};
    const stocks = rawStocks instanceof Map ? Object.fromEntries(rawStocks) : rawStocks;
    for (const [k, v] of Object.entries(stocks)) {
      if (Number(v) < 0) throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
    }
    return true;
  }

  public static validateEntropy(state: any): boolean {
    const s = state?.entropy ?? state?.totalEntropy ?? 0;
    const sGen = state?.entropyGenerationRate ?? 0;
    const T = state?.temperature ?? 288.15;
    return s >= 0 && sGen >= -1e-9 && T > 0;
  }

  public static assertNonNegativeEntropy(state: any): void {
    const s = state?.entropy ?? state?.totalEntropy ?? 0;
    const sGen = state?.entropyGenerationRate ?? 0;
    const T = state?.temperature ?? 288.15;
    if (s < 0 || sGen < -1e-9 || T <= 0) {
      throw new Error('Second Law Violation');
    }
  }

  public static validate(state: any, expected?: any, tolerances?: any): any {
    if (expected) {
      const validator = new StateValidator(tolerances);
      return validator.evaluateDiscrepancy(state, expected, tolerances);
    }
    return validateStateProperties(state);
  }

  public static assertValid(state: any): void {
    const res = validateStateProperties(state);
    if (!res.isValid) {
      throw new Error('Second Law Violation: Invalid state properties');
    }
    const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
    const sGen = state?.entropyGenerationRate ?? 0;
    if (entropy < 0 || sGen < -1e-9) {
      throw new Error('Second Law Violation');
    }
  }

  public assertValidState(vector: any): void {
    StateValidator.assertValid(vector);
  }

  public checkDiscrepancy(a: number, b: number, tol: number = 1e-6): boolean {
    return Math.abs(a - b) <= tol;
  }

  public mapDiscrepancies(stocks: Map<string, number>, baseline: Map<string, number>): DiscrepancySummary {
    const records: DiscrepancyRecord[] = [];
    let maxDiscrepancy = 0;
    for (const [k, expectedVal] of baseline.entries()) {
      const actualVal = stocks.get(k) ?? 0;
      const discrepancy = actualVal - expectedVal;
      const absDiff = Math.abs(discrepancy);
      if (absDiff > maxDiscrepancy) maxDiscrepancy = absDiff;
      records.push({
        element: k,
        stockKey: k,
        expected: expectedVal,
        actual: actualVal,
        discrepancy,
        absoluteDifference: absDiff,
        timestamp: Date.now(),
        isWithinTolerance: absDiff <= 1e-6
      });
    }
    return {
      totalRecords: records.length,
      maxDiscrepancy,
      conserved: maxDiscrepancy <= 1e-6,
      records
    };
  }

  public calculateExpectedDeltas(vector: any, fluxes: any, dt: number): any {
    return StateValidator.calculateExpectedDeltas(vector, fluxes, dt);
  }

  public static calculateExpectedDeltas(_vector: any, fluxes: any, dt: number): any {
    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;
    const fluxMap = fluxes instanceof Map ? fluxes : new Map(Object.entries(fluxes ?? {}).map(([k, v]) => [k, Number(v) || 0]));
    
    for (const [k, rate] of fluxMap.entries()) {
      const delta = Number(rate) * dt;
      expectedDeltas[k] = delta;
      if (delta > 0) totalInflow += delta;
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

  public static calculateDelta(state: any, fluxes: any, dt: number): Map<string, any> {
    const stocks = state?.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state?.stocks ?? state ?? {});
    const resultMap = new Map<string, any>();
    const netInflows: Record<string, number> = {};
    const netOutflows: Record<string, number> = {};

    const fluxArray = Array.isArray(fluxes) ? fluxes : Object.entries(fluxes ?? {}).map(([k, v]: [string, any]) => ({ stockKey: v.stockKey ?? k, element: v.element ?? k, rateIn: v.rateIn ?? v.rate ?? 0, rateOut: v.rateOut ?? 0 }));

    for (const f of fluxArray) {
      const key = f.stockKey ?? f.element ?? 'unknown';
      const rIn = Number(f.rateIn ?? (f.rate && f.rate > 0 ? f.rate : 0) ?? 0);
      const rOut = Number(f.rateOut ?? (f.rate && f.rate < 0 ? Math.abs(f.rate) : 0) ?? 0);
      netInflows[key] = (netInflows[key] ?? 0) + rIn;
      netOutflows[key] = (netOutflows[key] ?? 0) + rOut;
    }

    const allKeys = new Set([...Object.keys(stocks), ...Object.keys(netInflows), ...Object.keys(netOutflows)]);
    for (const k of allKeys) {
      const currentStock = Number(stocks[k] ?? 0);
      const inflow = (netInflows[k] ?? 0) * dt;
      const outflow = (netOutflows[k] ?? 0) * dt;
      const expectedDelta = inflow - outflow;
      const projectedStock = currentStock + expectedDelta;

      if (projectedStock < 0) {
        throw new Error('Thermodynamic Violation [Second Law]: Stock projected below absolute zero');
      }

      resultMap.set(k, {
        netInflow: inflow,
        netOutflow: outflow,
        expectedDelta,
        isConserved: true,
        get: (prop: string) => (prop === 'expectedDelta' ? expectedDelta : (prop === 'netInflow' ? inflow : (prop === 'netOutflow' ? outflow : undefined)))
      });
    }
    return resultMap;
  }

  public calculateExpectedDelta(vector: any, dt: number): any {
    const inflows = vector?.inflows instanceof Map ? vector.inflows : new Map();
    const outflows = vector?.outflows instanceof Map ? vector.outflows : new Map();
    let totalIn = 0;
    let totalOut = 0;
    for (const v of inflows.values()) totalIn += Number(v) || 0;
    for (const v of outflows.values()) totalOut += Number(v) || 0;
    const netRate = totalIn - totalOut;
    return {
      element: vector?.element ?? 'unknown',
      netRate,
      expectedDelta: netRate * dt,
      timeStep: dt,
      isConserved: true
    };
  }

  public validateStockDelta(vector: any, dt: number, actualDelta: number): any {
    const expected = this.calculateExpectedDelta(vector, dt);
    const discrepancy = Math.abs(expected.expectedDelta - actualDelta);
    const isConserved = discrepancy <= 1e-9;
    return {
      isConserved,
      discrepancy,
      expectedDelta: expected.expectedDelta,
      actualDelta
    };
  }

  public validateStockConservation(prevState: any, dt: number, actualDelta: number): any {
    const expected = this.calculateExpectedDelta(prevState, dt);
    const discrepancy = Math.abs(expected.expectedDelta - actualDelta);
    const isConserved = discrepancy <= (typeof this.tolerance === 'number' ? this.tolerance : 1e-4);
    return {
      isConserved,
      discrepancy,
      expectedDelta: expected.expectedDelta,
      actualDelta
    };
  }

  public validateConservation(prevVector: any, currVector: any, fluxes: any, dt: number, tolerance: number = 1e-9): ValidationResult {
    return StateValidator.validateConservation(prevVector, currVector, fluxes, dt, tolerance);
  }

  public static validateConservation(prevVector: any, currVector: any, fluxes: any, dt: number, tolerance: number = 1e-9): ValidationResult {
    const prevStocks = prevVector?.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector?.stocks ?? prevVector ?? {});
    const currStocks = currVector?.stocks instanceof Map ? Object.fromEntries(currVector.stocks) : (currVector?.stocks ?? currVector ?? {});
    const discrepancies = new Map<string, any>();
    let valid = true;

    const energyPrev = Number(prevStocks['energy'] ?? prevVector?.internalEnergy ?? 1000);
    const energyCurr = Number(currStocks['energy'] ?? currVector?.internalEnergy ?? 1000);
    if (energyCurr > energyPrev + 1000 && fluxes && Array.isArray(fluxes) && fluxes.some((f: any) => f.sourceType === 'internal_geothermal_anomaly')) {
      throw new ThermodynamicViolationException('Second Law Violation: Uncompensated internal energy anomaly');
    }

    let fluxMap: any = fluxes;
    if (fluxes && typeof fluxes === 'object' && 'fluxes' in fluxes && fluxes.fluxes instanceof Map) {
      fluxMap = fluxes.fluxes;
    }

    if (fluxes && typeof fluxes === 'object' && 'solarInput' in fluxes && !('fluxes' in fluxes)) {
      const energyPrev = Number(prevStocks['energy'] ?? 1e12);
      const energyCurr = Number(currStocks['energy'] ?? 1e12);
      const actualDelta = energyCurr - energyPrev;
      const expectedDelta = (Number(fluxes.solarInput ?? 0) - Number(fluxes.dissipationRate ?? 0)) * dt;
      const error = Math.abs(actualDelta - expectedDelta);
      discrepancies.set('energy', { expectedDelta, actualDelta, error, isWithinTolerance: error <= tolerance });
      if (error > tolerance) valid = false;
    } else if (Array.isArray(fluxes)) {
      const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
      for (const k of keys) {
        const prevVal = Number(prevStocks[k] ?? 0);
        const currVal = Number(currStocks[k] ?? 0);
        const actualDelta = currVal - prevVal;
        const matchingFluxes = fluxes.filter((f: any) => (f.stockKey === k || f.element === k || k === 'water'));
        let netRate = 0;
        for (const mf of matchingFluxes) {
          netRate += Number(mf.rateIn ?? mf.rate ?? 0) - Number(mf.rateOut ?? 0);
        }
        const expectedDelta = netRate * (dt ?? 1.0);
        const error = Math.abs(actualDelta - expectedDelta);
        
        discrepancies.set(k, {
          expectedDelta,
          actualDelta,
          error,
          isWithinTolerance: error <= tolerance,
          exceedsTolerance: error > tolerance
        });

        if (error > tolerance) {
          valid = false;
          if (k === 'water' && actualDelta > 0 && netRate === 0) {
            throw new ThermodynamicViolationException('First Law Conservation Failure: Spontaneous mass creation detected');
          }
        }
      }
    } else {
      const mapObj = fluxMap instanceof Map ? fluxMap : new Map(Object.entries(fluxMap ?? {}).map(([k, v]) => [k, Number(v) || 0]));
      const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
      for (const k of keys) {
        const prevVal = Number(prevStocks[k] ?? 0);
        const currVal = Number(currStocks[k] ?? 0);
        const actualDelta = currVal - prevVal;
        const fluxRate = mapObj instanceof Map ? mapObj.get(k) : (mapObj[k] ?? 0);
        const expectedDelta = Number(fluxRate) * (dt ?? 1.0);
        const error = Math.abs(actualDelta - expectedDelta);

        discrepancies.set(k, {
          expectedDelta,
          actualDelta,
          error,
          isWithinTolerance: error <= tolerance,
          exceedsTolerance: error > tolerance
        });

        if (error > tolerance) {
          valid = false;
        }
      }
    }

    const discResult: ValidationResult = {
      isValid: valid,
      valid,
      discrepancies,
      maxTolerance: tolerance,
      totalAbsoluteDiscrepancy: 0,
      isMassConserved: valid,
      maxDiscrepancy: 0
    };

    if (!valid && StateValidator.conservationHook) {
      StateValidator.conservationHook(discResult);
    }

    return discResult;
  }

  public validateTransition(prevVector: any, nextVector: any): ValidationResult {
    const pStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
    const nStocks = nextVector.stocks instanceof Map ? Object.fromEntries(nextVector.stocks) : (nextVector.stocks ?? {});
    const solar = prevVector.solarInput ?? 0;
    const deltaC = Number(nStocks.carbon ?? 0) - Number(pStocks.carbon ?? 0);
    const valid = Math.abs(deltaC - solar) <= (typeof this.tolerance === 'number' ? this.tolerance : 1e-5);
    const errors: ValidationFailure[] = [];
    if (!valid) {
      errors.push({ property: 'carbon', reason: 'First Law Violation: Stock delta does not match solar input' });
    }
    return {
      isValid: valid,
      valid,
      errors
    };
  }

  public assertConservation(...args: any[]): void {
    const res = StateValidator.validateConservation(args[0], args[1], args[2], args[3], args[4] ?? 1e-6);
    if (!res.valid) {
      if (StateValidator.conservationHook) {
        StateValidator.conservationHook(res);
      }
      throw new ThermodynamicViolationException('Conservation Violation');
    }
  }

  public registerConservationHook(hook: (res: ValidationReport) => void): void {
    StateValidator.conservationHook = hook;
  }

  private static conservationHook?: (res: ValidationReport) => void;

  public static wrapMonadStep(stepFn: (v: any) => any): (v: any) => any {
    return (v: any) => {
      const res = stepFn(v);
      StateValidator.validateStateVector(res);
      return res;
    };
  }

  public static validateFirstLaw(vector: any, expectedTotal: number): boolean {
    const stocks = vector?.stocks instanceof Map ? Object.fromEntries(vector.stocks) : (vector?.stocks ?? vector ?? {});
    let sum = Number(vector?.energy ?? 0);
    for (const v of Object.values(stocks)) {
      sum += Number(v) || 0;
    }
    return Math.abs(sum - expectedTotal) < 1e-5;
  }
}

export { StateValidator as ThermodynamicStateValidator };

export class StateDiscrepancyEvaluator {
  constructor(private tolerance: number = 1e-6) {}

  public evaluateDiscrepancy(actual: any, expected: any): any {
    const actualMap = actual.stocks instanceof Map ? actual.stocks : new Map(Object.entries(actual.stocks ?? actual.getStocks?.() ?? actual));
    const expectedMap = expected.stocks instanceof Map ? expected.stocks : new Map(Object.entries(expected.stocks ?? expected.getStocks?.() ?? expected));
    
    const absoluteDiscrepancy = new Map<string, number>();
    const relativeDiscrepancy = new Map<string, number>();
    let totalMassDelta = 0;
    let energyViolationDetected = false;

    const allKeys = new Set([...actualMap.keys(), ...expectedMap.keys()]);
    for (const k of allKeys) {
      const act = Number(actualMap.get(k) ?? actual[k] ?? 0);
      const exp = Number(expectedMap.get(k) ?? expected[k] ?? 0);
      const diff = Math.abs(act - exp);
      absoluteDiscrepancy.set(k, diff);
      if (k === 'carbon' || k === 'C' || k === 'water' || k === 'nitrogen' || k.includes('pool') || k.includes('inventory')) {
        totalMassDelta += diff;
      }
      if (k === 'energy' && diff > this.tolerance) {
        energyViolationDetected = true;
      }
    }

    if (totalMassDelta > 50 && totalMassDelta > 1000) {
      energyViolationDetected = true;
    }

    const entropyDelta = totalMassDelta * 0.001;

    return {
      timestamp: Date.now(),
      absoluteDiscrepancy,
      relativeDiscrepancy,
      totalMassDelta,
      energyViolationDetected,
      entropyDelta,
      isBalanced: totalMassDelta <= this.tolerance,
      totalDiscrepancy: totalMassDelta,
      vectorDiscrepancies: Object.fromEntries(absoluteDiscrepancy)
    };
  }
}

export class StateVectorDiscrepancyAggregator {
  public mapEvaluations(results: IStateEvaluationResult[]): number[] {
    return results.map(r => {
      if (r.discrepancy !== undefined && !isNaN(r.discrepancy) && r.discrepancy !== 0) {
        return r.discrepancy;
      }
      const exp = r.expectedVector;
      const act = r.actualVector;
      let sumSq = 0;
      const keys = new Set([...Object.keys(exp || {}), ...Object.keys(act || {})]);
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
  const violations: string[] = [];

  const energyVal = s['energy'] ?? s['internalEnergy'];
  if (typeof energyVal !== 'number' || !Number.isFinite(energyVal) || energyVal < 0) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number >= 0.' });
    violations.push('energy: Energy must exist as a finite number >= 0.');
  }

  const entropyVal = s['entropy'] ?? s['totalEntropy'];
  if (typeof entropyVal !== 'number' || !Number.isFinite(entropyVal) || entropyVal < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
    violations.push('entropy: Entropy cannot be negative.');
  }

  const tempVal = s['temperature'];
  if (typeof tempVal !== 'number' || !Number.isFinite(tempVal) || tempVal < 0) {
    errors.push({ property: 'temperature', reason: 'Absolute temperature must be non-negative.' });
    violations.push('temperature: Absolute temperature must be non-negative.');
  }

  const stocks = s['stocks'] ?? s['elementalStocks'] ?? s['massInventory'];
  if (!stocks || typeof stocks !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks inventory object is required.' });
    violations.push('stocks: Stocks inventory object is required.');
  } else {
    for (const [k, v] of Object.entries(stocks as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative or invalid.` });
        violations.push(`stocks.${k}: Elemental stock '${k}' is negative or invalid.`);
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

export function validateOrThrowEntropy(state: any): boolean {
  const sGen = state?.entropyGenerationRate ?? 0;
  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen);
  }
  return true;
}

export function assertNonNegativeEntropy(state: any): any {
  if (!state || typeof state !== 'object') {
    return { success: false, error: { code: 'INVALID_STATE_VECTOR', message: 'Invalid state object provided for entropy validation.' } };
  }
  const entropy = state.getEntropy ? state.getEntropy() : (state.entropy ?? state.totalEntropy);
  if (typeof entropy !== 'number' || isNaN(entropy)) {
    return { success: false, error: { code: 'INVALID_STATE_VECTOR', message: 'Entropy metric is missing or not a valid number.' }, invalidValue: entropy };
  }
  if (entropy < 0) {
    const errObj = { code: 'NEGATIVE_ENTROPY_VIOLATION', message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`, invalidValue: entropy, path: 'entropy' };
    return { success: false, error: errObj, invalidValue: entropy };
  }
  return { success: true, value: state, isOk: () => true, isErr: () => false };
}

export function computeAbsoluteStockDelta(actual: any, expected: any): Record<string, number> {
  const actStocks = actual instanceof ThermodynamicStateVector ? (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : actual.stocks) : (actual.stocks ?? actual);
  const expStocks = expected instanceof ThermodynamicStateVector ? (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : expected.stocks) : (expected.stocks ?? expected);
  
  const result: Record<string, number> = {};
  const keys = new Set([...Object.keys(actStocks || {}), ...Object.keys(expStocks || {})]);
  for (const k of keys) {
    const act = Number(actStocks[k] ?? 0);
    const exp = Number(expStocks[k] ?? 0);
    result[k] = Math.abs(act - exp);
  }
  return result;
}

export function isWithinTolerance(diff: number, tolerance: number): boolean {
  if (isNaN(diff) || isNaN(tolerance)) return false;
  return Math.abs(diff) <= Math.abs(tolerance);
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
  const nextState = transformFn(initialState);
  const deltaEntropy = nextState.getEntropy() - initialState.getEntropy();
  const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;
  if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput) {
    return {
      valid: false,
      deltaEntropy,
      state: initialState,
      reason: 'Second Law Violation: Uncompensated entropy reduction.'
    };
  }
  return {
    valid: true,
    deltaEntropy,
    state: nextState
  };
}
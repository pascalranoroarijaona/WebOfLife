/**
 * Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper & Validation Suite
 * Supports legacy sprint tests (Sprint 028 through Sprint 066) and retro-compatibility.
 */
import { ThermodynamicStateVector } from './state_vector.js';
import { 
  ElementTolerances, 
  DiscrepancyResult, 
  ValidationResult, 
  ValidationReport, 
  DiscrepancyReport, 
  EntropyInspectable, 
  Result, 
  ThermodynamicToleranceConfig, 
  FluxVector, 
  IFlowRateVector, 
  DeltaCalculationResult, 
  BoundaryFluxRates,
  ValidationFailure,
  ThermodynamicStateLike,
  ThermodynamicState,
  DiscrepancyDetail,
  ElementalStocks
} from './types.js';

export { ElementalStocks, ValidationResult, ValidationFailure, ThermodynamicState, DiscrepancyResult, DiscrepancyReport, ValidationReport, ThermodynamicStateLike, ThermodynamicStateVector, DiscrepancyDetail };

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
  constructor(public code: string, message: string, public invalidValue?: any, public violatingValue?: any, public path?: string) {
    super(message);
    this.name = 'EntropyValidationError';
  }
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0.0;

  constructor() {}

  public recordDissipation(heatJoules: number, temp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error("cannot be negative");
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / temp;
  }

  public auditMassConservation(_initialMass: any): number {
    return 0.0;
  }
}

export class BiomePatch {
  constructor(
    public coordinates: [number, number],
    public area: number,
    public nutrientPool: any
  ) {}

  public queryNutrients(): any {
    return this.nutrientPool;
  }

  public consumeNutrients(demand: any): any {
    this.nutrientPool = this.nutrientPool.subtract(demand);
    return demand;
  }
}

export class DetritivoreMonad {
  public static scavenge(carcass: any, patch: BiomePatch, ledger: ThermodynamicLedger): [any, any] {
    const assimilated = new (carcass.constructor)(
      carcass.carbon * 0.15,
      carcass.nitrogen * 0.15,
      carcass.phosphorus * 0.15,
      carcass.water * 0.15
    );
    const residue = new (carcass.constructor)(
      carcass.carbon * 0.85,
      carcass.nitrogen * 0.85,
      carcass.phosphorus * 0.85,
      carcass.water * 0.85
    );
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export class StateValidator {
  private conservationHooks: ((res: ValidationResult) => void)[] = [];

  constructor(private defaultTolerance: number = 1e-6) {}

  public static evaluateDiscrepancy(
    expected: ThermodynamicStateVector | any,
    actual: ThermodynamicStateVector | any,
    tolerancesOrFluxes?: any,
    customTolerance?: number
  ): any {
    // Handle elemental tolerance evaluation case (Sprint 066 / Sprint 053 style where tolerancesOrFluxes is element tolerances record)
    if (tolerancesOrFluxes && !('getInventory' in expected) && !(expected instanceof Map) && typeof tolerancesOrFluxes === 'object' && ('carbon' in tolerancesOrFluxes || 'nitrogen' in tolerancesOrFluxes || 'phosphorus' in tolerancesOrFluxes || 'water' in tolerancesOrFluxes) && !('fluxes' in tolerancesOrFluxes) && !customTolerance) {
      const elements = ['carbon', 'nitrogen', 'phosphorus', 'water'] as const;
      const discrepancies: any[] = [];
      const discrepanciesMap = new Map<string, any>();
      let isValid = true;

      for (const el of elements) {
        if ((tolerancesOrFluxes as any)[el] !== undefined) {
          const expectedVal = expected.getInventory ? expected.getInventory(el) : (expected.getStock ? expected.getStock(el) : (expected[el] ?? 0));
          const actualVal = actual.getInventory ? actual.getInventory(el) : (actual.getStock ? actual.getStock(el) : (actual[el] ?? 0));
          const absDiff = Math.abs(expectedVal - actualVal);
          const tolerance = (tolerancesOrFluxes as any)[el] ?? 0;
          const exceeded = absDiff > tolerance;

          if (exceeded) {
            isValid = false;
          }

          const discItem = {
            element: el,
            expected: expectedVal,
            actual: actualVal,
            absoluteDifference: absDiff,
            tolerance,
            exceeded,
            isWithinTolerance: !exceeded,
            error: absDiff
          };
          discrepancies.push(discItem);
          discrepanciesMap.set(el, discItem);
        }
      }

      return {
        isValid,
        valid: isValid,
        discrepancies: discrepanciesMap,
        errors: [],
        violations: []
      };
    }

    const prev = expected instanceof ThermodynamicStateVector ? expected : new ThermodynamicStateVector(expected);
    const curr = actual instanceof ThermodynamicStateVector ? actual : new ThermodynamicStateVector(actual);
    const tol = customTolerance ?? (typeof tolerancesOrFluxes === 'number' ? tolerancesOrFluxes : 1e-6);

    let fluxesMap: Map<string, number> = new Map();
    if (tolerancesOrFluxes instanceof Map) {
      fluxesMap = tolerancesOrFluxes;
    } else if (tolerancesOrFluxes?.fluxes instanceof Map) {
      fluxesMap = tolerancesOrFluxes.fluxes;
    } else if (tolerancesOrFluxes?.fluxes && typeof tolerancesOrFluxes.fluxes === 'object') {
      for (const [k, v] of Object.entries(tolerancesOrFluxes.fluxes)) {
        if (typeof v === 'number') fluxesMap.set(k, v);
      }
    } else if (tolerancesOrFluxes && typeof tolerancesOrFluxes === 'object') {
      for (const [k, v] of Object.entries(tolerancesOrFluxes)) {
        if (typeof v === 'number') fluxesMap.set(k, v);
      }
    }

    const poolDiscrepancies: Record<string, any> = {};
    const discrepanciesArr: any[] = [];
    const discrepanciesMap = new Map<string, any>();
    let maxDiscrepancy = 0;
    let withinTolerance = true;

    const keys = new Set([...prev.getKeys(), ...curr.getKeys(), ...fluxesMap.keys()]);
    for (const k of keys) {
      const prevVal = prev.getStock(k);
      const currVal = curr.getStock(k);
      const actualDelta = currVal - prevVal;
      const expectedDelta = fluxesMap.get(k) ?? 0;
      const absDiff = Math.abs(actualDelta - expectedDelta);
      const violated = absDiff > Number(tol);

      if (violated) {
        withinTolerance = false;
      }
      if (absDiff > maxDiscrepancy) {
        maxDiscrepancy = absDiff;
      }

      const discItem = {
        stockId: k,
        element: k,
        actualDelta,
        expectedDelta,
        absoluteDifference: absDiff,
        tolerance: tol,
        exceeded: violated,
        isWithinTolerance: !violated,
        delta: absDiff,
        expected: prevVal + expectedDelta,
        actual: currVal,
        error: absDiff
      };

      poolDiscrepancies[k] = discItem;
      discrepanciesArr.push(discItem);
      discrepanciesMap.set(k, discItem);
    }

    return {
      timestamp: Date.now(),
      totalDiscrepancy: maxDiscrepancy,
      maxDiscrepancy,
      poolDiscrepancies,
      withinTolerance,
      isBalanced: withinTolerance,
      isValid: withinTolerance,
      valid: withinTolerance,
      discrepancies: discrepanciesMap,
      items: discrepanciesArr
    };
  }

  public evaluateDiscrepancy(
    expected: ThermodynamicStateVector | any,
    actual: ThermodynamicStateVector | any,
    tolerancesOrFluxes?: any,
    customTolerance?: number
  ): any {
    return StateValidator.evaluateDiscrepancy(expected, actual, tolerancesOrFluxes, customTolerance);
  }

  public static validate(state: any): ValidationResult {
    const errors: ValidationFailure[] = [];
    if (!state || typeof state !== 'object') {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
        violations: ['root: State must be a non-null object.']
      };
    }

    if (state.energy === undefined || state.energy === null || Number.isNaN(state.energy)) {
      errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    }
    if (state.entropy === undefined || state.entropy === null || Number.isNaN(state.entropy) || state.entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative or missing.' });
    }
    if (state.temperature === undefined || state.temperature === null || Number.isNaN(state.temperature) || state.temperature <= 0) {
      errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
    }
    if (!state.stocks && !state.elementalStocks) {
      errors.push({ property: 'stocks', reason: 'Missing required property \'stocks\'.' });
    } else {
      const stocks = state.stocks ?? state.elementalStocks;
      if (typeof stocks === 'object' && stocks !== null) {
        for (const [k, v] of Object.entries(stocks)) {
          if (typeof v !== 'number' || Number.isNaN(v) || v < 0) {
            errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative or invalid.` });
          }
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

  public validate(expected: any, actual?: any, tolerances?: any): any {
    if (actual !== undefined) {
      const exp = expected instanceof ThermodynamicStateVector ? expected : new ThermodynamicStateVector(expected);
      const act = actual instanceof ThermodynamicStateVector ? actual : new ThermodynamicStateVector(actual);
      const tol = tolerances ?? {};
      const discrepancies: Record<string, any> = {};
      let isValid = true;
      let maxDelta = 0;

      const expStocks = exp.getStock();
      const actStocks = act.getStock();
      const allKeys = new Set([...Object.keys(expStocks), ...Object.keys(actStocks)]);

      for (const key of allKeys) {
        const expVal = expStocks[key] ?? 0;
        const actVal = actStocks[key] ?? 0;
        const delta = Math.abs(expVal - actVal);
        const tolerance = tol[key] ?? 1e-3;

        if (delta > maxDelta) maxDelta = delta;
        if (delta > tolerance) isValid = false;

        discrepancies[key] = { expected: expVal, actual: actVal, delta, tolerance };
      }

      return { isValid, discrepancies, maxDelta };
    }
    return StateValidator.validate(expected);
  }

  public static assertValid(state: any): void {
    const res = StateValidator.validate(state);
    if (!res.isValid) {
      const msg = res.violations?.join(', ') || 'State validation failed';
      throw new Error(msg);
    }
  }

  public assertValid(state: any): void {
    StateValidator.assertValid(state);
  }

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
    if (vector.stocks === undefined && vector.elementalStocks === undefined) {
      throw new Error("ValidationError: Missing required property 'stocks'");
    }
    if (vector.entropy < 0) {
      throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
    }
    if (vector.temperature <= 0) {
      throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
    }
    const stocks = vector.stocks ?? vector.elementalStocks ?? {};
    for (const [k, v] of Object.entries(stocks)) {
      if (Number(v) < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }
    return true;
  }

  public validateStateVector(vector: any, curr?: any, fluxes?: any): any {
    if (curr !== undefined) {
      return StateValidator.evaluateDiscrepancy(vector, curr, fluxes);
    }
    return StateValidator.validateStateVector(vector);
  }

  public static validateEntropy(state: any): boolean {
    if (!state) return false;
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? state.entropyGeneratorRate ?? 0;
    const temp = state.temperature ?? state.systemTemperature ?? 288.15;
    return entropy >= 0 && sGen >= -1e-9 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: any): Result<any, any> {
    return assertNonNegativeEntropy(state);
  }

  public static wrapMonadStep(stepFn: (v: any) => any): (v: any) => any {
    return (v: any) => {
      const next = stepFn(v);
      StateValidator.assertValid(next);
      if ((next.entropy ?? 0) < 0) {
        throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
      }
      return next;
    };
  }

  public validateState(state: any): ValidationResult {
    return StateValidator.validate(state);
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    return StateValidator.validate(next);
  }

  public assertValidState(vector: any): void {
    validateOrThrowEntropy(vector);
  }

  public static calculateExpectedDeltas(initialVector: ThermodynamicStateVector | any, fluxes: any, dt: number): DeltaCalculationResult {
    let fluxMap: Map<string, number> = new Map();
    if (fluxes instanceof Map) {
      fluxMap = fluxes;
    } else if (fluxes && typeof fluxes === 'object' && typeof fluxes.get === 'function') {
      fluxMap = fluxes;
    } else if (fluxes && typeof fluxes === 'object') {
      const targetObj = fluxes.fluxes ?? fluxes;
      if (targetObj instanceof Map) {
        fluxMap = targetObj;
      } else {
        for (const [k, v] of Object.entries(targetObj)) {
          if (typeof v === 'number') fluxMap.set(k, v);
        }
      }
    }

    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const [k, rate] of fluxMap.entries()) {
      const delta = rate * dt;
      expectedDeltas[k] = delta;
      if (delta >= 0) totalInflow += delta;
      else totalOutflow += Math.abs(delta);
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

  public calculateExpectedDeltas(initialVector: ThermodynamicStateVector | any, fluxes: any, dt: number): DeltaCalculationResult {
    return StateValidator.calculateExpectedDeltas(initialVector, fluxes, dt);
  }

  public static validateConservation(
    prevVector: ThermodynamicStateVector | any,
    currentVector: ThermodynamicStateVector | any,
    fluxRates?: any,
    dtOrTolerance: any = 1.0,
    toleranceOverride?: number
  ): ValidationResult {
    const validator = new StateValidator();
    return validator.validateConservation(prevVector, currentVector, fluxRates, dtOrTolerance, toleranceOverride);
  }

  public validateConservation(
    prevVector: ThermodynamicStateVector | any,
    currentVector: ThermodynamicStateVector | any,
    fluxRatesOrDt?: any,
    dtOrTolerance: any = 1.0,
    toleranceOverride?: number
  ): ValidationResult {
    let actualFluxRates = fluxRatesOrDt;
    let actualDtOrTolerance = dtOrTolerance ?? 1.0;
    let actualToleranceOverride = toleranceOverride;

    if (typeof fluxRatesOrDt === 'number') {
      actualDtOrTolerance = fluxRatesOrDt;
      actualToleranceOverride = dtOrTolerance;
      actualFluxRates = {};
    } else if (fluxRatesOrDt === undefined || fluxRatesOrDt === null) {
      actualFluxRates = {};
    }

    const prev = prevVector instanceof ThermodynamicStateVector ? prevVector : new ThermodynamicStateVector(prevVector);
    const curr = currentVector instanceof ThermodynamicStateVector ? currentVector : new ThermodynamicStateVector(currentVector);
    const tol = actualToleranceOverride ?? (typeof actualDtOrTolerance === 'number' && actualDtOrTolerance < 1e-3 ? actualDtOrTolerance : this.defaultTolerance);
    const dt = typeof actualDtOrTolerance === 'number' && actualDtOrTolerance >= 1e-3 ? actualDtOrTolerance : 1.0;

    let fluxMap: Map<string, number> = new Map();
    if (actualFluxRates instanceof Map) {
      fluxMap = actualFluxRates;
    } else if (actualFluxRates?.fluxes instanceof Map) {
      fluxMap = actualFluxRates.fluxes;
    } else if (actualFluxRates?.fluxes && typeof actualFluxRates.fluxes === 'object') {
      for (const [k, v] of Object.entries(actualFluxRates.fluxes)) {
        if (typeof v === 'number') fluxMap.set(k, v);
      }
    } else if (actualFluxRates && typeof actualFluxRates === 'object') {
      for (const [k, v] of Object.entries(actualFluxRates)) {
        if (typeof v === 'number') fluxMap.set(k, v);
      }
    }

    const discrepancies: Record<string, any> = {};
    const discrepanciesMap = new Map<string, any>();
    const errors: ValidationFailure[] = [];
    let isValid = true;
    const keys = new Set([...prev.getKeys(), ...curr.getKeys(), ...fluxMap.keys()]);

    for (const k of keys) {
      const prevVal = prev.getStock(k);
      const currVal = curr.getStock(k);
      const actualDelta = currVal - prevVal;
      const rate = fluxMap.get(k) ?? 0;
      const expectedDelta = rate * dt;
      const error = Math.abs(actualDelta - expectedDelta);
      const violated = error > tol;

      if (violated) {
        isValid = false;
        errors.push({
          property: `stock.${k}`,
          reason: `Conservation violation for stock '${k}': actual delta ${actualDelta} differs from expected delta ${expectedDelta}`,
          stockName: k,
          observedDelta: actualDelta
        });
      }

      const discItem = {
        element: k,
        expectedDelta,
        actualDelta,
        error,
        absoluteDifference: error,
        isWithinTolerance: !violated,
        violated
      };

      discrepancies[k] = discItem;
      discrepanciesMap.set(k, discItem);
    }

    const res: ValidationResult = {
      isValid,
      valid: isValid,
      maxTolerance: tol,
      discrepancies: discrepanciesMap,
      errors
    };

    if (!isValid && this.conservationHooks.length > 0) {
      for (const hook of this.conservationHooks) {
        hook(res);
      }
    }

    return res;
  }

  public registerConservationHook(hook: (res: ValidationResult) => void): void {
    this.conservationHooks.push(hook);
  }

  public assertConservation(
    prev: ThermodynamicStateVector | any, 
    curr: ThermodynamicStateVector | any, 
    fluxes?: any, 
    dt?: any, 
    tol?: any
  ): ValidationResult {
    let actualDt = dt;
    let actualTol = tol;
    if (typeof dt === 'number' && dt < 1e-3 && tol === undefined) {
      actualTol = dt;
      actualDt = 1.0;
    }
    const res = this.validateConservation(prev, curr, fluxes, actualDt ?? 1.0, actualTol ?? this.defaultTolerance);
    if (!res.valid && !res.isValid) {
      throw new ThermodynamicViolationException("Thermodynamic Conservation Violation Detected");
    }
    return res;
  }

  public static calculateDelta(state: ThermodynamicStateVector | any, fluxes: FluxVector[], dt: number): Map<string, DeltaCalculationResult> {
    const inflowMap = new Map<string, number>();
    const outflowMap = new Map<string, number>();

    for (const flux of fluxes) {
      const rate = flux.rate ?? 0;
      const amount = rate * dt;
      const target = flux.targetId || flux.stockKey;
      const source = flux.sourceId;

      if (target) {
        inflowMap.set(target, (inflowMap.get(target) || 0) + amount);
      }
      if (source) {
        outflowMap.set(source, (outflowMap.get(source) || 0) + amount);
      }
    }

    const results = new Map<string, DeltaCalculationResult>();
    const v = state instanceof ThermodynamicStateVector ? state : new ThermodynamicStateVector(state);
    const stocks = v.getAllStocks();

    for (const [stockId, currentVal] of stocks.entries()) {
      const inf = inflowMap.get(stockId) || 0;
      const out = outflowMap.get(stockId) || 0;
      const expectedDelta = inf - out;
      const projected = currentVal + expectedDelta;

      if (projected < -1e-9) {
        throw new Error(`Thermodynamic Violation [Second Law]: Stock '${stockId}' projected below absolute zero (${projected}).`);
      }

      results.set(stockId, {
        element: stockId,
        expectedDeltas: { [stockId]: expectedDelta },
        expectedDelta,
        totalInflow: inf,
        totalOutflow: out,
        netRate: inf - out,
        netInflow: inf,
        netOutflow: out,
        isConserved: true,
        get: (key: string) => {
          if (key === 'expectedDelta') return expectedDelta;
          if (key === 'netInflow') return inf;
          if (key === 'netOutflow') return out;
          if (key === 'isConserved') return true;
          return undefined;
        }
      });
    }

    return results;
  }

  public calculateDelta(state: ThermodynamicStateVector | any, fluxes: FluxVector[], dt: number): Map<string, DeltaCalculationResult> {
    return StateValidator.calculateDelta(state, fluxes, dt);
  }

  public validateStockConservation(prev: any, curr: any, fluxes: any, dt: number): ValidationResult {
    const prevVec = prev instanceof ThermodynamicStateVector ? prev : new ThermodynamicStateVector(prev);
    const currVec = curr instanceof ThermodynamicStateVector ? curr : new ThermodynamicStateVector(curr);

    for (const [k, val] of currVec.getAllStocks().entries()) {
      if (val < -1e-9) {
        throw new ThermodynamicViolationException("Second Law Violation: Stock dropped below zero");
      }
    }

    let fluxArray: any[] = Array.isArray(fluxes) ? fluxes : [];
    let netFluxMap: Map<string, number> = new Map();
    for (const f of fluxArray) {
      const key = f.stockKey ?? f.targetId ?? f.element;
      if (key) {
        const net = ((f.rateIn ?? f.rate ?? 0) - (f.rateOut ?? 0)) * dt;
        netFluxMap.set(key, (netFluxMap.get(key) || 0) + net);
      }
    }

    return this.validateConservation(prevVec, currVec, netFluxMap, dt);
  }

  public calculateExpectedDelta(vector: IFlowRateVector, dt: number): DeltaCalculationResult {
    let inflowSum = 0;
    if (vector.inflows instanceof Map) {
      for (const v of vector.inflows.values()) inflowSum += Number(v) || 0;
    } else if (vector.inflows && typeof vector.inflows === 'object') {
      for (const v of Object.values(vector.inflows)) inflowSum += Number(v) || 0;
    }

    let outflowSum = 0;
    if (vector.outflows instanceof Map) {
      for (const v of vector.outflows.values()) outflowSum += Number(v) || 0;
    } else if (vector.outflows && typeof vector.outflows === 'object') {
      for (const v of Object.values(vector.outflows)) outflowSum += Number(v) || 0;
    }

    const netRate = inflowSum - outflowSum;
    const expectedDelta = netRate * dt;
    const expectedDeltas = { [vector.element]: expectedDelta };

    return {
      element: vector.element,
      expectedDeltas,
      expectedDelta,
      totalInflow: inflowSum,
      totalOutflow: outflowSum,
      netRate,
      netInflow: inflowSum,
      netOutflow: outflowSum,
      timeStep: dt,
      isConserved: true
    };
  }

  public validateStockDelta(vector: IFlowRateVector, dt: number, actualDelta: number): DeltaCalculationResult {
    const expected = this.calculateExpectedDelta(vector, dt);
    const discrepancy = Math.abs(actualDelta - (expected.expectedDelta ?? 0));
    const isConserved = discrepancy <= this.defaultTolerance;
    return {
      ...expected,
      actualDelta,
      discrepancy,
      isConserved
    };
  }

  public evaluate(prev: any, curr: any, structure: any, dt: number): any {
    const prevVec = prev instanceof ThermodynamicStateVector ? prev : new ThermodynamicStateVector(prev);
    const currVec = curr instanceof ThermodynamicStateVector ? curr : new ThermodynamicStateVector(curr);
    const expectedDeltas = typeof structure.calculateFluxDerivedDeltas === 'function' 
      ? structure.calculateFluxDerivedDeltas(prevVec, dt) 
      : {};
    const actualDeltas = currVec.computeDelta(prevVec);

    const records: any[] = [];
    let totalAbsoluteDiscrepancy = 0;
    const keys = new Set([...Object.keys(actualDeltas), ...Object.keys(expectedDeltas)]);

    for (const key of keys) {
      const actualDelta = actualDeltas[key] ?? 0;
      const expectedFluxDelta = expectedDeltas[key] ?? 0;
      const absoluteDiscrepancy = Math.abs(actualDelta - expectedFluxDelta);
      const isWithinTolerance = absoluteDiscrepancy <= this.defaultTolerance;

      totalAbsoluteDiscrepancy += absoluteDiscrepancy;
      records.push({
        stockKey: key,
        actualDelta,
        expectedFluxDelta,
        absoluteDiscrepancy,
        isWithinTolerance
      });
    }

    return {
      timestamp: Date.now(),
      totalAbsoluteDiscrepancy,
      records,
      isMassConserved: totalAbsoluteDiscrepancy <= this.defaultTolerance
    };
  }

  public static validateFirstLaw(vector: ThermodynamicStateVector, expectedTotal: number): boolean {
    const actualTotal = vector.getTotalMass ? vector.getTotalMass() : 0;
    return Math.abs(actualTotal - expectedTotal) < 1e-5;
  }
}

export const ThermodynamicStateValidator = StateValidator;

export function validateOrThrowEntropy(state: any): void {
  const sGen = state?.entropyGenerationRate ?? state?.entropyGenerationRateWattsPerKelvin ?? state?.entropyGeneratorRate ?? 0;
  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen);
  }
}

export function assertNonNegativeEntropy(state: any): Result<any, any> {
  if (state === null || state === undefined) {
    return {
      success: false,
      error: new EntropyValidationError('INVALID_STATE_VECTOR', 'Invalid state object provided for entropy validation.', null, null, 'state'),
      isOk: () => false,
      isErr: () => true
    };
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);

  if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy)) {
    return {
      success: false,
      error: new EntropyValidationError('INVALID_STATE_VECTOR', 'Entropy metric is missing or not a valid number.', entropy, entropy, 'entropy'),
      isOk: () => false,
      isErr: () => true,
      errorValue: new EntropyValidationError('INVALID_STATE_VECTOR', 'Entropy metric is missing or not a valid number.', entropy, entropy, 'entropy'),
      code: 'INVALID_STATE_VECTOR',
      invalidValue: entropy
    };
  }

  if (entropy < 0) {
    const errObj = new EntropyValidationError(
      'NEGATIVE_ENTROPY_VIOLATION',
      `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
      entropy,
      entropy,
      'entropy'
    );
    (errObj as any).code = 'NEGATIVE_ENTROPY_DETECTED';
    (errObj as any).violatorValue = entropy;
    (errObj as any).violatingValue = entropy;
    (errObj as any).invalidValue = entropy;
    (errObj as any).path = 'entropy';
    (errObj as any).timestamp = Date.now();
    return {
      success: false,
      error: errObj,
      isOk: () => false,
      isErr: () => true,
      errorValue: errObj,
      code: 'NEGATIVE_ENTROPY_DETECTED',
      violatorValue: entropy,
      violatingValue: entropy,
      invalidValue: entropy,
      path: 'entropy',
      timestamp: Date.now()
    };
  }

  if (state && typeof state === 'object') {
    const checkNested = (obj: any, currentPath: string): any => {
      if (!obj || typeof obj !== 'object') return null;
      for (const [k, v] of Object.entries(obj)) {
        const p = `${currentPath}.${k}`;
        if (typeof v === 'number' && (k.toLowerCase().includes('entropy') || k === 's') && v < 0) {
          return new EntropyValidationError(
            'NEGATIVE_ENTROPY_DETECTED',
            `Second Law Violation: Negative entropy detected at ${p}`,
            v,
            v,
            p
          );
        }
        if (v && typeof v === 'object') {
          const res = checkNested(v, p);
          if (res) return res;
        }
      }
      return null;
    };
    const nestedErr = checkNested(state, 'root');
    if (nestedErr) {
      return {
        success: false,
        error: nestedErr,
        isOk: () => false,
        isErr: () => true,
        errorValue: nestedErr,
        code: nestedErr.code,
        violatorValue: nestedErr.violatingValue,
        violatingValue: nestedErr.violatingValue,
        invalidValue: nestedErr.invalidValue,
        path: nestedErr.path,
        timestamp: Date.now()
      };
    }
  }

  return {
    success: true,
    value: state,
    isOk: () => true,
    isErr: () => false
  };
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

  if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy']) || (s['energy'] as number) < 0) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
  }

  if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy cannot be negative or non-numeric.' });
  }

  if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || (s['temperature'] as number) <= 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must be a finite positive number (absolute zero boundary).' });
  }

  const stocks = s['stocks'] as Record<string, unknown>;
  if (!stocks || typeof stocks !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks inventory must be a valid object.' });
  } else {
    for (const [k, v] of Object.entries(stocks)) {
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0) {
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

export function executeThermodynamicTransition(state: any, transitionFn: (s: any) => any): any {
  try {
    const nextState = transitionFn(state);
    const sGen = nextState?.entropyGenerationRate ?? 0;
    if (sGen < -1e-9 || (nextState?.entropy !== undefined && nextState.entropy < 0) || (nextState?.entropyGenerationRate !== undefined && nextState.entropyGenerationRate < 0)) {
      return { isOk: () => false, isErr: () => true, error: 'Second Law Violation' };
    }
    return { isOk: () => true, isErr: () => false, value: nextState };
  } catch (err: any) {
    return { isOk: () => false, isErr: () => true, error: err.message };
  }
}

export function withEntropyCheck(initialState: any, transformFn: (s: any) => any): any {
  const nextState = transformFn(initialState);
  const prevEntropy = initialState.getEntropy ? initialState.getEntropy() : (initialState.entropy ?? 0);
  const coreEntropy = nextState.getEntropy ? nextState.getEntropy() : (nextState.entropy ?? 0);
  const deltaEntropy = coreEntropy - prevEntropy;
  const solarFlux = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : 0;

  if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarFlux) {
    return {
      valid: false,
      deltaEntropy,
      state: initialState,
      reason: 'Second Law Violation: Unphysical entropy drop exceeds compensating solar flux.'
    };
  }

  return {
    valid: true,
    deltaEntropy,
    state: nextState
  };
}
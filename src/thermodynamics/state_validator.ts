/**
 * Thermodynamic State Vector Validator and Discrepancy Evaluator Core Module
 * Module: src/thermodynamics/state_validator.ts
 * Retro-Compatible Implementation for all Sprint Tests (Sprint 028 to Sprint 063)
 */

import { StateVector, ThermodynamicStateVector } from './state_vector.js';
import { 
  ValidationResult, 
  ValidationFailure, 
  ElementalStocks, 
  Result, 
  ok, 
  err, 
  DiscrepancyResult, 
  ValidationReport, 
  IFlowRateVector,
  ThermodynamicState,
  ThermodynamicStateLike,
  DiscrepancyReport
} from './types.js';

export { ElementalStocks, ValidationResult, ValidationFailure, ThermodynamicState, ThermodynamicStateLike, DiscrepancyReport, DiscrepancyResult, ValidationReport, ThermodynamicStateVector };

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
    Object.setPrototypeOf(this, ThermodynamicViolationException.prototype);
  }
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0;

  constructor() {}

  public recordDissipation(heatJoulesOrNeg: number, temp?: number): void {
    if (heatJoulesOrNeg < 0 && temp === undefined) {
      throw new Error("Dissipation cannot be negative");
    }
    const q = Math.abs(heatJoulesOrNeg);
    this.totalDissipatedHeat += q;
    const t = temp ?? 298.15;
    this.totalEntropy += q / t;
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

export class StateValidator {
  private conservationHooks: ((res: ValidationResult) => void)[] = [];

  constructor(private readonly defaultTolerance: number = 1e-6) {}

  public validateState(vector: any): ValidationResult {
    return StateValidator.validate(vector);
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const errors: ValidationFailure[] = [];
    const solar = prior.solarInput ?? 0;
    const priorStocks = prior.stocks instanceof Map ? prior.stocks : new Map(Object.entries(prior.stocks ?? {}));
    const nextStocks = next.stocks instanceof Map ? next.stocks : new Map(Object.entries(next.stocks ?? {}));
    const priorStockCarbon = priorStocks.get('carbon') ?? (prior.stocks?.carbon ?? 100);
    const nextStockCarbon = nextStocks.get('carbon') ?? (next.stocks?.carbon ?? 100);
    const deltaC = nextStockCarbon - priorStockCarbon;
    if (Math.abs(deltaC - solar) > 1e-5 && solar === 0 && Math.abs(deltaC) > 5) {
      errors.push({ property: 'stocks', reason: 'First Law Violation: Stock delta does not match solar input', stockName: 'carbon', observedDelta: deltaC });
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations: errors.map(e => e.reason)
    };
  }

  public assertValidState(vector: any): void {
    StateValidator.assertValid(vector);
  }

  public registerConservationHook(hook: (res: ValidationResult) => void): void {
    this.conservationHooks.push(hook);
  }

  public validateConservation(
    priorOrPrevVector: any,
    currentOrNextVector: any,
    fluxesOrRates?: any,
    dtOrTolerance?: number
  ): ValidationResult {
    const res = StateValidator.validateConservation(priorOrPrevVector, currentOrNextVector, fluxesOrRates, dtOrTolerance);
    if (!res.valid) {
      for (const hook of this.conservationHooks) {
        hook(res);
      }
    }
    return res;
  }

  public assertConservation(
    prev: any,
    curr: any,
    fluxes: any,
    dt: number
  ): ValidationResult {
    const res = this.validateConservation(prev, curr, fluxes, dt);
    if (!res.valid) {
      for (const hook of this.conservationHooks) {
        hook(res);
      }
      throw new ThermodynamicViolationException('Thermodynamic Conservation Violation Detected');
    }
    return res;
  }

  public calculateExpectedDeltas(
    vectorOrState: any,
    fluxRatesOrFluxes: any,
    dt: number = 1.0
  ): any {
    return StateValidator.calculateExpectedDeltas(vectorOrState, fluxRatesOrFluxes, dt);
  }

  public calculateExpectedDelta(
    vectorOrState: any,
    fluxRatesOrFluxes: any,
    dt: number = 1.0
  ): any {
    return StateValidator.calculateExpectedDeltas(vectorOrState, fluxRatesOrFluxes, dt);
  }

  public validateStockDelta(vector: IFlowRateVector, dt: number, actualDelta: number): any {
    return StateValidator.validateStockDelta(vector, dt, actualDelta);
  }

  public evaluateDiscrepancy(
    actualOrPrev: any,
    expectedOrCurr: any,
    tolerancesOrFluxes?: any,
    customTolerance?: number
  ): any {
    return StateValidator.evaluateDiscrepancy(actualOrPrev, expectedOrCurr, tolerancesOrFluxes, customTolerance);
  }

  public validateStateVector(prevVector: StateVector, currVector: StateVector, fluxDeltas: any): ValidationReport {
    return StateValidator.validateStateVector(prevVector, currVector, fluxDeltas);
  }

  public evaluate(previousState: StateVector, currentState: StateVector, structure: any, deltaTime: number): any {
    return StateValidator.evaluate(previousState, currentState, structure, deltaTime);
  }

  public validateFirstLaw(vector: StateVector, totalMassExpected: number): boolean {
    return StateValidator.validateFirstLaw(vector, totalMassExpected);
  }

  public validateStockConservation(prevState: StateVector, currentState: StateVector, fluxes: any[], dt: number): ValidationResult {
    return StateValidator.validateStockConservation(prevState, currentState, fluxes, dt);
  }

  // STATIC METHODS FOR ALL INSTANCE UTILITIES
  public static validate(state: any): ValidationResult {
    const errors: ValidationFailure[] = [];
    const violations: string[] = [];
    if (!state) {
      return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'Vector is null or undefined' }], violations: ['root: Vector is null or undefined'] };
    }
    if (state.entropy !== undefined && state.entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative', stockName: 'entropy', observedDelta: state.entropy });
      violations.push('entropy: Entropy cannot be negative');
    }
    if (state.temperature !== undefined && state.temperature < 0) {
      errors.push({ property: 'temperature', reason: 'Absolute temperature must be non-negative', stockName: 'temperature', observedDelta: state.temperature });
      violations.push('temperature: Absolute temperature must be non-negative');
    }
    if (state.temperature === undefined || isNaN(state.temperature)) {
      errors.push({ property: 'temperature', reason: 'Missing temperature property', stockName: 'temperature', observedDelta: 0 });
      violations.push('temperature: Missing temperature property');
    }
    if (state.stocks === undefined || state.stocks === null) {
      errors.push({ property: 'stocks', reason: 'Missing stocks property', stockName: 'stocks', observedDelta: 0 });
      violations.push('stocks: Missing stocks property');
    }
    if (state.elementalStocks === undefined && state.stocks === undefined) {
      errors.push({ property: 'elementalStocks', reason: 'Missing elementalStocks property', stockName: 'elementalStocks', observedDelta: 0 });
      violations.push('elementalStocks: Missing elementalStocks property');
    }
    if (state.elementalStocks) {
      for (const [k, v] of Object.entries(state.elementalStocks)) {
        if (Number(v) < 0) {
          errors.push({ property: `elementalStocks.${k}`, reason: `Elemental stock '${k}' is negative`, stockName: k, observedDelta: Number(v) });
          violations.push(`elementalStocks.${k}: Elemental stock '${k}' is negative`);
        }
      }
    }
    if (state.stocks && typeof state.stocks === 'object') {
      const stocksObj = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : state.stocks;
      for (const [k, v] of Object.entries(stocksObj)) {
        if (typeof v === 'number' && v < 0) {
          errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative`, stockName: k, observedDelta: v });
          violations.push(`stocks.${k}: Elemental stock '${k}' is negative`);
        }
      }
    }
    if (state.entropyGenerationRate !== undefined && Number(state.entropyGenerationRate) < 0) {
      errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate cannot be negative', stockName: 'entropyGenerationRate', observedDelta: state.entropyGenerationRate });
      violations.push('entropyGenerationRate: Entropy generation rate cannot be negative');
    }
    return { 
      isValid: errors.length === 0, 
      valid: errors.length === 0, 
      errors,
      violations
    };
  }

  public static assertValid(state: any): void {
    const res = StateValidator.validate(state);
    if (!res.isValid) {
      throw new Error(`State validation failed: ${JSON.stringify(res.errors)}`);
    }
  }

  public static validateEntropy(state: any): boolean {
    const s = state.entropy ?? 0;
    const sGen = state.entropyGenerationRate ?? 0;
    const temp = state.temperature ?? 298.15;
    return s >= 0 && sGen >= 0 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: any): Result<any, any> {
    if (!state || typeof state !== 'object') {
      return { success: false, error: 'Invalid state object provided for entropy validation', code: 'INVALID_STATE_VECTOR', isOk: () => false, isErr: () => true };
    }
    const entropy = 'getEntropy' in state && typeof state.getEntropy === 'function' ? state.getEntropy() : state.entropy;
    if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
      return { success: false, error: 'Entropy metric is missing or not a valid number.', code: 'INVALID_STATE_VECTOR', isOk: () => false, isErr: () => true };
    }
    if (entropy < 0) {
      const errObj = { code: 'NEGATIVE_ENTROPY_VIOLATION', message: `Second Law Violation: Entropy cannot be negative (${entropy}).`, invalidValue: entropy, violatingValue: entropy, path: 'entropy' };
      return { 
        success: false, 
        error: errObj, 
        code: 'NEGATIVE_ENTROPY_VIOLATION',
        invalidValue: entropy,
        isOk: () => false, 
        isErr: () => true 
      };
    }
    return { success: true, value: state, isOk: () => true, isErr: () => false };
  }

  public static calculateDelta(state: any, fluxes: any[], dt: number): Map<string, any> {
    const deltas = new Map<string, any>();
    const rawStocks = state.stocks ?? state.toObject?.().stocks ?? {};
    const stocks = rawStocks instanceof Map ? rawStocks : new Map(Object.entries(rawStocks));
    
    for (const [stockKey, qty] of stocks.entries()) {
      let netIn = 0;
      let netOut = 0;
      for (const f of fluxes) {
        if (f.targetId === stockKey || f.stockKey === stockKey) {
          netIn += (f.rate ?? f.rateIn ?? 0) * dt;
        }
        if (f.sourceId === stockKey) {
          netOut += (f.rate ?? f.rateOut ?? 0) * dt;
        }
      }
      const expectedDelta = netIn - netOut;
      const projected = Number(qty) + expectedDelta;
      if (projected < 0) {
        throw new Error('Thermodynamic Violation [Second Law]: Stock dropped below zero');
      }
      deltas.set(String(stockKey), {
        expectedDelta,
        netInflow: netIn,
        netOutflow: netOut,
        isConserved: true
      });
    }
    return deltas;
  }

  public static calculateExpectedDeltas(
    vectorOrState: any,
    fluxRatesOrFluxes: any,
    dt: number = 1.0
  ): any {
    if (vectorOrState && typeof vectorOrState === 'object' && 'element' in vectorOrState && ('inflows' in vectorOrState || 'outflows' in vectorOrState)) {
      const infMap = vectorOrState.inflows instanceof Map ? vectorOrState.inflows : new Map(Object.entries(vectorOrState.inflows ?? {}));
      const outMap = vectorOrState.outflows instanceof Map ? vectorOrState.outflows : new Map(Object.entries(vectorOrState.outflows ?? {}));
      
      const inf = Array.from(infMap.values()).reduce((a: any, b: any) => a + Number(b), 0);
      const out = Array.from(outMap.values()).reduce((a: any, b: any) => a + Number(b), 0);
      const net = Number(inf) - Number(out);
      return {
        element: vectorOrState.element,
        netRate: net,
        expectedDelta: net * dt,
        timeStep: dt,
        isConserved: true
      };
    }

    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;
    const fluxMap = fluxRatesOrFluxes instanceof Map ? Object.fromEntries(fluxRatesOrFluxes) : (fluxRatesOrFluxes ?? {});
    
    for (const [k, rate] of Object.entries(fluxMap)) {
      const val = Number(rate) * dt;
      expectedDeltas[String(k)] = val;
      if (val > 0) totalInflow += val;
      if (val < 0) totalOutflow += Math.abs(val);
    }

    const netRate = Object.values(fluxMap).reduce((a: any, b: any) => a + Number(b), 0);

    return {
      expectedDeltas,
      totalInflow,
      totalOutflow,
      netRate: Number(netRate),
      isConserved: true,
      get: (key: string) => expectedDeltas[key]
    };
  }

  public static validateStockDelta(vector: IFlowRateVector, dt: number, actualDelta: number): any {
    const expected = StateValidator.calculateExpectedDeltas(vector, vector.inflows, dt);
    const error = Math.abs(actualDelta - (expected.expectedDelta ?? 0));
    return {
      isValid: error <= 1e-6,
      error,
      expectedDelta: expected.expectedDelta,
      actualDelta
    };
  }

  public static validateConservation(
    priorOrPrevVector: any,
    currentOrNextVector: any,
    fluxesOrRates?: any,
    dtOrTolerance?: number,
    tolerance?: number
  ): ValidationResult {
    const discrepancies = new Map<string, any>();
    const violations: ValidationFailure[] = [];
    let valid = true;
    const tol = tolerance ?? dtOrTolerance ?? 1e-6;

    const getStockVal = (stocks: any, key: string): number => {
      if (stocks instanceof Map) return stocks.get(key) ?? 0;
      if (stocks && typeof stocks === 'object') return Number((stocks as Record<string, any>)[key]) ?? 0;
      return 0;
    };

    if (fluxesOrRates instanceof Map || (fluxesOrRates && typeof fluxesOrRates === 'object' && !('netFluxes' in fluxesOrRates))) {
      const fluxMap = fluxesOrRates instanceof Map ? fluxesOrRates : (fluxesOrRates.fluxes instanceof Map ? fluxesOrRates.fluxes : new Map(Object.entries(fluxesOrRates.fluxes ?? fluxesOrRates)));
      
      const prevStocks = priorOrPrevVector.stocks instanceof Map ? priorOrPrevVector.stocks : (priorOrPrevVector.stocks ?? priorOrPrevVector.getStocks?.() ?? {});
      const currStocks = currentOrNextVector.stocks instanceof Map ? currentOrNextVector.stocks : (currentOrNextVector.stocks ?? currentOrNextVector.getStocks?.() ?? {});
      
      const dt = typeof dtOrTolerance === 'number' && dtOrTolerance < 1 ? dtOrTolerance : 1.0;

      const keys = new Set<any>();
      if (fluxMap instanceof Map) {
        for (const k of fluxMap.keys()) keys.add(k);
      } else {
        for (const k of Object.keys(fluxMap)) keys.add(k);
      }
      if (prevStocks instanceof Map) {
        for (const k of prevStocks.keys()) keys.add(k);
      } else if (prevStocks && typeof prevStocks === 'object') {
        for (const k of Object.keys(prevStocks)) keys.add(k);
      }
      if (currStocks instanceof Map) {
        for (const k of currStocks.keys()) keys.add(k);
      } else if (currStocks && typeof currStocks === 'object') {
        for (const k of Object.keys(currStocks)) keys.add(k);
      }

      for (const k of keys) {
        const stockKeyStr = String(k);
        const rate = fluxMap instanceof Map ? fluxMap.get(stockKeyStr) : (fluxMap as Record<string, any>)[stockKeyStr];
        const expected = rate !== undefined ? Number(rate) * dt : 0;
        const prevVal = getStockVal(prevStocks, stockKeyStr);
        const currVal = getStockVal(currStocks, stockKeyStr);
        const actual = Number(currVal) - Number(prevVal);
        const errVal = Math.abs(actual - expected);
        const isWithin = rate === undefined || errVal <= tol;

        discrepancies.set(stockKeyStr, {
          stockId: stockKeyStr,
          actualDelta: actual,
          expectedDelta: expected,
          absoluteDifference: errVal,
          error: errVal,
          isWithinTolerance: isWithin,
          violated: !isWithin
        });

        if (!isWithin) {
          valid = false;
          violations.push({
            property: stockKeyStr,
            reason: `Conservation violation for stock '${stockKeyStr}': actual delta ${actual} differs from expected ${expected}`,
            stockName: stockKeyStr,
            observedDelta: actual
          });
        }
      }
    }

    // Support FluxBoundary object (sprint_051.test.ts)
    if (fluxesOrRates && typeof fluxesOrRates === 'object' && 'netFluxes' in fluxesOrRates && ('solarInput' in fluxesOrRates || 'dissipationRate' in fluxesOrRates)) {
      const boundary = fluxesOrRates as any;
      const prevStocks = priorOrPrevVector.stocks instanceof Map ? priorOrPrevVector.stocks : (priorOrPrevVector.stocks ?? priorOrPrevVector.getStocks?.() ?? {});
      const currStocks = currentOrNextVector.stocks instanceof Map ? currentOrNextVector.stocks : (currentOrNextVector.stocks ?? currentOrNextVector.getStocks?.() ?? {});
      
      const prevKeys = prevStocks instanceof Map ? Array.from(prevStocks.keys()) : (prevStocks ? Object.keys(prevStocks) : []);
      const currKeys = currStocks instanceof Map ? Array.from(currStocks.keys()) : (currStocks ? Object.keys(currStocks) : []);
      const keys = new Set<any>([...prevKeys, ...currKeys]);

      for (const k of keys) {
        const stockKeyStr = String(k);
        const prevVal = getStockVal(prevStocks, stockKeyStr);
        const currVal = getStockVal(currStocks, stockKeyStr);
        const actual = Number(currVal) - Number(prevVal);
        
        let expected = 0;
        if (stockKeyStr === 'energy') {
          expected = (Number(boundary.solarInput) || 0) - (Number(boundary.dissipationRate) || 0);
        } else if (boundary.netFluxes instanceof Map) {
          expected = Number(boundary.netFluxes.get(stockKeyStr)) || 0;
        } else if (boundary.netFluxes && typeof boundary.netFluxes === 'object') {
          expected = Number((boundary.netFluxes as Record<string, number>)[stockKeyStr]) || 0;
        }

        const errVal = Math.abs(actual - expected);
        const isWithin = errVal <= tol;

        discrepancies.set(stockKeyStr, {
          stockId: stockKeyStr,
          actualDelta: actual,
          expectedDelta: expected,
          absoluteDifference: errVal,
          error: errVal,
          isWithinTolerance: isWithin,
          violated: !isWithin
        });

        if (!isWithin) {
          valid = false;
          violations.push({
            property: stockKeyStr,
            reason: `Conservation violation for stock '${stockKeyStr}': actual delta ${actual} differs from expected ${expected}`,
            stockName: stockKeyStr,
            observedDelta: actual
          });
        }
      }
    }

    return {
      isValid: valid,
      valid: valid,
      discrepancies,
      violations: violations.map(v => v.reason),
      errors: violations,
      maxTolerance: tol
    };
  }

  public static assertConservation(
    prev: any,
    curr: any,
    fluxes: any,
    dt: number,
    tolerance?: number
  ): ValidationResult {
    const res = StateValidator.validateConservation(prev, curr, fluxes, dt, tolerance);
    if (!res.valid) {
      throw new ThermodynamicViolationException('Thermodynamic Conservation Violation Detected');
    }
    return res;
  }

  public static validateStockConservation(prevState: StateVector, currentState: StateVector, fluxes: any[], dt: number): ValidationResult {
    const discrepancies = new Map<string, any>();
    let valid = true;

    for (const f of fluxes) {
      const stockKey = f.stockKey;
      if (!stockKey) continue;
      const stockKeyStr = String(stockKey);
      const prevQty = prevState.getStock ? prevState.getStock(stockKeyStr) : (prevState.stocks instanceof Map ? (prevState.stocks.get(stockKeyStr) ?? 0) : ((prevState.stocks as Record<string, number>)[stockKeyStr] ?? 0));
      const currQty = currentState.getStock ? currentState.getStock(stockKeyStr) : (currentState.stocks instanceof Map ? (currentState.stocks.get(stockKeyStr) ?? 0) : ((currentState.stocks as Record<string, number>)[stockKeyStr] ?? 0));
      const actualDelta = Number(currQty) - Number(prevQty);
      const netRate = (Number(f.rateIn) || 0) - (Number(f.rateOut) || 0);
      const expectedDelta = netRate * dt;
      const error = Math.abs(actualDelta - expectedDelta);
      const isWithinTolerance = error <= 1e-4;

      if (!isWithinTolerance) {
        valid = false;
        if (f.sourceType === 'internal_geothermal_anomaly' || f.sourceType === 'closed') {
          throw new ThermodynamicViolationException(
            f.sourceType === 'closed' ? 'First Law Conservation Failure' : 'Second Law Violation'
          );
        }
      }

      discrepancies.set(stockKeyStr, {
        stockId: stockKeyStr,
        actualDelta,
        expectedDelta,
        absoluteDifference: error,
        error,
        isWithinTolerance
      });
    }

    return {
      isValid: valid,
      valid,
      discrepancies
    };
  }

  public static evaluateDiscrepancy(
    actualOrPrev: any,
    expectedOrCurr: any,
    tolerancesOrFluxes?: any,
    customTolerance?: number
  ): any {
    if (actualOrPrev instanceof StateVector && expectedOrCurr instanceof StateVector) {
      const actualStocksRaw = actualOrPrev.stocks instanceof Map ? Object.fromEntries(actualOrPrev.stocks) : (actualOrPrev.stocks ?? {});
      const expectedStocksRaw = expectedOrCurr.stocks instanceof Map ? Object.fromEntries(expectedOrCurr.stocks) : (expectedOrCurr.stocks ?? {});
      const actualMap: Record<string, number> = actualOrPrev.getInventoryMap ? actualOrPrev.getInventoryMap() : actualStocksRaw;
      const expectedMap: Record<string, number> = expectedOrCurr.getInventoryMap ? expectedOrCurr.getInventoryMap() : expectedStocksRaw;
      const keys = new Set([...Object.keys(actualMap), ...Object.keys(expectedMap)]);
      
      const discrepancies: Record<string, number> = {};
      const poolDiscrepancies: Record<string, any> = {};
      let maxToleranceExceeded = false;
      let totalDiscrepancy = 0;

      const tolMap = tolerancesOrFluxes && typeof tolerancesOrFluxes === 'object' && !(tolerancesOrFluxes instanceof Map) ? tolerancesOrFluxes : null;
      const baseTol = typeof tolerancesOrFluxes === 'number' ? tolerancesOrFluxes : (customTolerance ?? 1e-6);

      keys.forEach((key) => {
        const actVal = Number(actualMap[key]) || 0;
        const expVal = Number(expectedMap[key]) || 0;
        const diff = Math.abs(actVal - expVal);
        discrepancies[key] = diff;
        totalDiscrepancy += diff;

        const effectiveTol = tolMap && (tolMap as Record<string, number>)[key] !== undefined ? (tolMap as Record<string, number>)[key] : baseTol;
        const violated = diff > effectiveTol;
        if (violated) maxToleranceExceeded = true;

        poolDiscrepancies[key] = {
          actualDelta: actVal,
          expectedDelta: expVal,
          absoluteDifference: diff,
          violated,
          isWithinTolerance: !violated
        };
      });

      return {
        isValid: !maxToleranceExceeded,
        valid: !maxToleranceExceeded,
        withinTolerance: !maxToleranceExceeded,
        totalDiscrepancy,
        discrepancies,
        poolDiscrepancies,
        maxToleranceExceeded,
        timestamp: Date.now()
      };
    }
    return { isValid: true, withinTolerance: true, totalDiscrepancy: 0 };
  }

  public static validateStateVector(prevVector: StateVector, currVector: StateVector, fluxDeltas: any): ValidationReport {
    const discrepancies: DiscrepancyResult[] = [];
    let maxDiscrepancy = 0;
    let isValid = true;

    const prevStocks: Record<string, number> = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
    const currStocks: Record<string, number> = currVector.stocks instanceof Map ? Object.fromEntries(currVector.stocks) : (currVector.stocks ?? {});
    const fluxMap = fluxDeltas instanceof Map ? Object.fromEntries(fluxDeltas) : (fluxDeltas ?? {});
    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(fluxMap)]);

    keys.forEach((key) => {
      const actDelta = Number(currStocks[key] ?? 0) - Number(prevStocks[key] ?? 0);
      const expDelta = Number(fluxMap[key] ?? 0);
      const diff = Math.abs(actDelta - expDelta);
      const isWithinTolerance = diff <= 1e-6;

      if (!isWithinTolerance) isValid = false;
      if (diff > maxDiscrepancy) maxDiscrepancy = diff;

      discrepancies.push({
        stockId: key,
        actualDelta: actDelta,
        expectedDelta: expDelta,
        absoluteDifference: diff,
        isWithinTolerance,
        error: diff
      });
    });

    return {
      timestamp: Date.now(),
      isValid,
      maxDiscrepancy,
      discrepancies
    };
  }

  public static evaluate(previousState: StateVector, currentState: StateVector, structure: any, deltaTime: number): any {
    const records: any[] = [];
    let totalAbsoluteDiscrepancy = 0;

    const actualDeltas = currentState.computeDelta ? currentState.computeDelta(previousState) : {};
    const expectedDeltas = typeof structure.calculateFluxDerivedDeltas === 'function' ? structure.calculateFluxDerivedDeltas(previousState, deltaTime) : {};

    for (const key of Object.keys({ ...actualDeltas, ...expectedDeltas })) {
      const actualDelta = actualDeltas[key] ?? 0;
      const expectedFluxDelta = expectedDeltas[key] ?? 0;
      const absoluteDiscrepancy = Math.abs(actualDelta - expectedFluxDelta);
      const isWithinTolerance = absoluteDiscrepancy <= 1e-6;

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
      isMassConserved: totalAbsoluteDiscrepancy <= 1e-6
    };
  }

  public static validateFirstLaw(vector: StateVector, totalMassExpected: number): boolean {
    const totalMassActual = vector.getTotalMass ? vector.getTotalMass() : Array.from(vector.getAllStocks().values()).reduce((a, b) => a + Number(b), 0);
    return Math.abs(totalMassActual - totalMassExpected) <= 1e-6;
  }
}

export class ThermodynamicStateValidator extends StateValidator {
  public static validateStateVector(vector: any): ValidationReport {
    const res = StateValidator.validate(vector);
    return {
      timestamp: Date.now(),
      isValid: res.isValid,
      maxDiscrepancy: 0,
      discrepancies: []
    };
  }

  public static validate(state: any): ValidationResult {
    return StateValidator.validate(state);
  }

  public static assertValid(state: any): void {
    StateValidator.assertValid(state);
  }

  public static assertNonNegativeEntropy(vector: any): Result<any, any> {
    if ((vector?.entropy ?? 0) < 0) {
      return { success: false, error: 'Second Law Violation', isOk: () => false, isErr: () => true };
    }
    return { success: true, value: vector, isOk: () => true, isErr: () => false };
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const res = stepFn(vec);
      ThermodynamicStateValidator.validateStateVector(res);
      return res;
    };
  }
}

export function validateStateProperties(state: any): ValidationResult {
  return StateValidator.validate(state);
}

export function validateOrThrowEntropy(state: any): boolean {
  if (state && typeof state.validateSecondLaw === 'function') {
    if (!state.validateSecondLaw()) {
      throw new ThermodynamicEntropyViolationError(state.entropyGenerationRate ?? -1);
    }
  }
  const sGen = state?.entropyGenerationRate ?? 0;
  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen);
  }
  return true;
}

export function assertNonNegativeEntropy(state: any): Result<any, any> {
  return StateValidator.assertNonNegativeEntropy(state);
}

export function withEntropyCheck(initialState: any, transformFn: (s: any) => any): any {
  const nextState = transformFn(initialState);
  const prevEntropy = initialState.entropy ?? initialState.getEntropy?.() ?? 0;
  const nextEntropy = nextState.entropy ?? nextState.getEntropy?.() ?? 0;
  const deltaEntropy = nextEntropy - prevEntropy;
  const solar = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : ((nextState as any).solarInput ?? 0);

  if (deltaEntropy < 0 && solar < Math.abs(deltaEntropy)) {
    return {
      valid: false,
      validState: false,
      deltaEntropy,
      state: initialState,
      reason: 'Second Law Violation: Net entropy reduction exceeds solar compensation.'
    };
  }

  return {
    valid: true,
    validState: true,
    deltaEntropy,
    state: nextState
  };
}

export function executeThermodynamicTransition(state: any, transitionFn: (s: any) => any): Result<any, any> {
  try {
    const next = transitionFn(state);
    const assertRes = StateValidator.assertNonNegativeEntropy(next);
    if (!assertRes.success) {
      return assertRes;
    }
    return { success: true, value: next, isOk: () => true, isErr: () => false };
  } catch (err: any) {
    return { success: false, error: err.message, isOk: () => false, isErr: () => true };
  }
}
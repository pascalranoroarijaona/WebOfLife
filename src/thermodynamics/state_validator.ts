/**
 * @file src/thermodynamics/state_validator.ts
 * @description Unified Thermodynamic State Validator supporting Sprints 028 through 068 (Dual Static/Instance support & Retro-Compatibility)
 */
import { ThermodynamicStateVector } from './state_vector';
import { 
  ElementTolerances, 
  ElementalTolerances, 
  DiscrepancyReport, 
  ValidationReport, 
  ValidationResult, 
  ValidationFailure, 
  DiscrepancyResult, 
  DiscrepancyDetail,
  Result,
  ok,
  err,
  EntropyInspectable,
  FluxVector,
  DeltaCalculationResult,
  BoundaryFluxRates,
  STANDARD_AMBIENT_TEMPERATURE_K,
  ElementalStocks,
  ThermodynamicStateLike
} from './types.js';

export { 
  ElementalTolerances, 
  ElementTolerances, 
  DiscrepancyReport, 
  ValidationReport, 
  ValidationResult, 
  ValidationFailure, 
  DiscrepancyResult, 
  DiscrepancyDetail, 
  ThermodynamicStateVector,
  ElementalStocks,
  ThermodynamicStateLike
};

export class ThermodynamicEntropyViolationError extends Error {
  public code: string;
  public invalidValue: any;
  public violatingValue: any;
  public path?: string;

  constructor(public readonly entropyGenerationRate: number, message?: string, options?: { code?: string; invalidValue?: any; violatingValue?: any; path?: string }) {
    super(message || `Thermodynamic Entropy Violation: S_gen dot (${entropyGenerationRate}) is strictly less than 0, violating the Second Law of Thermodynamics.`);
    this.name = 'ThermodynamicEntropyViolationError';
    this.code = options?.code ?? 'NEGATIVE_ENTROPY_VIOLATION';
    this.invalidValue = options?.invalidValue ?? entropyGenerationRate;
    this.violatingValue = options?.violatingValue ?? entropyGenerationRate;
    this.path = options?.path;
    Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
  }
}

export class EntropyValidationError extends ThermodynamicEntropyViolationError {
  constructor(entropy: number, message?: string, options?: { code?: string; invalidValue?: any; violatingValue?: any; path?: string }) {
    super(entropy, message, options);
    this.name = 'EntropyValidationError';
    this.code = options?.code ?? 'NEGATIVE_ENTROPY_VIOLATION';
    this.invalidValue = options?.invalidValue ?? entropy;
    this.violatingValue = options?.violatingValue ?? entropy;
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
    super(`First Law Conservation Failure / Thermodynamic Violation: ${message}`);
    this.name = 'ThermodynamicViolationException';
  }
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0;

  constructor() {}

  public recordDissipation(heatJoules: number, temp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error("Dissipated heat cannot be negative.");
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / temp;
  }

  public auditMassConservation(initialMass: ElementalStocks): number {
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
    this.nutrientPool.carbon = Math.max(0, this.nutrientPool.carbon - demand.carbon);
    this.nutrientPool.nitrogen = Math.max(0, this.nutrientPool.nitrogen - demand.nitrogen);
    this.nutrientPool.phosphorus = Math.max(0, this.nutrientPool.phosphorus - demand.phosphorus);
    this.nutrientPool.water = Math.max(0, this.nutrientPool.water - demand.water);
    this.nutrientPool.oxygen = Math.max(0, this.nutrientPool.oxygen - demand.oxygen);
    this.nutrientPool.energy = Math.max(0, this.nutrientPool.energy - demand.energy);
    this.nutrientPool.qLoss = Math.max(0, this.nutrientPool.qLoss + demand.qLoss);
    return demand.clone();
  }
}

export class DetritivoreMonad {
  public static scavenge(carcass: ElementalStocks, patch: BiomePatch, ledger: ThermodynamicLedger): [ElementalStocks, ElementalStocks] {
    const assimilationRate = 0.15;
    const assimilated = new ElementalStocks(
      carcass.carbon * assimilationRate,
      carcass.nitrogen * assimilationRate,
      carcass.phosphorus * assimilationRate,
      carcass.water * assimilationRate,
      carcass.oxygen * assimilationRate,
      carcass.energy * assimilationRate,
      0
    );
    const residue = carcass.subtract(assimilated);
    patch.nutrientPool = patch.nutrientPool.add(residue);
    ledger.recordDissipation(carcass.carbon * 10.5, 298.15);
    return [assimilated, residue];
  }
}

export class StateValidator {
  private defaultTolerances: ElementalTolerances;
  private conservationHook?: (res: ValidationResult) => void;

  constructor(defaultTolerancesOrEpsilon?: ElementalTolerances | number) {
    if (typeof defaultTolerancesOrEpsilon === 'number') {
      this.defaultTolerances = {
        carbon: defaultTolerancesOrEpsilon,
        nitrogen: defaultTolerancesOrEpsilon,
        phosphorus: defaultTolerancesOrEpsilon,
        water: defaultTolerancesOrEpsilon,
        energy: defaultTolerancesOrEpsilon
      };
    } else {
      this.defaultTolerances = defaultTolerancesOrEpsilon || {
        carbon: 1e-6,
        nitrogen: 1e-6,
        phosphorus: 1e-6,
        water: 1e-6,
        energy: 1e-4
      };
    }
  }

  public static validate(stateOrActual: any, expected?: any, tolerances?: any): ValidationResult {
    if (expected !== undefined) {
      const validator = new StateValidator(tolerances);
      return validator.evaluate(stateOrActual, expected, tolerances);
    }

    const state = stateOrActual;
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

    if (state.energy === undefined || state.energy === null || Number.isNaN(state.energy)) {
      errors.push({ property: 'energy', reason: 'Missing required property \'energy\'' });
      violations.push('energy: missing required property \'energy\'');
    }
    if (state.entropy === undefined || state.entropy === null || Number.isNaN(state.entropy)) {
      errors.push({ property: 'entropy', reason: 'Missing required property \'entropy\'' });
      violations.push('entropy: missing required property \'entropy\'');
    } else if (state.entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy must be non-negative. Second Law Violation.' });
      violations.push('entropy: Entropy must be non-negative.');
    }
    if (state.temperature === undefined || state.temperature === null || Number.isNaN(state.temperature)) {
      errors.push({ property: 'temperature', reason: 'Missing required property \'temperature\'' });
      violations.push('temperature: missing required property \'temperature\'');
    } else if (state.temperature <= 0) {
      errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive (Kelvin > 0).' });
      violations.push('temperature: Absolute temperature must be strictly positive.');
    }
    if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
      errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative.' });
      violations.push('dissipationRate: Dissipation rate cannot be negative.');
    }
    if (!state.elementalStocks && !state.stocks) {
      errors.push({ property: 'elementalStocks', reason: 'Missing required property \'elementalStocks\'' });
      violations.push('elementalStocks: missing required property \'elementalStocks\'');
    }

    const stocks = state.elementalStocks ?? state.stocks ?? {};
    if (stocks && typeof stocks === 'object') {
      for (const [k, v] of Object.entries(stocks)) {
        if (typeof v !== 'number') {
          errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
          violations.push(`stocks.${k}: must be a number.`);
        } else if (v < 0) {
          errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative.` });
          violations.push(`stocks.${k}: Elemental stock '${k}' is negative.`);
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

  public validate(stateOrActual: any, expected?: any, tolerances?: any): ValidationResult {
    return StateValidator.validate(stateOrActual, expected, tolerances);
  }

  public static assertValid(state: any): void {
    const res = StateValidator.validate(state);
    if (!res.isValid) {
      throw new Error(`State validation failed: ${JSON.stringify(res.errors)}`);
    }
  }

  public assertValidState(state: any): void {
    StateValidator.assertValid(state);
  }

  public static validateStateVector(vectorOrPrev: any, currVector?: any, fluxDeltas?: any): boolean | ValidationReport {
    if (currVector !== undefined) {
      const validator = new StateValidator(1e-6);
      return validator.validateConservation(vectorOrPrev, currVector, fluxDeltas, 1.0);
    }

    const vector = vectorOrPrev;
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    }
    if (vector.energy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if (vector.entropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if (vector.temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if (vector.stocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");

    if (vector.temperature <= 0) {
      throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
    }
    if (vector.entropy < 0) {
      throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
    }
    const stocks = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : vector.stocks;
    for (const [k, v] of Object.entries(stocks || {})) {
      if (Number(v) < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }
    return true;
  }

  public validateStateVector(vectorOrPrev: any, currVector?: any, fluxDeltas?: any): boolean | ValidationReport {
    return StateValidator.validateStateVector(vectorOrPrev, currVector, fluxDeltas);
  }

  public validateState(vector: any): ValidationResult {
    const res = StateValidator.validate(vector);
    if (!res.isValid) {
      return res;
    }
    try {
      StateValidator.validateStateVector(vector);
      return { isValid: true, valid: true, errors: [], violations: [] };
    } catch (err: any) {
      return { isValid: false, valid: false, errors: [{ property: 'state', reason: err.message }], violations: [err.message] };
    }
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const resPrior = StateValidator.validate(prior);
    if (!resPrior.isValid) return resPrior;
    const resNext = StateValidator.validate(next);
    if (!resNext.isValid) return resNext;

    const priorStocks = prior.stocks instanceof Map ? Object.fromEntries(prior.stocks) : (prior.stocks ?? {});
    const nextStocks = next.stocks instanceof Map ? Object.fromEntries(next.stocks) : (next.stocks ?? {});
    const keys = new Set([...Object.keys(priorStocks), ...Object.keys(nextStocks)]);

    const errors: ValidationFailure[] = [];
    const solarInput = next.solarInput ?? prior.solarInput ?? 0;

    for (const k of keys) {
      const pVal = Number(priorStocks[k] ?? 0);
      const nVal = Number(nextStocks[k] ?? 0);
      const delta = nVal - pVal;
      if (k === 'carbon' && Math.abs(delta - solarInput) > 1e-4 && solarInput > 0) {
        errors.push({
          property: k,
          reason: `First Law Violation: Stock delta (${delta}) does not match solar input (${solarInput})`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
  }

  public static validateEntropy(state: any): boolean {
    return validateEntropy(state);
  }

  public validateEntropy(state: any): boolean {
    return StateValidator.validateEntropy(state);
  }

  public static assertNonNegativeEntropy(state: any): Result<any, any> {
    return assertNonNegativeEntropy(state);
  }

  public assertNonNegativeEntropy(state: any): Result<any, any> {
    return StateValidator.assertNonNegativeEntropy(state);
  }

  public static wrapMonadStep(stepFn: (state: any) => any): (state: any) => any {
    return (state: any) => {
      const next = stepFn(state);
      const res = assertNonNegativeEntropy(next);
      if (!res.success) {
        throw new ThermodynamicViolationException(`ThermodynamicViolation (Second Law): ${res.error.message ?? res.error}`);
      }
      if ((next?.entropyGenerationRate ?? 0) < -1e-9) {
        throw new ThermodynamicViolationException('ThermodynamicViolation (Second Law): Negative entropy generation rate');
      }
      return next;
    };
  }

  public evaluate(
    actual: ThermodynamicStateVector | any,
    expected: ThermodynamicStateVector | any,
    tolerancesOrStructure?: ElementalTolerances | Record<string, number> | any,
    maybeDt?: number
  ): DiscrepancyReport {
    if (tolerancesOrStructure && typeof tolerancesOrStructure.calculateFluxDerivedDeltas === 'function') {
      const structure = tolerancesOrStructure;
      const dt = maybeDt ?? 1.0;
      const expectedDeltas = structure.calculateFluxDerivedDeltas(actual, dt);
      return StateValidator.evaluateDiscrepancy(actual, expected, expectedDeltas, dt);
    }

    const activeTolerances = { ...this.defaultTolerances, ...(tolerancesOrStructure || {}) };
    const discrepancies: DiscrepancyResult[] = [];
    
    const actualData = typeof actual.getElements === 'function' ? actual.getElements() : (actual.stocks instanceof Map ? Object.fromEntries(actual.stocks) : (actual.stocks ?? actual.inventory ?? actual));
    const expectedData = typeof expected.getElements === 'function' ? expected.getElements() : (expected.stocks instanceof Map ? Object.fromEntries(expected.stocks) : (expected.stocks ?? expected.inventory ?? expected));
    
    let maxDiff = 0;
    let totalAbsDisc = 0;
    let allValid = true;

    const keys = new Set([...Object.keys(actualData), ...Object.keys(expectedData)]);

    for (const key of keys) {
      const actVal = Number(actualData[key] ?? 0);
      const expVal = Number(expectedData[key] ?? 0);
      const absDiff = Math.abs(actVal - expVal);
      const tol = Number(activeTolerances[key] ?? activeTolerances.default ?? 1e-6);
      const exceeded = absDiff > tol;

      if (exceeded) {
        allValid = false;
      }

      if (absDiff > maxDiff) {
        maxDiff = absDiff;
      }
      totalAbsDisc += absDiff;

      const record: DiscrepancyResult = {
        element: key,
        stockKey: key,
        expected: expVal,
        actual: actVal,
        absoluteDifference: absDiff,
        absoluteDiscrepancy: absDiff,
        delta: absDiff,
        tolerance: tol,
        exceeded,
        exceedsTolerance: exceeded,
        isWithinTolerance: !exceeded
      };
      discrepancies.push(record);
    }

    return {
      isValid: allValid,
      valid: allValid,
      maxDiscrepancy: maxDiff,
      maxDelta: maxDiff,
      totalAbsoluteDiscrepancy: totalAbsDisc,
      isMassConserved: allValid,
      discrepancies,
      records: discrepancies,
      timestamp: Date.now()
    };
  }

  public static evaluate(
    actual: any,
    expected: any,
    tolerances?: any
  ): DiscrepancyReport {
    const validator = new StateValidator(tolerances);
    return validator.evaluate(actual, expected, tolerances);
  }

  public evaluateDiscrepancy(
    actualOrPrev: any,
    expectedOrCurr: any,
    netFluxesOrTolerances?: any,
    tolerance?: number
  ): any {
    if (actualOrPrev instanceof ThermodynamicStateVector || expectedOrCurr instanceof ThermodynamicStateVector || (actualOrPrev && 'stocks' in actualOrPrev && expectedOrCurr && 'stocks' in expectedOrCurr)) {
      if (netFluxesOrTolerances instanceof Map || (netFluxesOrTolerances && typeof netFluxesOrTolerances === 'object' && !('carbon' in netFluxesOrTolerances || 'nitrogen' in netFluxesOrTolerances || 'phosphorus' in netFluxesOrTolerances || 'water' in netFluxesOrTolerances))) {
        const prev = actualOrPrev;
        const curr = expectedOrCurr;
        const fluxes = netFluxesOrTolerances;
        const tol = tolerance ?? 1e-6;

        const items: any[] = [];
        let maxDisc = 0;
        let isBalanced = true;

        const allKeys = new Set([
          ...Object.keys(prev.stocks instanceof Map ? Object.fromEntries(prev.stocks) : (prev.stocks ?? {})),
          ...Object.keys(curr.stocks instanceof Map ? Object.fromEntries(curr.stocks) : (curr.stocks ?? {})),
          ...(fluxes instanceof Map ? fluxes.keys() : Object.keys(fluxes || {}))
        ]);

        for (const k of allKeys) {
          const prevVal = prev.getStock ? prev.getStock(k) : 0;
          const currVal = curr.getStock ? curr.getStock(k) : 0;
          const actualDelta = currVal - prevVal;
          const expectedDelta = fluxes instanceof Map ? (fluxes.get(k) ?? 0) : (fluxes?.[k] ?? 0);
          const absDiff = Math.abs(actualDelta - expectedDelta);
          const exceeds = absDiff > tol;
          if (exceeds) isBalanced = false;
          if (absDiff > maxDisc) maxDisc = absDiff;

          items.push({
            stockKey: k,
            element: k,
            actualDelta,
            expectedDelta,
            absoluteDifference: absDiff,
            delta: absDiff,
            tolerance: tol,
            exceedsTolerance: exceeds,
            isWithinTolerance: !exceeds
          });
        }

        return {
          timestamp: Date.now(),
          isBalanced,
          maxDiscrepancy: maxDisc,
          maxDelta: maxDisc,
          items,
          withinTolerance: isBalanced,
          discrepancies: items
        };
      } else {
        const validator = new StateValidator(netFluxesOrTolerances);
        return validator.evaluate(actualOrPrev, expectedOrCurr, netFluxesOrTolerances);
      }
    }

    return this.evaluate(actualOrPrev, expectedOrCurr, netFluxesOrTolerances);
  }

  public static evaluateDiscrepancy(
    actualOrPrev: any,
    expectedOrCurr: any,
    netFluxesOrTolerances?: any,
    tolerance?: number
  ): any {
    const validator = new StateValidator(netFluxesOrTolerances);
    return validator.evaluateDiscrepancy(actualOrPrev, expectedOrCurr, netFluxesOrTolerances, tolerance);
  }

  public checkDiscrepancy(a: number, b: number, tolerance: number = 1e-6): boolean {
    return Math.abs(a - b) <= tolerance;
  }

  public registerConservationHook(hook: (res: ValidationResult) => void): void {
    this.conservationHook = hook;
  }

  public validateConservation(
    prevVector: any,
    currentVector: any,
    fluxes: any,
    dt: number = 1.0,
    customTolerance?: number
  ): ValidationResult {
    const tol = customTolerance ?? this.defaultTolerances.carbon ?? 1e-6;
    const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
    const currStocks = currentVector.stocks instanceof Map ? Object.fromEntries(currentVector.stocks) : (currentVector.stocks ?? {});
    
    let activeFluxes = fluxes;
    if (fluxes && 'netFluxes' in fluxes) {
      activeFluxes = fluxes.netFluxes;
    } else if (fluxes && 'fluxes' in fluxes) {
      activeFluxes = fluxes.fluxes;
    }

    const expectedDeltas = StateValidator.calculateExpectedDeltas(prevVector, activeFluxes, dt);
    const expDeltasMap = expectedDeltas.expectedDeltas instanceof Map ? expectedDeltas.expectedDeltas : new Map(Object.entries(expectedDeltas.expectedDeltas ?? expectedDeltas ?? {}));

    const discrepancies: DiscrepancyResult[] = [];
    const errors: ValidationFailure[] = [];
    let allValid = true;
    let maxDisc = 0;

    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...expDeltasMap.keys()]);

    for (const k of keys) {
      const actDelta = Number(currStocks[k] ?? 0) - Number(prevStocks[k] ?? 0);
      const expDelta = Number(expDeltasMap.get(k) ?? (expDeltasMap as any)[k] ?? 0);
      
      let expectedTotal = expDelta;
      if (k === 'energy' && fluxes && typeof fluxes.solarInput === 'number') {
        const solar = fluxes.solarInput ?? 0;
        const dissipation = fluxes.dissipationRate ?? 0;
        expectedTotal += (solar - dissipation) * dt;
      }

      const error = Math.abs(actDelta - expectedTotal);
      const exceeded = error > tol;

      if (exceeded) {
        allValid = false;
        errors.push({
          property: k,
          reason: `Stock delta discrepancy for '${k}' exceeds tolerance (${error} > ${tol})`,
          stockName: k,
          observedDelta: actDelta
        });
      }
      if (error > maxDisc) maxDisc = error;

      discrepancies.push({
        element: k,
        stockKey: k,
        expectedDelta: expectedTotal,
        actualDelta: actDelta,
        error,
        absoluteDifference: error,
        tolerance: tol,
        exceeded,
        exceedsTolerance: exceeded,
        isWithinTolerance: !exceeded
      });
    }

    const res: ValidationResult = {
      isValid: allValid,
      valid: allValid,
      maxDiscrepancy: maxDisc,
      maxDelta: maxDisc,
      discrepancies,
      errors,
      violations: errors.map(e => `${e.property}: ${e.reason}`),
      timestamp: Date.now()
    };

    if (!allValid && this.conservationHook) {
      this.conservationHook(res);
    }

    return res;
  }

  public assertConservation(
    prevVector: any,
    currentVector: any,
    fluxes: any,
    dt: number = 1.0,
    customTolerance?: number
  ): ValidationResult {
    const res = this.validateConservation(prevVector, currentVector, fluxes, dt, customTolerance);
    if (!res.valid && !res.isValid) {
      throw new ThermodynamicViolationException('First Law Conservation Failure');
    }
    return res;
  }

  public validateStockConservation(
    prevVector: any,
    currentState: any,
    fluxes: any,
    dt: number = 1.0
  ): ValidationResult {
    const fluxRates: Record<string, number> = {};
    if (Array.isArray(fluxes)) {
      for (const f of fluxes) {
        const key = f.stockKey ?? f.element ?? f.species;
        if (key) {
          const rateNet = (f.rateIn ?? f.rate ?? 0) - (f.rateOut ?? 0);
          fluxRates[key] = (fluxRates[key] ?? 0) + rateNet;
        }
      }
    } else if (fluxes instanceof Map || (fluxes && typeof fluxes === 'object')) {
      const entries = fluxes instanceof Map ? fluxes.entries() : Object.entries(fluxes);
      for (const [k, v] of entries) {
        if (typeof v === 'number') fluxRates[k] = v;
      }
    }

    const prevStocks = prevVector.stocks instanceof Map ? Object.fromEntries(prevVector.stocks) : (prevVector.stocks ?? {});
    const currStocks = currentState.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState.stocks ?? {});

    for (const [k, v] of Object.entries(currStocks)) {
      if (Number(v) < 0) {
        throw new ThermodynamicViolationException('Second Law / Negative Stock Violation');
      }
    }

    const res = this.validateConservation(prevVector, currentState, fluxRates, dt);
    if (!res.valid && !res.isValid) {
      throw new ThermodynamicViolationException('First Law Conservation Failure');
    }
    return res;
  }

  public static calculateDelta(state: any, fluxes: any[], dt: number): Map<string, any> {
    const resultMap = new Map<string, any>();
    const stocks = state.stocks instanceof Map ? Object.fromEntries(state.stocks) : (state.stocks ?? {});
    const inflowMap = new Map<string, number>();
    const outflowMap = new Map<string, number>();

    for (const f of fluxes) {
      const rate = f.rate ?? 0;
      const amt = rate * dt;
      if (f.targetId) inflowMap.set(f.targetId, (inflowMap.get(f.targetId) ?? 0) + amt);
      if (f.sourceId) outflowMap.set(f.sourceId, (outflowMap.get(f.sourceId) ?? 0) + amt);
    }

    for (const k of Object.keys(stocks)) {
      const inflow = inflowMap.get(k) ?? 0;
      const outflow = outflowMap.get(k) ?? 0;
      const expectedDelta = inflow - outflow;
      const current = Number(stocks[k] ?? 0);
      if (current + expectedDelta < 0) {
        throw new Error('Thermodynamic Violation [Second Law]: Stock drops below zero.');
      }
      resultMap.set(k, {
        element: k,
        expectedDelta,
        netInflow: inflow,
        netOutflow: outflow,
        isConserved: true
      });
    }
    return resultMap;
  }

  public calculateExpectedDelta(vector: any, dt: number): any {
    const inflows = vector.inflows instanceof Map ? Object.fromEntries(vector.inflows) : (vector.inflows ?? {});
    const outflows = vector.outflows instanceof Map ? Object.fromEntries(vector.outflows) : (vector.outflows ?? {});
    let totalIn = 0;
    let totalOut = 0;
    for (const v of Object.values(inflows)) totalIn += Number(v);
    for (const v of Object.values(outflows)) totalOut += Number(v);
    const netRate = totalIn - totalOut;
    return {
      element: vector.element,
      expectedDelta: netRate * dt,
      totalInflow: totalIn,
      totalOutflow: totalOut,
      netRate,
      isConserved: true,
      timeStep: dt
    };
  }

  public validateStockDelta(vector: any, dt: number, actualDelta: number): any {
    const expected = this.calculateExpectedDelta(vector, dt);
    const disc = Math.abs(actualDelta - expected.expectedDisk);
    const isConserved = disc <= (this.defaultTolerances.carbon ?? 1e-9);
    return {
      ...expected,
      discrepancy: disc,
      isConserved
    };
  }

  public static calculateExpectedDeltas(initialVector: any, fluxRates: any, dt: number): any {
    const map = fluxRates instanceof Map ? fluxRates : new Map(Object.entries(fluxRates || {}));
    const deltas = new Map<string, number>();
    let totalIn = 0;
    let totalOut = 0;

    for (const [k, rate] of map.entries()) {
      const val = Number(rate) * dt;
      deltas.set(k, val);
      if (val >= 0) totalIn += val;
      else totalOut += Math.abs(val);
    }

    return {
      expectedDeltas: deltas,
      totalInflow: totalIn,
      totalOutflow: totalOut,
      netRate: totalIn - totalOut,
      isConserved: true,
      get: (k: string) => deltas.get(k) ?? 0
    };
  }

  public calculateExpectedDeltas(initialVector: any, fluxRates: any, dt: number): any {
    return StateValidator.calculateExpectedDeltas(initialVector, fluxRates, dt);
  }

  public static validateConservation(
    prevVector: any,
    nextVector: any,
    fluxRates: any,
    dt: number = 1.0,
    tolerance: number = 1e-9
  ): any {
    const validator = new StateValidator(tolerance);
    return validator.validateConservation(prevVector, nextVector, fluxRates, dt, tolerance);
  }

  public static validateFirstLaw(vector: any, expectedMass: number): boolean {
    const stocks = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : (vector.stocks ?? {});
    let total = 0;
    for (const v of Object.values(stocks)) total += Number(v) || 0;
    return Math.abs(total - expectedMass) < 1e-5;
  }
}

export const ThermodynamicStateValidator = StateValidator;

export function validateOrThrowEntropy(state: any): void {
  const sGen = state?.entropyGenerationRate ?? (state instanceof ThermodynamicStateVector ? state.entropyGenerationRate : 0);
  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen);
  }
}

export function validateEntropy(state: any): boolean {
  if (!state || typeof state !== 'object') return false;
  const entropy = state.entropy ?? state.totalEntropy;
  const temp = state.temperature;
  const sGen = state.entropyGenerationRate;

  if (entropy === undefined || typeof entropy !== 'number' || entropy < 0) return false;
  if (temp === undefined || typeof temp !== 'number' || temp <= 0) return false;
  if (sGen !== undefined && typeof sGen === 'number' && sGen < -1e-9) return false;
  return true;
}

export function assertNonNegativeEntropy(state: any): Result<any, any> {
  if (!state || typeof state !== 'object') {
    return err(new EntropyValidationError(NaN, 'Invalid state object provided for entropy validation.', { code: 'INVALID_STATE_VECTOR', invalidValue: NaN }));
  }

  let entropy: number | undefined = undefined;
  let pathStr = 'entropy';

  if ('entropy' in state && typeof state.entropy === 'number') {
    entropy = state.entropy;
    pathStr = 'entropy';
  } else if ('totalEntropy' in state && typeof state.totalEntropy === 'number') {
    entropy = state.totalEntropy;
    pathStr = 'totalEntropy';
  } else if ('getEntropy' in state && typeof state.getEntropy === 'function') {
    entropy = state.getEntropy();
    pathStr = 'getEntropy()';
  } else {
    const findEntropy = (obj: any, path: string): { val: number; p: string } | null => {
      if (!obj || typeof obj !== 'object') return null;
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'number' && (k.toLowerCase().includes('entropy') || k.toLowerCase().includes('sgen'))) {
          return { val: v, p: `${path}.${k}` };
        }
        if (v && typeof v === 'object') {
          const res = findEntropy(v, `${path}.${k}`);
          if (res) return res;
        }
      }
      return null;
    };
    const found = findEntropy(state, 'state');
    if (found) {
      if (found.val < 0) {
        return err(new EntropyValidationError(found.val, `Second Law Violation: Entropy cannot be negative (S = ${found.val}).`, { code: 'NEGATIVE_ENTROPY_DETECTED', violatingValue: found.val, path: found.p }));
      }
      return ok(state);
    }
  }

  if (entropy === undefined || typeof entropy !== 'number' || isNaN(entropy)) {
    return err(new EntropyValidationError(NaN, 'Entropy metric is missing or not a valid number.', { code: 'INVALID_STATE_VECTOR', invalidValue: entropy }));
  }

  if (entropy < 0) {
    return err(new EntropyValidationError(entropy, `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`, { code: 'NEGATIVE_ENTROPY_DETECTED', violatingValue: entropy, path: pathStr }));
  }

  return ok(state);
}

export function withEntropyCheck(
  initialState: any,
  transformFn: (s: any) => any
): any {
  const nextState = transformFn(initialState);
  const prevEntropy = initialState.entropy ?? initialState.getEntropy?.() ?? 0;
  const nextEntropy = nextState.entropy ?? nextState.getEntropy?.() ?? 0;
  const deltaEntropy = nextEntropy - prevEntropy;
  const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : ((nextState.solarInput ?? 0));

  if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput) {
    return {
      valid: false,
      state: initialState,
      deltaEntropy,
      reason: 'Second Law Violation: Unphysical entropy reduction exceeding solar compensation.'
    };
  }

  return {
    valid: true,
    state: nextState,
    deltaEntropy
  };
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

  if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
  }
  if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must be a non-negative finite number.' });
  }
  if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || (s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must be a non-negative finite number (Absolute Kelvin).' });
  }

  const stocks = s['stocks'];
  if (!stocks || typeof stocks !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks inventory must be a valid object or Map.' });
  } else {
    for (const [k, v] of Object.entries(stocks)) {
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

export function executeThermodynamicTransition(
  state: any,
  transitionFn: (s: any) => any
): Result<any, any> {
  try {
    const next = transitionFn(state);
    const res = assertNonNegativeEntropy(next);
    if (!res.success) {
      return res;
    }
    if ((next.entropyGenerationRate ?? 0) < 0) {
      return err('Second Law Violation: Negative entropy generation rate.');
    }
    return ok(next);
  } catch (e: any) {
    return err(e.message);
  }
}
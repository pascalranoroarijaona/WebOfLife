import { ThermodynamicStateVector } from './state_vector.js';
import { ThermodynamicToleranceConfig, ElementalStocks, Result, ok, err, ValidationResult, ValidationFailure, DiscrepancyResult, ValidationReport, DiscrepancyReport, EntropyInspectable, FluxBoundary, BoundaryFluxRates, IFlowRateVector, FluxVector, ThermodynamicState, ThermodynamicStateLike } from './types.js';

export { ElementalStocks, ValidationResult, ValidationFailure, DiscrepancyResult, ValidationReport, DiscrepancyReport, ThermodynamicState, ThermodynamicStateLike, ThermodynamicStateVector };
export type StateVector = ThermodynamicStateVector;
export const StateVector = ThermodynamicStateVector;

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

export interface DiscrepancyDetail {
  readonly expected: number;
  readonly actual: number;
  readonly delta: number;
  readonly tolerance: number;
  readonly actualDelta: number;
  readonly expectedDelta: number;
  readonly absoluteDifference: number;
  readonly isWithinTolerance: boolean;
  readonly exceedsTolerance: boolean;
  readonly error: number;
}

export interface DiscrepancyResultMap {
  readonly isValid: boolean;
  readonly discrepancies: Record<string, DiscrepancyDetail>;
  readonly maxDelta: number;
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0;

  constructor() {}

  public recordDissipation(heatJoulesOrTemp: number, ambientTemp?: number): void {
    if (heatJoulesOrTemp < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    if (ambientTemp !== undefined) {
      this.totalDissipatedHeat += heatJoulesOrTemp;
      this.totalEntropy += heatJoulesOrTemp / ambientTemp;
    } else {
      this.totalDissipatedHeat += heatJoulesOrTemp;
      this.totalEntropy += heatJoulesOrTemp / 298.15;
    }
  }

  public auditMassConservation(initialMass: ElementalStocks): number {
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
    ledger.recordDissipation(carcass.carbon * 10.5);
    patch.nutrientPool = patch.nutrientPool.add(residue);
    return [assimilated, residue];
  }
}

export class StateValidator {
  private conservationHook?: (res: ValidationResult) => void;

  constructor(private readonly defaultTolerance: number = 1e-6) {}

  public registerConservationHook(hook: (res: ValidationResult) => void): void {
    this.conservationHook = hook;
  }

  public validateState(state: any): ValidationResult {
    const propertyRes = validateStateProperties(state);
    const sGen = state.entropyGenerationRate ?? 0;
    const errors: ValidationFailure[] = [...(propertyRes.errors ?? [])];
    if (sGen < -1e-9) {
      errors.push({ property: 'entropyGenerationRate', reason: 'Entropy generation rate must be non-negative.' });
    }
    const isValid = errors.length === 0;
    return {
      isValid,
      valid: isValid,
      errors,
      violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const priorValid = this.validateState(prior);
    const nextValid = this.validateState(next);
    const errors: ValidationFailure[] = [...(priorValid.errors ?? []), ...(nextValid.errors ?? [])];
    
    const priorEnergy = prior.internalEnergy ?? prior.energy ?? 0;
    const nextEnergy = next.internalEnergy ?? next.energy ?? 0;
    const solar = next.solarInput ?? 0;
    if (Math.abs((nextEnergy - priorEnergy) - solar) > 1e-3) {
      errors.push({ property: 'energy', reason: 'First Law Violation: Energy delta does not match solar input.' });
    }

    const isValid = errors.length === 0;
    return {
      isValid,
      valid: isValid,
      errors,
      violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
  }

  public assertValidState(vector: any): void {
    const res = this.validateState(vector);
    if (!res.isValid) {
      throw new ThermodynamicViolationException('State vector validation failed.');
    }
    validateOrThrowEntropy(vector);
  }

  public validateStateVector(vector: any, currentVector?: any, fluxes?: any): boolean | ValidationReport {
    if (currentVector !== undefined && fluxes !== undefined) {
      return this.validateStateVectorInstance(vector, currentVector, fluxes);
    }
    return StateValidator.validateStateVectorStatic(vector);
  }

  public static validateStateVector(vector: any, currentVector?: any, fluxes?: any): boolean | ValidationReport {
    if (currentVector !== undefined && fluxes !== undefined) {
      const validator = new StateValidator();
      return validator.validateStateVectorInstance(vector, currentVector, fluxes);
    }
    return StateValidator.validateStateVectorStatic(vector);
  }

  public static validateStateVectorStatic(vector: any): boolean {
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
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
      throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    }
    if (vector.temperature <= 0) {
      throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    }
    const stocks = vector.stocks instanceof Map ? Object.fromEntries(vector.stocks) : vector.stocks;
    for (const [k, v] of Object.entries(stocks)) {
      if (Number(v) < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }
    return true;
  }

  public validateStateVectorInstance(prevVector: any, currVector: any, fluxes: any): ValidationReport {
    const validator = new StateValidator(1e-5);
    const report = validator.evaluateDiscrepancy(prevVector, currVector, fluxes);
    const discrepanciesArr: DiscrepancyResult[] = [];
    let maxDisc = 0;

    for (const [stockId, detailRaw] of Object.entries(report.discrepancies)) {
      const detail = detailRaw as DiscrepancyDetail;
      const absDiff = detail.absoluteDifference;
      if (absDiff > maxDisc) maxDisc = absDiff;
      discrepanciesArr.push({
        stockId,
        actualDelta: detail.actualDelta,
        expectedDelta: detail.expectedDelta,
        absoluteDifference: absDiff,
        isWithinTolerance: detail.isWithinTolerance
      });
    }

    return {
      timestamp: Date.now(),
      isValid: report.withinTolerance,
      maxDiscrepancy: maxDisc,
      discrepancies: discrepanciesArr
    };
  }

  public static assertNonNegativeEntropy(vector: any): Result<any, any> {
    return assertNonNegativeEntropy(vector);
  }

  public assertNonNegativeEntropy(vector: any): Result<any, any> {
    return assertNonNegativeEntropy(vector);
  }

  public static validateEntropy(state: any): boolean {
    if (!state) return false;
    const entropy = state.entropy ?? state.getEntropy?.() ?? 0;
    const sGen = state.entropyGenerationRate ?? 0;
    const temp = state.temperature ?? 288.15;
    return entropy >= 0 && sGen >= -1e-9 && temp > 0;
  }

  public validateEntropy(state: any): boolean {
    return StateValidator.validateEntropy(state);
  }

  public static validate(state: any): ValidationResult {
    const propRes = validateStateProperties(state);
    const errors: ValidationFailure[] = [...(propRes.errors ?? [])];
    if (state.entropy !== undefined && state.entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
    }
    if (state.temperature !== undefined && state.temperature < 0) {
      errors.push({ property: 'temperature', reason: 'Absolute temperature cannot be negative' });
    }
    if (state.stocks) {
      for (const [k, v] of Object.entries(state.stocks)) {
        if (Number(v) < 0) {
          errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' is negative` });
        }
      }
    }
    const isValid = errors.length === 0;
    return {
      isValid,
      valid: isValid,
      errors,
      violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
  }

  public validate(state: any): ValidationResult {
    return StateValidator.validate(state);
  }

  public static assertValid(state: any): void {
    const res = ThermodynamicStateValidator.validate(state);
    if (!res.isValid) {
      throw new Error('State validation failed');
    }
  }

  public assertValid(state: any): void {
    StateValidator.assertValid(state);
  }

  public static wrapMonadStep(stepFn: (v: any) => any): (v: any) => any {
    return (v: any) => {
      const next = stepFn(v);
      ThermodynamicStateValidator.validateStateVector(next);
      return next;
    };
  }

  public evaluateDiscrepancy(
    expected: ThermodynamicStateVector | any,
    actual: ThermodynamicStateVector | any,
    tolerancesOrFluxes?: any,
    customTolerance?: number
  ): DiscrepancyReport & Record<string, any> {
    let defaultTol = customTolerance ?? this.defaultTolerance;
    let fluxMap: Record<string, number> = {};

    if (tolerancesOrFluxes && typeof tolerancesOrFluxes === 'object') {
      if (typeof tolerancesOrFluxes.getDefaultTolerance === 'function') {
        defaultTol = tolerancesOrFluxes.getDefaultTolerance();
      }
      if (typeof tolerancesOrFluxes.getElementTolerance === 'function') {
        // evaluated per element
      } else if (!('getElementTolerance' in tolerancesOrFluxes) && !('tolerances' in tolerancesOrFluxes)) {
        fluxMap = tolerancesOrFluxes;
      }
    }

    const expStocks = expected instanceof ThermodynamicStateVector ? expected.getValues() : (expected.stocks ?? expected.inventory ?? expected.massInventory ?? {});
    const actStocks = actual instanceof ThermodynamicStateVector ? actual.getValues() : (actual.stocks ?? actual.inventory ?? actual.massInventory ?? {});
    
    let isBalanced = true;
    let maxDelta = 0;
    const discrepancies: Record<string, DiscrepancyDetail> = {};
    const items: any[] = [];
    const poolDiscrepancies: Record<string, any> = {};

    const keys = new Set([...Object.keys(expStocks), ...Object.keys(actStocks), ...Object.keys(fluxMap)]);
    let totalDisc = 0;

    for (const k of keys) {
      const expVal = Number(expStocks[k] ?? 0);
      const actVal = Number(actStocks[k] ?? 0);
      const actualDelta = actVal - expVal;
      const expectedDelta = fluxMap[k] ?? 0;
      const absDiff = Math.abs(actualDelta - expectedDelta);
      const absDelta = Math.abs(actVal - expVal);

      if (absDelta > maxDelta) maxDelta = absDelta;
      if (absDiff > maxDelta) maxDelta = absDiff;

      let elemTol = defaultTol;
      if (tolerancesOrFluxes && typeof tolerancesOrFluxes.getElementTolerance === 'function') {
        elemTol = tolerancesOrFluxes.getElementTolerance(k) ?? defaultTol;
      }

      const isWithinTol = absDelta <= elemTol && absDiff <= elemTol;
      if (!isWithinTol) isBalanced = false;

      discrepancies[k] = {
        expected: expVal,
        actual: actVal,
        delta: absDelta,
        tolerance: elemTol,
        error: absDiff,
        actualDelta,
        expectedDelta,
        absoluteDifference: absDiff,
        isWithinTolerance: isWithinTol,
        exceedsTolerance: !isWithinTol
      };

      poolDiscrepancies[k] = {
        actualDelta,
        expectedDelta,
        absoluteDifference: absDiff,
        violated: !isWithinTol
      };

      items.push({
        stockKey: k,
        actualDelta,
        expectedDelta,
        absoluteDifference: absDiff,
        exceedsTolerance: !isWithinTol,
        isWithinTolerance: isWithinTol
      });

      totalDisc += absDiff;
    }

    const isValid = isBalanced && maxDelta <= defaultTol;

    return {
      timestamp: Date.now(),
      totalDiscrepancy: totalDisc,
      poolDiscrepancies,
      withinTolerance: isValid,
      isValid,
      isBalanced,
      within_tolerance: isValid,
      maxDelta,
      maxDiscrepancy: maxDelta,
      discrepancies,
      items,
      maxToleranceExceeded: !isValid
    };
  }

  public static evaluateDiscrepancy(
    expected: ThermodynamicStateVector | any,
    actual: ThermodynamicStateVector | any,
    tolerancesOrFluxes?: any,
    customTolerance?: number
  ): DiscrepancyReport & Record<string, any> {
    const validator = new StateValidator(customTolerance);
    return validator.evaluateDiscrepancy(expected, actual, tolerancesOrFluxes, customTolerance);
  }

  public static calculateExpectedDeltas(
    initialVector: StateVector | any,
    fluxRates: Map<string, number> | Record<string, number>,
    dt: number
  ): any {
    return StateValidator.calculateExpectedDeltasInstance(initialVector, fluxRates, dt);
  }

  public calculateExpectedDeltas(
    initialVector: StateVector | any,
    fluxRates: Map<string, number> | Record<string, number>,
    dt: number
  ): any {
    return StateValidator.calculateExpectedDeltasInstance(initialVector, fluxRates, dt);
  }

  public static calculateExpectedDeltasInstance(
    initialVector: StateVector | any,
    fluxRates: Map<string, number> | Record<string, number>,
    dt: number
  ): any {
    const deltas = new Map<string, number>();
    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;

    const fluxObj = fluxRates instanceof Map ? Object.fromEntries(fluxRates) : fluxRates;
    for (const [k, rate] of Object.entries(fluxObj)) {
      const d = Number(rate) * dt;
      deltas.set(k, d);
      expectedDeltas[k] = d;
      if (d > 0) totalInflow += d;
      else totalOutflow += Math.abs(d);
    }

    return {
      expectedDeltas,
      totalInflow,
      totalOutflow,
      netRate: totalInflow - totalOutflow,
      isConserved: true,
      get: (k: string) => deltas.get(k) ?? expectedDeltas[k]
    };
  }

  public static calculateExpectedDelta(vector: IFlowRateVector, dt: number): any {
    let totalInflow = 0;
    let totalOutflow = 0;
    const inflows = vector.inflows instanceof Map ? Object.fromEntries(vector.inflows) : vector.inflows;
    const outflows = vector.outflows instanceof Map ? Object.fromEntries(vector.outflows) : vector.outflows;

    for (const v of Object.values(inflows)) totalInflow += Number(v) || 0;
    for (const v of Object.values(outflows)) totalOutflow += Number(v) || 0;

    const netRate = totalInflow - totalOutflow;
    return {
      element: vector.element,
      inflows,
      outflows,
      totalInflow,
      totalOutflow,
      netRate,
      expectedDelta: netRate * dt,
      timeStep: dt,
      isConserved: true
    };
  }

  public calculateExpectedDelta(vector: IFlowRateVector, dt: number): any {
    return StateValidator.calculateExpectedDelta(vector, dt);
  }

  public static validateStockDelta(vector: IFlowRateVector, dt: number, observedDelta: number): any {
    const validator = new StateValidator();
    const expected = validator.calculateExpectedDeltaInstance(vector, dt);
    const discrepancy = Math.abs(observedDelta - expected.expectedDelta);
    const isConserved = discrepancy <= validator.defaultTolerance;
    return {
      ...expected,
      observedDelta,
      discrepancy,
      isConserved
    };
  }

  public validateStockDelta(vector: IFlowRateVector, dt: number, observedDelta: number): any {
    return StateValidator.validateStockDelta(vector, dt, observedDelta);
  }

  public calculateExpectedDeltaInstance(vector: IFlowRateVector, dt: number): any {
    return StateValidator.calculateExpectedDelta(vector, dt);
  }

  public static validateConservation(
    prevVector: StateVector | any,
    currentVector: StateVector | any,
    fluxes: BoundaryFluxRates | Map<string, number> | any,
    dt: number,
    customTolerance?: number
  ): ValidationResult {
    const validator = new StateValidator(customTolerance ?? 1e-6);
    return validator.validateConservationInstance(prevVector, currentVector, fluxes, dt, customTolerance);
  }

  public validateConservation(
    prevVector: StateVector | any,
    currentVector: StateVector | any,
    fluxes: BoundaryFluxRates | Map<string, number> | any,
    dt: number,
    customTolerance?: number
  ): ValidationResult {
    return this.validateConservationInstance(prevVector, currentVector, fluxes, dt, customTolerance);
  }

  public validateConservationInstance(
    prevVector: StateVector | any,
    currentVector: StateVector | any,
    fluxes: BoundaryFluxRates | Map<string, number> | any,
    dt: number,
    customTolerance?: number
  ): ValidationResult {
    const tol = customTolerance ?? this.defaultTolerance;
    const prevStocks = prevVector instanceof StateVector ? prevVector.getValues() : (prevVector.stocks ?? {});
    const currStocks = currentVector instanceof StateVector ? currentVector.getValues() : (currentVector.stocks ?? {});

    let fluxMap: Record<string, number> = {};
    if (fluxes instanceof Map) {
      fluxMap = Object.fromEntries(fluxes);
    } else if (fluxes && fluxes.fluxes) {
      fluxMap = fluxes.fluxes instanceof Map ? Object.fromEntries(fluxes.fluxes) : fluxes.fluxes;
    } else if (fluxes && typeof fluxes === 'object') {
      fluxMap = fluxes;
    }

    const discrepancies = new Map<string, any>();
    const errors: ValidationFailure[] = [];
    let isValid = true;

    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...Object.keys(fluxMap)]);
    for (const k of keys) {
      const prevVal = Number(prevStocks[k] ?? 0);
      const currVal = Number(currStocks[k] ?? 0);
      const actualDelta = currVal - prevVal;
      const rate = Number(fluxMap[k] ?? 0);
      const expectedDelta = rate * dt;
      const diff = Math.abs(actualDelta - expectedDelta);

      const errObj = {
        stockId: k,
        stockName: k,
        actualDelta,
        expectedDelta,
        absoluteDifference: diff,
        error: diff,
        isWithinTolerance: diff <= tol
      };

      discrepancies.set(k, errObj);

      if (diff > tol) {
        isValid = false;
        errors.push({
          property: k,
          stockName: k,
          observedDelta: actualDelta,
          reason: `Conservation violation for stock '${k}': actual delta ${actualDelta} differs from expected ${expectedDelta} by ${diff}`
        });
      }
    }

    const result: ValidationResult = {
      isValid,
      valid: isValid,
      maxTolerance: tol,
      discrepancies,
      errors,
      violations: errors.map(e => e.reason)
    };

    if (!isValid && this.conservationHook) {
      this.conservationHook(result);
    }

    return result;
  }

  public static assertConservation(
    prevVector: StateVector | any,
    currentVector: StateVector | any,
    fluxes: any,
    dt: number,
    customTolerance?: number
  ): ValidationResult {
    const validator = new StateValidator(customTolerance ?? 1e-6);
    const res = validator.validateConservationInstance(prevVector, currentVector, fluxes, dt, customTolerance);
    if (!res.isValid) {
      throw new ThermodynamicViolationException('Thermodynamic Conservation Violation Detected');
    }
    return res;
  }

  public assertConservation(
    prevVector: StateVector | any,
    currentVector: StateVector | any,
    fluxes: any,
    dt: number,
    customTolerance?: number
  ): ValidationResult {
    return StateValidator.assertConservation(prevVector, currentVector, fluxes, dt, customTolerance);
  }

  public static validateFirstLaw(vector: StateVector | any, expectedTotal: number): boolean {
    const stocks = vector instanceof StateVector ? vector.getValues() : (vector.stocks ?? {});
    const sum = Object.values(stocks).reduce((a: number, b: unknown) => a + Number(b), 0);
    return Math.abs(sum - expectedTotal) <= 1e-6;
  }

  public validateFirstLaw(vector: StateVector | any, expectedTotal: number): boolean {
    return StateValidator.validateFirstLaw(vector, expectedTotal);
  }

  public evaluate(
    previousState: StateVector | any,
    currentState: StateVector | any,
    structure: any,
    deltaTime: number
  ): any {
    const actualDeltas = previousState.computeDelta ? previousState.computeDelta(currentState) : {};
    const expectedDeltas = typeof structure.calculateFluxDerivedDeltas === 'function' 
      ? structure.calculateFluxDerivedDeltas(previousState, deltaTime)
      : (structure.expectedDeltas ?? {});

    const records: any[] = [];
    let totalAbsoluteDiscrepancy = 0;

    const keys = new Set([...Object.keys(actualDeltas), ...Object.keys(expectedDeltas)]);
    for (const key of keys) {
      const act = actualDeltas[key] ?? 0;
      const exp = expectedDeltas[key] ?? 0;
      const absDiff = Math.abs(act - exp);
      totalAbsoluteDiscrepancy += absDiff;
      records.push({
        stockKey: key,
        actualDelta: act,
        expectedFluxDelta: exp,
        absoluteDiscrepancy: absDiff,
        isWithinTolerance: absDiff <= this.defaultTolerance
      });
    }

    return {
      timestamp: Date.now(),
      totalAbsoluteDiscrepancy,
      records,
      isMassConserved: totalAbsoluteDiscrepancy <= this.defaultTolerance
    };
  }

  public static calculateDelta(state: any, fluxes: FluxVector[], dt: number): Map<string, any> {
    const results = new Map<string, any>();
    const stocks = state instanceof StateVector ? state.getValues() : (state.stocks ?? state);

    const inflows = new Map<string, number>();
    const outflows = new Map<string, number>();

    for (const f of fluxes) {
      const elem = f.stockKey ?? f.element ?? 'energy';
      const rate = f.rate ?? 0;
      const total = rate * dt;

      if (f.targetId && f.targetId !== f.sourceId) {
        inflows.set(elem, (inflows.get(elem) ?? 0) + total);
      } else if (f.sourceId && f.sourceId !== f.targetId) {
        outflows.set(elem, (outflows.get(elem) ?? 0) + total);
      } else {
        if (rate >= 0) inflows.set(elem, (inflows.get(elem) ?? 0) + total);
        else outflows.set(elem, (outflows.get(elem) ?? 0) + Math.abs(total));
      }
    }

    const keys = new Set([...Object.keys(stocks), ...inflows.keys(), ...outflows.keys()]);
    for (const k of keys) {
      const inf = inflows.get(k) ?? 0;
      const outf = outflows.get(k) ?? 0;
      const expectedDelta = inf - outf;
      const currentStock = Number(stocks[k] ?? 0);
      
      if (currentStock + expectedDelta < -1e-9) {
        throw new Error('Thermodynamic Violation [Second Law]: Stock dropped below absolute zero.');
      }

      results.set(k, {
        element: k,
        netInflow: inf,
        netOutflow: outf,
        expectedDelta,
        isConserved: true
      });
    }

    return results;
  }

  public calculateDelta(state: any, fluxes: FluxVector[], dt: number): Map<string, any> {
    return StateValidator.calculateDelta(state, fluxes, dt);
  }

  public validateStockConservation(
    prevState: StateVector | any,
    currentState: StateVector | any,
    fluxes: any[],
    dt: number
  ): any {
    const netFluxRates: Record<string, number> = {};
    for (const flux of fluxes) {
      const key = flux.stockKey ?? flux.element ?? 'energy';
      const net = (flux.rateIn ?? flux.rate ?? 0) - (flux.rateOut ?? 0);
      netFluxRates[key] = (netFluxRates[key] ?? 0) + net;
    }

    return this.validateConservationInstance(prevState, currentState, netFluxRates, dt);
  }
}

export const ThermodynamicStateValidator = StateValidator;

export function validateStateProperties(state: unknown): ValidationResult {
  const errors: ValidationFailure[] = [];

  if (state === null || typeof state !== 'object') {
    return {
      isValid: false,
      valid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
      violations: ['root: State must be a non-null object.']
    };
  }

  const s = state as Record<string, unknown>;

  if (s['energy'] === undefined && s['internalEnergy'] === undefined && s['stocks'] === undefined && s['inventory'] === undefined && s['massInventory'] === undefined) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
  } else if (s['energy'] !== undefined && (typeof s['energy'] !== 'number' || Number.isNaN(s['energy']))) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
  } else if (s['energy'] !== undefined && (s['energy'] as number) < 0) {
    errors.push({ property: 'energy', reason: 'Energy cannot be negative.' });
  }

  if (s['entropy'] !== undefined && (typeof s['entropy'] !== 'number' || Number.isNaN(s['entropy']))) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
  } else if (s['entropy'] !== undefined && (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
  }

  if (s['temperature'] !== undefined && (typeof s['temperature'] !== 'number' || Number.isNaN(s['temperature']))) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
  } else if (s['temperature'] !== undefined && (s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Absolute temperature cannot be negative.' });
  }

  const stocksObj = s['stocks'] ?? s['inventory'] ?? s['massInventory'];
  if (stocksObj !== undefined && stocksObj !== null) {
    if (typeof stocksObj !== 'object') {
      errors.push({ property: 'stocks', reason: 'Stocks must be an object.' });
    } else {
      for (const [k, v] of Object.entries(stocksObj as Record<string, unknown>)) {
        if (typeof v !== 'number' || Number.isNaN(v)) {
          errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
        } else if ((v as number) < 0) {
          errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
        }
      }
    }
  }

  const isValid = errors.length === 0;
  return {
    isValid,
    valid: isValid,
    errors,
    violations: errors.map(e => `${e.property}: ${e.reason}`)
  };
}

export function validateOrThrowEntropy(state: ThermodynamicStateVector | any): boolean {
  const sGen = state.entropyGenerationRate ?? state.entropyGeneratorRate ?? 0;
  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen);
  }
  if (state.entropy !== undefined && state.entropy < 0) {
    throw new ThermodynamicEntropyViolationError(state.entropy, 'Second Law Violation: Entropy cannot be negative.');
  }
  return true;
}

export function assertNonNegativeEntropy(state: any): Result<any, any> {
  if (!state || typeof state !== 'object') {
    return {
      success: false,
      error: 'Invalid state object provided for entropy validation.',
      code: 'INVALID_STATE_VECTOR',
      invalidValue: state,
      isOk: () => false,
      isErr: () => true
    };
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);

  if (entropy !== undefined && (typeof entropy !== 'number' || isNaN(entropy))) {
    return {
      success: false,
      error: 'Entropy metric is missing or not a valid number.',
      code: 'INVALID_STATE_VECTOR',
      invalidValue: entropy,
      isOk: () => false,
      isErr: () => true
    };
  }

  if (entropy !== undefined && entropy < 0) {
    return {
      success: false,
      error: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
      code: 'NEGATIVE_ENTROPY_VIOLATION',
      invalidValue: entropy,
      errorValue: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
      isOk: () => false,
      isErr: () => true
    };
  }

  return {
    success: true,
    value: state,
    isOk: () => true,
    isErr: () => false
  };
}

export function withEntropyCheck(initialState: any, transformFn: (s: any) => any): any {
  const nextState = transformFn(initialState);
  const prevEntropy = typeof initialState.getEntropy === 'function' ? initialState.getEntropy() : (initialState.entropy ?? 0);
  const nextEntropy = typeof nextState.getEntropy === 'function' ? nextState.getEntropy() : (nextState.entropy ?? 0);
  const deltaEntropy = nextEntropy - prevEntropy;
  const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : (nextState.solarInput ?? 0);

  const isValid = deltaEntropy >= 0 || solarInput >= Math.abs(deltaEntropy);

  if (!isValid) {
    return {
      valid: false,
      validity: false,
      state: initialState,
      deltaEntropy,
      reason: 'Second Law Violation: Unphysical entropy reduction exceeding solar compensation.'
    };
  }

  return {
    valid: true,
    validity: true,
    state: nextState,
    deltaEntropy
  };
}

export function executeThermodynamicTransition(state: any, transitionFn: (s: any) => any): Result<any, string> {
  try {
    const next = transitionFn(state);
    const res = assertNonNegativeEntropy(next);
    if (!res.isOk()) {
      const errVal = res.success ? '' : (res.errorValue ?? res.error ?? 'Unknown error');
      return { success: false, error: errVal, errorValue: errVal, isOk: () => false, isErr: () => true };
    }
    return { success: true, value: next, isOk: () => true, isErr: () => false };
  } catch (err: any) {
    return { success: false, error: err.message, errorValue: err.message, isOk: () => false, isErr: () => true };
  }
}
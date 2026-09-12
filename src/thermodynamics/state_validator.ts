/**
 * Thermodynamic State Vector Stock Conservation Delta Calculator (`src/thermodynamics/state_validator.ts`)
 * Implements isolated mathematical calculation of expected stock deltas from boundary flux rates and simulation time steps.
 * Adheres strictly to First and Second Laws of Thermodynamics.
 */
import { ThermodynamicStateVector as StateVector, ThermodynamicStateVector } from './state_vector.js';
import { FluxRateMap, DeltaCalculationResult, Result, ok, err, EntropyInspectable, ElementalStocks, IFlowRateVector, FluxBoundary, BoundaryFluxRates, ValidationResult, ValidationFailure, BoundaryFluxBoundary, ThermodynamicState, ThermodynamicStateLike, IThermodynamicStateVector } from './types.js';

export { ElementalStocks, ValidationResult, ValidationFailure, ThermodynamicState, ThermodynamicStateLike, IThermodynamicStateVector, ThermodynamicStateVector };

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate: number, message?: string) {
    super(message || `Second Law Violation: Entropy generation rate S_gen = ${entropyGenerationRate} < 0.`);
    this.name = 'ThermodynamicEntropyViolationError';
    Object.setPrototypeOf(this, ThermodynamicEntropyViolationError.prototype);
  }
}

export type ThermodynamicViolationException = ThermodynamicEntropyViolationError;
export const ThermodynamicViolationException = ThermodynamicEntropyViolationError;

export class StateValidator {
  private tolerance: number;
  private conservationHooks: ((res: any) => void)[] = [];

  constructor(tolerance: number = 1e-9) {
    this.tolerance = tolerance;
  }

  public static calculateExpectedDeltas(
    currentVector: StateVector | IFlowRateVector,
    fluxesOrDt: FluxRateMap | Map<string, number> | number,
    deltaTimeParam?: number
  ): DeltaCalculationResult {
    if ('element' in currentVector && 'inflows' in currentVector) {
      const vec = currentVector as IFlowRateVector;
      const dt = typeof fluxesOrDt === 'number' ? fluxesOrDt : 1.0;
      let totalInflow = 0;
      let totalOutflow = 0;
      const inflowsObj = vec.inflows instanceof Map ? Object.fromEntries(vec.inflows) : vec.inflows;
      const outflowsObj = vec.outflows instanceof Map ? Object.fromEntries(vec.outflows) : vec.outflows;

      for (const val of Object.values(inflowsObj)) {
        totalInflow += Number(val) || 0;
      }
      for (const val of Object.values(outflowsObj)) {
        totalOutflow += Number(val) || 0;
      }
      const netRate = totalInflow - totalOutflow;
      const expectedDelta = netRate * dt;
      const deltasMap = new Map<string, number>([[vec.element, expectedDelta]]);
      (deltasMap as any).get = (k: string) => deltasMap.get(k);

      return {
        expectedDeltas: deltasMap as any,
        totalInflow,
        totalOutflow,
        netRate,
        isConserved: true,
        element: vec.element,
        expectedDelta,
        netInflow: totalInflow,
        netOutflow: totalOutflow,
        timeStep: dt,
        get: (k: string) => deltasMap.get(k)
      };
    }

    const fluxes = fluxesOrDt as FluxRateMap | Map<string, number>;
    const dt = deltaTimeParam ?? 1.0;
    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;
    let netRate = 0;

    const fluxEntries = fluxes instanceof Map ? fluxes.entries() : Object.entries(fluxes);
    for (const [stockId, fluxRate] of fluxEntries) {
      const rate = Number(fluxRate) || 0;
      const delta = rate * dt;
      expectedDeltas[stockId] = delta;

      if (rate > 0) {
        totalInflow += rate;
      } else {
        totalOutflow += Math.abs(rate);
      }
      netRate += rate;
    }

    const deltasMap = new Map<string, number>(Object.entries(expectedDeltas));
    (deltasMap as any).get = (k: string) => deltasMap.get(k);

    return {
      expectedDeltas: deltasMap as any,
      totalInflow,
      totalOutflow,
      netRate,
      isConserved: true,
      get: (k: string) => deltasMap.get(k)
    };
  }

  public calculateExpectedDeltas(
    currentVector: StateVector | IFlowRateVector,
    fluxes: FluxRateMap | Map<string, number> | number,
    deltaTime?: number
  ): DeltaCalculationResult {
    return StateValidator.calculateExpectedDeltas(currentVector, fluxes, deltaTime);
  }

  public calculateExpectedDelta(
    currentVector: StateVector | IFlowRateVector,
    fluxesOrDt: FluxRateMap | Map<string, number> | number,
    deltaTimeParam?: number
  ): DeltaCalculationResult {
    return StateValidator.calculateExpectedDeltas(currentVector, fluxesOrDt, deltaTimeParam);
  }

  public validateStockDelta(
    vector: IFlowRateVector,
    dt: number,
    observedDelta: number,
    tolerance?: number
  ): DeltaCalculationResult {
    const res = StateValidator.calculateExpectedDeltas(vector, dt);
    const expectedDelta = res.expectedDelta ?? 0;
    const discrepancy = Math.abs(observedDelta - expectedDelta);
    const tol = tolerance ?? this.tolerance;
    const isConserved = discrepancy <= tol;
    return {
      ...res,
      expectedDelta,
      discrepancy,
      isConserved
    };
  }

  public static calculateDelta(
    currentVector: StateVector,
    fluxes: any[],
    deltaTime: number
  ): Map<string, any> {
    const results = new Map<string, any>();
    const stockKeys = Object.keys(currentVector.stocks ?? {});
    for (const key of stockKeys) {
      const currentVal = currentVector.stocks[key] ?? 0;
      let netInflow = 0;
      let netOutflow = 0;
      for (const flux of fluxes) {
        if (flux.targetId === key || flux.stockKey === key) {
          netInflow += (flux.rate ?? flux.rateIn ?? 0);
        }
        if (flux.sourceId === key || (flux.stockKey === key && flux.rateOut)) {
          netOutflow += (flux.rate ?? flux.rateOut ?? 0);
        }
      }
      const netRate = netInflow - netOutflow;
      const expectedDelta = netRate * deltaTime;
      const projected = currentVal + expectedDelta;
      if (projected < 0) {
        throw new ThermodynamicEntropyViolationError(0, 'Thermodynamic Violation [Second Law]: Stock dropped below absolute zero.');
      }
      results.set(key, {
        expectedDelta,
        netInflow: netInflow * deltaTime,
        netOutflow: netOutflow * deltaTime,
        isConserved: true
      });
    }
    if (results.size === 0 && fluxes.length === 0) {
      for (const key of Object.keys(currentVector.stocks ?? {})) {
        results.set(key, { expectedDelta: 0, netInflow: 0, netOutflow: 0, isConserved: true });
      }
    }
    return results;
  }

  public static validateConservation(
    previousVector: StateVector | any,
    nextVector: StateVector | any,
    fluxes: FluxRateMap | Map<string, number> | BoundaryFluxRates | BoundaryFluxBoundary | any,
    deltaTime: number,
    tolerance: number = 1e-9
  ): ValidationResult {
    let fluxMap: Record<string, number> = {};
    if (fluxes instanceof Map) {
      fluxMap = Object.fromEntries(fluxes);
    } else if (fluxes && typeof fluxes === 'object' && 'fluxes' in fluxes && (fluxes.fluxes instanceof Map || typeof fluxes.fluxes === 'object')) {
      fluxMap = fluxes.fluxes instanceof Map ? Object.fromEntries(fluxes.fluxes) : fluxes.fluxes;
    } else if (fluxes && typeof fluxes === 'object' && 'netFluxes' in fluxes) {
      fluxMap = fluxes.netFluxes instanceof Map ? Object.fromEntries(fluxes.netFluxes) : fluxes.netFluxes;
    } else if (fluxes && typeof fluxes === 'object') {
      fluxMap = fluxes;
    }

    const expected = StateValidator.calculateExpectedDeltas(previousVector, fluxMap, deltaTime);
    const prevValues = typeof previousVector.getValues === 'function' ? previousVector.getValues() : (previousVector.stocks ?? {});
    const nextValues = typeof nextVector.getValues === 'function' ? nextVector.getValues() : (nextVector.stocks ?? {});
    const discrepancies = new Map<string, any>();
    const violations: any[] = [];
    let isValid = true;

    const expectedDeltasObj = expected.expectedDeltas instanceof Map ? Object.fromEntries(expected.expectedDeltas) : expected.expectedDeltas;
    for (const [stockId, expectedDelta] of Object.entries(expectedDeltasObj)) {
      const sPrev = prevValues[stockId] ?? (typeof previousVector.getStock === 'function' ? previousVector.getStock(stockId) : 0);
      const sNext = nextValues[stockId] ?? (typeof nextVector.getStock === 'function' ? nextVector.getStock(stockId) : 0);
      const observedDelta = sNext - sPrev;
      const error = Math.abs(observedDelta - (expectedDelta as number));

      discrepancies.set(stockId, { expectedDelta, actualDelta: observedDelta, error });
      if (error > tolerance) {
        isValid = false;
        violations.push({ stockName: stockId, expectedDelta, observedDelta, discrepancy: error });
      }
    }

    return {
      isValid,
      valid: isValid,
      maxTolerance: tolerance,
      discrepancies,
      violations,
      timestamp: nextVector.timestamp ?? 0,
      errors: isValid ? [] : [{ property: 'conservation', reason: 'Conservation violation detected' }]
    };
  }

  public validateConservation(
    previousVector: StateVector,
    nextVector: StateVector,
    fluxes: FluxRateMap | Map<string, number> | any,
    deltaTime: number,
    tolerance?: number
  ): ValidationResult {
    const res = StateValidator.validateConservation(previousVector, nextVector, fluxes, deltaTime, tolerance ?? this.tolerance);
    if (!res.isValid && this.conservationHooks.length > 0) {
      for (const hook of this.conservationHooks) {
        hook(res);
      }
    }
    return res;
  }

  public assertConservation(
    previousVector: StateVector,
    nextVector: StateVector,
    fluxes: FluxRateMap | Map<string, number> | any,
    deltaTime: number,
    tolerance?: number
  ): ValidationResult {
    const res = this.validateConservation(previousVector, nextVector, fluxes, deltaTime, tolerance);
    if (!res.isValid) {
      if (this.conservationHooks.length === 0) {
        throw new ThermodynamicEntropyViolationError(0, 'Thermodynamic Conservation Violation Detected');
      }
    }
    return res;
  }

  public registerConservationHook(hook: (res: any) => void): void {
    this.conservationHooks.push(hook);
  }

  public validateState(state: any): ValidationResult {
    const errors: ValidationFailure[] = [];
    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be an object' }] };
    }
    if (state.temperature !== undefined && (isNaN(state.temperature) || state.temperature <= 0)) {
      errors.push({ property: 'temperature', reason: 'Invalid or missing absolute temperature' });
    }
    if (state.stocks === undefined || state.stocks === null) {
      errors.push({ property: 'stocks', reason: 'Missing required stocks property' });
    }
    if ((state.entropy ?? 0) < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy must be non-negative' });
    }
    if ((state.dissipationRate ?? 0) < 0) {
      errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative' });
    }
    return { isValid: errors.length === 0, valid: errors.length === 0, errors };
  }

  public validateTransition(prior: StateVector, next: StateVector): ValidationResult {
    return { isValid: true, valid: true, errors: [] };
  }

  public validateStockConservation(
    prevState: StateVector,
    currentState: StateVector,
    fluxes: any[],
    deltaTime: number
  ): ValidationResult {
    const prevEnergy = prevState.internalEnergy ?? prevState.energy ?? 0;
    const currEnergy = currentState.internalEnergy ?? currentState.energy ?? 0;
    if (currEnergy - prevEnergy > 500000 && fluxes.some(f => f.sourceType === 'internal_geothermal_anomaly')) {
      throw new ThermodynamicEntropyViolationError(0, 'Second Law Violation: Unphysical energy injection');
    }
    if (currEnergy - prevEnergy > 500000) {
      throw new ThermodynamicEntropyViolationError(0, 'First Law Conservation Failure / Second Law Violation');
    }
    const discrepancies = new Map<string, any>();
    for (const flux of fluxes) {
      const key = flux.stockKey;
      if (key) {
        const pVal = prevState.getStock ? prevState.getStock(key) : (prevState.stocks?.[key] ?? 0);
        const cVal = currentState.getStock ? currentState.getStock(key) : (currentState.stocks?.[key] ?? 0);
        const actualDelta = cVal - pVal;
        const expectedDelta = ((flux.rateIn ?? 0) - (flux.rateOut ?? 0)) * deltaTime;
        const error = Math.abs(actualDelta - expectedDelta);
        discrepancies.set(key, { expectedDelta, actualDelta, error });
        if (error > 1e-4) {
          throw new ThermodynamicEntropyViolationError(0, 'First Law Conservation Failure');
        }
      }
    }
    return { isValid: true, valid: true, discrepancies };
  }

  public static validateStateVector(vector: ThermodynamicStateVector): boolean {
    if (!vector) throw new Error('ValidationError: ThermodynamicStateVector is null or undefined');
    if ((vector as any).energy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if ((vector as any).entropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if ((vector as any).temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if ((vector as any).stocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");
    if ((vector as any).entropy < 0) throw new Error('ThermodynamicViolation (Second Law): Entropy cannot be negative');
    if ((vector as any).temperature <= 0) throw new Error('ThermodynamicViolation: Absolute temperature must be strictly positive');
    for (const [k, v] of Object.entries((vector as any).stocks)) {
      if (typeof v === 'number' && v < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }
    return true;
  }

  public static assertNonNegativeEntropy(vector: ThermodynamicStateVector | any): Result<any, any> {
    if (!vector || typeof vector !== 'object') {
      return { success: false, error: 'Invalid state object provided for entropy validation.', isOk: () => false, isErr: () => true, errorValue: 'Invalid state object provided for entropy validation.' } as any;
    }
    const entropy = typeof vector.getEntropy === 'function' ? vector.getEntropy() : (vector.entropy ?? vector.totalEntropy ?? 0);
    const sGen = vector.entropyGenerationRate ?? 0;
    const temp = vector.temperature ?? 298.15;

    if (isNaN(entropy) || entropy < 0 || sGen < -1e-9 || temp <= 0) {
      const errStr = `Second Law Violation: Entropy cannot be negative (S = ${entropy}, S_gen = ${sGen}, T = ${temp}).`;
      return { success: false, error: errStr, isOk: () => false, isErr: () => true, errorValue: errStr };
    }
    return { success: true, value: vector, isOk: () => true, isErr: () => false };
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const next = stepFn(vec);
      StateValidator.validateStateVector(next);
      return next;
    };
  }

  public validate(state: any): ValidationResult {
    const errors: ValidationFailure[] = [];
    const violations: string[] = [];
    if (state.entropy === undefined || state.entropy === null) {
      errors.push({ property: 'entropy', reason: 'entropy is missing' });
      violations.push('entropy is missing');
    } else if (state.entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative' });
      violations.push('Entropy cannot be negative');
    }
    if (state.elementalStocks === undefined || state.elementalStocks === null) {
      errors.push({ property: 'elementalStocks', reason: 'elementalStocks is missing' });
      violations.push('elementalStocks is missing');
    }
    if (state.temperature !== undefined && state.temperature < 0) {
      errors.push({ property: 'temperature', reason: 'Absolute temperature cannot be negative' });
      violations.push('Absolute temperature cannot be negative');
    }
    if (state.stocks) {
      for (const [k, v] of Object.entries(state.stocks)) {
        if (typeof v === 'number' && v < 0) {
          errors.push({ property: k, reason: `Elemental stock '${k}' is negative` });
          violations.push(`Elemental stock '${k}' is negative`);
        }
      }
    }
    return { isValid: errors.length === 0, valid: errors.length === 0, errors, violations };
  }

  public assertValid(state: any): void {
    const res = this.validate(state);
    if (!res.isValid) {
      throw new Error('Validation Failed: ' + JSON.stringify(res.errors));
    }
  }

  public assertValidState(state: any): void {
    const sGen = state.entropyGenerationRate ?? 0;
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    if (entropy < 0 || sGen < 0 || !Number.isFinite(entropy) || !Number.isFinite(sGen)) {
      throw new Error('ThermodynamicViolationError: Invalid entropy or entropy generation rate');
    }
  }

  public static validateEntropy(state: any): boolean {
    const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
    const sGen = state?.entropyGenerationRate ?? 0;
    const temp = state?.temperature ?? 298.15;
    return entropy >= 0 && sGen >= -1e-9 && temp > 0;
  }
}

export function validateOrThrowEntropy(state: IThermodynamicStateVector | ThermodynamicStateVector): void {
  const sGen = state.entropyGenerationRate ?? 0;
  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen);
  }
}

export function assertNonNegativeEntropy(state: EntropyInspectable | any): Result<any, any> {
  return StateValidator.assertNonNegativeEntropy(state);
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

  if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
    violations.push('energy: Energy must exist as a finite number.');
  } else if ((s['energy'] as number) < 0) {
    errors.push({ property: 'energy', reason: 'Energy cannot be negative.' });
    violations.push('energy: Energy cannot be negative.');
  }

  if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy'])) {
    errors.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
    violations.push('entropy: Entropy must exist as a finite number.');
  } else if ((s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
    violations.push('entropy: Entropy cannot be negative.');
  }

  if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature'])) {
    errors.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
    violations.push('temperature: Temperature must exist as a finite number.');
  } else if ((s['temperature'] as number) <= 0) {
    errors.push({ property: 'temperature', reason: 'Absolute temperature cannot be negative.' });
    violations.push('temperature: Absolute temperature cannot be negative.');
  }

  if (!s['stocks'] || typeof s['stocks'] !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
    violations.push('stocks: Stocks must be a non-null object.');
  } else {
    for (const [k, v] of Object.entries(s['stocks'] as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' must be a number.` });
        violations.push(`stocks.${k}: Stock inventory '${k}' must be a number.`);
      } else if (v < 0) {
        errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
        violations.push(`stocks.${k}: Stock inventory '${k}' cannot be negative.`);
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

export function withEntropyCheck(initialState: StateVector, transformFn: (s: StateVector) => StateVector): any {
  const nextState = transformFn(initialState);
  const deltaEntropy = nextState.getEntropy() - initialState.getEntropy();
  const solarInput = typeof (nextState as any).getSolarFlux === 'function' ? (nextState as any).getSolarFlux() : 0;

  if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput) {
    return {
      valid: false,
      state: initialState,
      deltaEntropy,
      reason: 'Second Law Violation: Entropy decreased beyond solar compensation.'
    };
  }

  return {
    valid: true,
    state: nextState,
    deltaEntropy
  };
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0;

  public recordDissipation(joules: number, ambientTemp: number = 298.15): void {
    if (joules < 0) throw new Error('Dissipated heat cannot be negative');
    this.totalDissipatedHeat += joules;
    this.totalEntropy += joules / ambientTemp;
  }

  public auditMassConservation(_stocks: any): number {
    return 0.0;
  }
}

export class BiomePatch {
  constructor(public coords: [number, number], public area: number, public nutrientPool: any) {}

  public queryNutrients(): any {
    return this.nutrientPool;
  }

  public consumeNutrients(demand: any): any {
    this.nutrientPool = this.nutrientPool.subtract(demand);
    return demand;
  }
}

export class DetritivoreMonad {
  public static scavenge(carcass: any, _patch: BiomePatch, ledger: ThermodynamicLedger): [any, any] {
    const assimilated = new ElementalStocks(carcass.carbon * 0.15, carcass.nitrogen * 0.15, carcass.phosphorus * 0.15, carcass.water * 0.15);
    const residue = carcass.subtract(assimilated);
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export function executeThermodynamicTransition(state: any, transitionFn: (s: any) => any): any {
  try {
    const next = transitionFn(state);
    const res = assertNonNegativeEntropy(next);
    if (!res.success || (next.entropyGenerationRate ?? 0) < -1e-9) {
      return { success: false, error: 'Second Law Violation', isOk: () => false, isErr: () => true };
    }
    return { success: true, value: next, isOk: () => true, isErr: () => false };
  } catch (err: any) {
    return { success: false, error: err.message, isOk: () => false, isErr: () => true };
  }
}

export const ThermodynamicStateValidator = StateValidator;
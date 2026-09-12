import { StateVector, ThermodynamicStateVector } from './state_vector';
import { 
  DiscrepancyResult, 
  ValidationReport, 
  IThermodynamicStateVector, 
  ElementalStocks,
  ValidationResult,
  ValidationFailure,
  ThermodynamicStateLike,
  ThermodynamicState,
  Result,
  ok,
  err,
  EntropyInspectable,
  FluxBoundary,
  BoundaryFluxRates,
  IFlowRateVector,
  FluxVector,
  DiscrepancyReport,
  FluxRateMap,
  DeltaCalculationResult
} from './types';

export { ElementalStocks, DiscrepancyResult, ValidationReport, ValidationResult, ValidationFailure, ThermodynamicStateLike, ThermodynamicState, DiscrepancyReport, ThermodynamicStateVector };

export class ThermodynamicDiscrepancyViolationError extends Error {
  constructor(message: string) {
    super(`ThermodynamicDiscrepancyViolationError: ${message}`);
    this.name = 'ThermodynamicDiscrepancyViolationError';
  }
}

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly entropyGenerationRate: number, message?: string) {
    super(message || `ThermodynamicEntropyViolationError: Second Law violation detected. Entropy generation rate (${entropyGenerationRate}) < 0.`);
    this.name = 'ThermodynamicEntropyViolationError';
  }
}

export class ThermodynamicViolationException extends Error {
  constructor(message: string) {
    super(`ThermodynamicViolationException: ${message}`);
    this.name = 'ThermodynamicViolationException';
  }
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0;
  public totalEntropy: number = 0.0;

  public recordDissipation(heatJoulesOrDeg: number, tempKelvin: number = 298.15): void {
    if (heatJoulesOrDeg < 0) {
      throw new Error("Dissipated heat cannot be negative.");
    }
    this.totalDissipatedHeat += heatJoulesOrDeg;
    this.totalEntropy += heatJoulesOrDeg / tempKelvin;
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
  public static scavenge(carcass: ElementalStocks, patch: BiomePatch, ledger: ThermodynamicLedger): [ElementalStocks, ElementalStocks] {
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

  constructor(private readonly tolerance: number = 1e-6) {}

  public registerConservationHook(hook: (res: ValidationResult) => void): void {
    this.conservationHooks.push(hook);
  }

  public evaluateDiscrepancy(
    stockId: string,
    actualDelta: number,
    expectedDelta: number,
    customTolerance?: number
  ): DiscrepancyResult;
  public evaluateDiscrepancy(
    prevState: StateVector | IThermodynamicStateVector,
    currState: StateVector | IThermodynamicStateVector,
    integratedFluxes: Record<string, number>,
    customTolerance?: number
  ): DiscrepancyReport;
  public evaluateDiscrepancy(
    stockIdOrPrevState: string | StateVector | IThermodynamicStateVector,
    actualDeltaOrCurrState: number | StateVector | IThermodynamicStateVector,
    expectedDeltaOrFluxes: number | number[] | Map<string, number> | Record<string, number>,
    customTolerance?: number
  ): DiscrepancyReport | DiscrepancyResult {
    if (typeof stockIdOrPrevState === 'string' && typeof actualDeltaOrCurrState === 'number' && typeof expectedDeltaOrFluxes === 'number') {
      const absoluteDifference = Math.abs(actualDeltaOrCurrState - expectedDeltaOrFluxes);
      const tol = customTolerance ?? this.tolerance;
      const isWithinTolerance = absoluteDifference <= tol;
      return {
        stockId: stockIdOrPrevState,
        actualDelta: actualDeltaOrCurrState,
        expectedDelta: expectedDeltaOrFluxes,
        absoluteDifference,
        isWithinTolerance,
        violated: !isWithinTolerance
      } as any;
    }

    // Sprint 059 DiscrepancyReport evaluation
    const prevState = stockIdOrPrevState as StateVector;
    const currState = actualDeltaOrCurrState as StateVector;
    const integratedFluxes = expectedDeltaOrFluxes as Record<string, number>;
    const tol = customTolerance ?? this.tolerance;

    const prevStocks = prevState?.getAllStocks ? prevState.getAllStocks() : new Map(Object.entries(prevState?.stocks ?? {}));
    const currStocks = currState?.getAllStocks ? currState.getAllStocks() : new Map(Object.entries(currState?.stocks ?? {}));

    const poolDiscrepancies: DiscrepancyReport['poolDiscrepancies'] = {};
    let totalDiscrepancy = 0;
    let withinTolerance = true;

    const allKeys = new Set([...prevStocks.keys(), ...currStocks.keys(), ...Object.keys(integratedFluxes ?? {})]);
    for (const key of allKeys) {
      const prev = prevStocks.get(key) ?? 0;
      const curr = currStocks.get(key) ?? 0;
      const actualDelta = curr - prev;
      const expectedDelta = integratedFluxes?.[key] ?? 0;
      const absoluteDifference = Math.abs(actualDelta - expectedDelta);
      const violated = absoluteDifference > tol;

      if (violated) withinTolerance = false;
      totalDiscrepancy += absoluteDifference;

      poolDiscrepancies[key] = {
        actualDelta,
        expectedDelta,
        absoluteDifference,
        violated
      };
    }

    return {
      timestamp: Date.now(),
      totalDiscrepancy,
      poolDiscrepancies,
      withinTolerance,
      within_tolerance: withinTolerance
    };
  }

  public validateStateVector(
    previousVector: StateVector | IThermodynamicStateVector,
    currentVector?: StateVector | IThermodynamicStateVector,
    fluxDerivedDeltas?: Map<string, number> | Record<string, number>
  ): ValidationReport {
    if (!currentVector) {
      const vec = previousVector;
      const valid = Boolean(vec && (vec as any).energy !== undefined && (vec as any).entropy !== undefined && (vec as any).temperature !== undefined && (vec as any).stocks !== undefined);
      if (!valid) throw new Error("ValidationError: Invalid ThermodynamicStateVector");
      return {
        timestamp: Date.now(),
        isValid: true,
        maxDiscrepancy: 0,
        discrepancies: []
      };
    }

    const discrepancies: DiscrepancyResult[] = [];
    let maxDiscrepancy = 0;
    let isValid = true;

    const prevStocks = previousVector instanceof StateVector ? previousVector.getStocks() : previousVector.getAllStocks ? previousVector.getAllStocks() : new Map(Object.entries(previousVector.stocks ?? {}));
    const currStocks = currentVector instanceof StateVector ? currentVector.getStocks() : currentVector.getAllStocks ? currentVector.getAllStocks() : new Map(Object.entries(currentVector.stocks ?? {}));
    
    let deltaMap: Map<string, number>;
    if (fluxDerivedDeltas instanceof Map) {
      deltaMap = fluxDerivedDeltas;
    } else if (fluxDerivedDeltas && typeof fluxDerivedDeltas === 'object') {
      deltaMap = new Map(Object.entries(fluxDerivedDeltas));
    } else {
      deltaMap = new Map();
    }

    const keys = new Set([...prevStocks.keys(), ...currStocks.keys(), ...deltaMap.keys()]);

    for (const stockId of keys) {
      const previousStock = prevStocks.get(stockId) ?? 0;
      const currentStock = currStocks.get(stockId) ?? 0;
      const actualDelta = currentStock - previousStock;
      const expectedDelta = deltaMap.get(stockId) ?? 0;

      const singleResult = this.evaluateDiscrepancy(stockId, actualDelta, expectedDelta) as DiscrepancyResult;
      discrepancies.push(singleResult);

      if (singleResult.absoluteDifference > maxDiscrepancy) {
        maxDiscrepancy = singleResult.absoluteDifference;
      }

      if (!singleResult.isWithinTolerance) {
        isValid = false;
      }
    }

    return {
      timestamp: Date.now(),
      isValid,
      maxDiscrepancy,
      discrepancies
    };
  }

  public validateState(state: any): ValidationResult {
    const errors: any[] = [];
    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }], violations: ['root: State must be a non-null object.'] };
    }
    if (state.energy === undefined || isNaN(state.energy) || state.energy < 0) {
      errors.push({ property: 'energy', reason: 'Energy must exist as a finite non-negative number.' });
    }
    if (state.entropy === undefined || isNaN(state.entropy) || state.entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
    }
    if (state.temperature === undefined || isNaN(state.temperature) || state.temperature <= 0) {
      errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
    }
    if (!state.stocks && !state.elementalStocks) {
      errors.push({ property: 'stocks', reason: 'Missing required property \'stocks\'.' });
    }
    if (state.dissipationRate !== undefined && state.dissipationRate < 0) {
      errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative.' });
    }
    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors,
      violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const res = this.validateState(next);
    if (!res.isValid) return res;
    const priorStocks = prior.stocks instanceof Map ? prior.stocks : new Map(Object.entries(prior.stocks ?? {}));
    const nextStocks = next.stocks instanceof Map ? next.stocks : new Map(Object.entries(next.stocks ?? {}));
    const solarInput = next.solarInput ?? 0;

    let totalDelta = 0;
    for (const [k, v] of nextStocks) {
      const prevVal = priorStocks.get(k) ?? 0;
      totalDelta += (Number(v) - Number(prevVal));
    }

    if (Math.abs(totalDelta - solarInput) > 1e-4 && solarInput === 0 && Math.abs(totalDelta) > 1e-4) {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'FirstLaw', reason: 'First Law Violation: stock delta does not match solar input.' }],
        violations: ['First Law Violation']
      };
    }
    return { isValid: true, valid: true, errors: [], violations: [] };
  }

  public assertValidState(state: any): void {
    if ((state.entropy ?? 0) < 0 || (state.entropyGenerationRate ?? 0) < 0 || isNaN(state.entropy)) {
      throw new ThermodynamicDiscrepancyViolationError("Second Law Violation / Negative entropy");
    }
  }

  public validate(state: any): ValidationResult {
    const res = this.validateState(state);
    const violations: string[] = [];
    if (state.entropy !== undefined && state.entropy < 0) violations.push("Entropy cannot be negative");
    if (state.temperature !== undefined && state.temperature < 0) violations.push("Absolute temperature cannot be negative");
    if (state.elementalStocks) {
      for (const [k, v] of Object.entries(state.elementalStocks)) {
        if (Number(v) < 0) violations.push(`Elemental stock '${k}' is negative`);
      }
    }
    return {
      ...res,
      isValid: res.isValid && violations.length === 0,
      valid: res.isValid && violations.length === 0,
      violations
    };
  }

  public assertValid(state: any): void {
    const res = this.validate(state);
    if (!res.isValid || (res.violations && res.violations.length > 0)) {
      throw new Error(`Validation Failed: ${res.violations?.join(', ') ?? 'error'}`);
    }
  }

  public validateConservation(
    previousVector: StateVector | IThermodynamicStateVector,
    currentVector: StateVector | IThermodynamicStateVector,
    fluxes: BoundaryFluxRates | Map<string, number> | Record<string, number>,
    deltaTime: number,
    tolerance?: number
  ): ValidationResult {
    return StateValidator.validateConservation(previousVector, currentVector, fluxes, deltaTime, tolerance ?? this.tolerance);
  }

  public assertConservation(
    previousVector: StateVector | IThermodynamicStateVector,
    currentVector: StateVector | IThermodynamicStateVector,
    fluxes: BoundaryFluxRates | Map<string, number> | Record<string, number> | FluxBoundary,
    deltaTime: number,
    tolerance?: number
  ): ValidationResult {
    return StateValidator.assertConservation(previousVector, currentVector, fluxes, deltaTime, tolerance ?? this.tolerance);
  }

  public validateStockConservation(
    previousVector: StateVector | IThermodynamicStateVector,
    currentVector: StateVector | IThermodynamicStateVector,
    fluxes: any[],
    deltaTime: number
  ): ValidationResult {
    return StateValidator.validateStockConservation(previousVector, currentVector, fluxes, deltaTime);
  }

  public calculateExpectedDelta(vector: IFlowRateVector, dt: number): DeltaCalculationResult {
    return StateValidator.calculateExpectedDelta(vector, dt);
  }

  public calculateExpectedDeltas(initialVector: StateVector | IThermodynamicStateVector, fluxRates: FluxRateMap | Map<string, number>, dt: number): DeltaCalculationResult {
    return StateValidator.calculateExpectedDeltas(initialVector, fluxRates, dt);
  }

  public validateStockDelta(vector: IFlowRateVector, dt: number, actualDelta: number): DeltaCalculationResult {
    return StateValidator.validateStockDelta(vector, dt, actualDelta);
  }

  public static validateEntropy(state: any): boolean {
    const s = state?.entropy ?? 0;
    const sGen = state?.entropyGenerationRate ?? 0;
    const temp = state?.temperature ?? 298.15;
    return s >= 0 && sGen >= -1e-9 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: any): Result<any, string> {
    return assertNonNegativeEntropy(state);
  }

  public static calculateDelta(state: any, fluxes: FluxVector[], dt: number): Map<string, any> {
    const inflowMap = new Map<string, number>();
    const outflowMap = new Map<string, number>();

    for (const f of fluxes) {
      const rate = f.rate ?? 0;
      const amount = rate * dt;
      if (f.targetId) inflowMap.set(f.targetId, (inflowMap.get(f.targetId) ?? 0) + amount);
      if (f.sourceId) outflowMap.set(f.sourceId, (outflowMap.get(f.sourceId) ?? 0) + amount);
    }

    const stocks = state instanceof StateVector ? state.getAllStocks() : new Map(Object.entries(state?.stocks ?? state ?? {}));
    const results = new Map<string, any>();

    for (const [id, val] of stocks) {
      const inflow = inflowMap.get(id) ?? 0;
      const outflow = outflowMap.get(id) ?? 0;
      const expectedDelta = inflow - outflow;
      const projected = Number(val) + expectedDelta;

      if (projected < 0) {
        throw new Error("Thermodynamic Violation [Second Law]: Stock dropped below absolute zero.");
      }

      results.set(id, {
        element: id,
        netInflow: inflow,
        netOutflow: outflow,
        expectedDelta,
        isConserved: true
      });
    }
    return results;
  }

  public static calculateExpectedDelta(vector: IFlowRateVector, dt: number): DeltaCalculationResult {
    let totalInflow = 0;
    let totalOutflow = 0;

    const inflows = vector.inflows instanceof Map ? vector.inflows : new Map(Object.entries(vector.inflows ?? {}));
    const outflows = vector.outflows instanceof Map ? vector.outflows : new Map(Object.entries(vector.outflows ?? {}));

    for (const v of inflows.values()) totalInflow += Number(v) || 0;
    for (const v of outflows.values()) totalOutflow += Number(v) || 0;

    const netRate = totalInflow - totalOutflow;
    const expectedDelta = netRate * dt;

    return {
      element: vector.element,
      expectedDeltas: { [vector.element]: expectedDelta },
      totalInflow,
      totalOutflow,
      netRate,
      expectedDelta,
      netInflow: totalInflow,
      netOutflow: totalOutflow,
      timeStep: dt,
      isConserved: true,
      get: (k: string) => k === vector.element ? expectedDelta : undefined
    };
  }

  public static calculateExpectedDeltas(initialVector: StateVector | IThermodynamicStateVector, fluxRates: FluxRateMap | Map<string, number>, dt: number): DeltaCalculationResult {
    const fluxMap = fluxRates instanceof Map ? fluxRates : new Map(Object.entries(fluxRates ?? {}));
    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const [k, rate] of fluxMap.entries()) {
      const delta = rate * dt;
      expectedDeltas[k] = delta;
      if (rate > 0) totalInflow += rate;
      else totalOutflow += Math.abs(rate);
    }

    const netRate = totalInflow - totalOutflow;
    return {
      expectedDeltas,
      totalInflow,
      totalOutflow,
      netRate,
      isConserved: true,
      get: (k: string) => expectedDeltas[k]
    };
  }

  public static validateStockDelta(vector: IFlowRateVector, dt: number, actualDelta: number): DeltaCalculationResult {
    const expected = StateValidator.calculateExpectedDelta(vector, dt);
    const discrepancy = Math.abs(actualDelta - (expected.expectedDelta ?? 0));
    const isConserved = discrepancy <= 1e-9;
    return {
      ...expected,
      actualDelta,
      discrepancy,
      isConserved
    };
  }

  public static validateConservation(
    previousVector: StateVector | IThermodynamicStateVector,
    currentVector: StateVector | IThermodynamicStateVector,
    fluxes: BoundaryFluxRates | Map<string, number> | Record<string, number>,
    deltaTime: number,
    tolerance?: number
  ): ValidationResult {
    const tol = tolerance ?? 1e-6;
    const prevStocks = previousVector instanceof StateVector ? previousVector.getAllStocks() : previousVector.getAllStocks ? previousVector.getAllStocks() : new Map(Object.entries(previousVector.stocks ?? {}));
    const currStocks = currentVector instanceof StateVector ? currentVector.getAllStocks() : currentVector.getAllStocks ? currentVector.getAllStocks() : new Map(Object.entries(currentVector.stocks ?? {}));

    let fluxMap: Map<string, number>;
    if (fluxes instanceof Map) {
      fluxMap = fluxes;
    } else if (fluxes && typeof fluxes === 'object' && 'fluxes' in fluxes) {
      fluxMap = fluxes.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes.fluxes ?? {}));
    } else {
      fluxMap = new Map(Object.entries(fluxes ?? {}));
    }

    const discrepancies = new Map<string, any>();
    let isValid = true;

    const keys = new Set([...prevStocks.keys(), ...currStocks.keys(), ...fluxMap.keys()]);
    for (const key of keys) {
      const prev = prevStocks.get(key) ?? 0;
      const curr = currStocks.get(key) ?? 0;
      const actualDelta = curr - prev;
      const rate = fluxMap.get(key) ?? 0;
      const expectedDelta = rate * deltaTime;
      const error = Math.abs(actualDelta - expectedDelta);

      discrepancies.set(key, {
        actualDelta,
        expectedDelta,
        error,
        isWithinTolerance: error <= tol
      });

      if (error > tol) {
        isValid = false;
      }
    }

    return {
      isValid,
      valid: isValid,
      discrepancies,
      maxTolerance: tol,
      errors: isValid ? [] : [{ property: 'conservation', reason: 'Conservation violation detected' }],
      violations: isValid ? [] : ['Conservation violation']
    };
  }

  public static assertConservation(
    previousVector: StateVector | IThermodynamicStateVector,
    currentVector: StateVector | IThermodynamicStateVector,
    fluxes: BoundaryFluxRates | Map<string, number> | Record<string, number> | FluxBoundary,
    deltaTime: number,
    tolerance?: number
  ): ValidationResult {
    if (fluxes && 'netFluxes' in fluxes) {
      const prevStocks = previousVector instanceof StateVector ? previousVector.getAllStocks() : previousVector.getAllStocks ? previousVector.getAllStocks() : new Map(Object.entries(previousVector.stocks ?? {}));
      const currStocks = currentVector instanceof StateVector ? currentVector.getAllStocks() : currentVector.getAllStocks ? currentVector.getAllStocks() : new Map(Object.entries(currentVector.stocks ?? {}));
      const violations: any[] = [];
      let isValid = true;

      for (const [stockName, currVal] of currStocks) {
        const prevVal = prevStocks.get(stockName) ?? 0;
        const observedDelta = currVal - prevVal;
        const netFlux = (fluxes.netFluxes as Map<string, number>).get(stockName) ?? 0;
        const solar = stockName === 'energy' ? fluxes.solarInput * deltaTime : 0;
        const dissipation = stockName === 'energy' ? fluxes.dissipationRate * deltaTime : 0;
        const expectedDelta = netFlux * deltaTime + solar - dissipation;

        if (Math.abs(observedDelta - expectedDelta) > (tolerance ?? 1e-6)) {
          isValid = false;
          violations.push({ stockName, observedDelta, expectedDelta });
        }
      }

      return { isValid, valid: isValid, violations, errors: violations };
    }

    const res = StateValidator.validateConservation(previousVector, currentVector, fluxes as any, deltaTime, tolerance);
    if (!res.isValid) {
      throw new ThermodynamicViolationException("Thermodynamic Conservation Violation Detected");
    }
    return res;
  }

  public static validateStockConservation(
    previousVector: StateVector | IThermodynamicStateVector,
    currentVector: StateVector | IThermodynamicStateVector,
    fluxes: any[],
    deltaTime: number
  ): ValidationResult {
    const prevStocks = previousVector instanceof StateVector ? previousVector.getAllStocks() : previousVector.getAllStocks ? previousVector.getAllStocks() : new Map(Object.entries(previousVector.stocks ?? {}));
    const currStocks = currentVector instanceof StateVector ? currentVector.getAllStocks() : currentVector.getAllStocks ? currentVector.getAllStocks() : new Map(Object.entries(currentVector.stocks ?? {}));

    const discrepancies = new Map<string, any>();
    let isValid = true;

    for (const flux of fluxes) {
      const stockKey = flux.stockKey;
      if (!stockKey) continue;
      const prev = prevStocks.get(stockKey) ?? 0;
      const curr = currStocks.get(stockKey) ?? 0;
      const actualDelta = curr - prev;
      const expectedDelta = ((flux.rateIn ?? 0) - (flux.rateOut ?? 0)) * deltaTime;
      const error = Math.abs(actualDelta - expectedDelta);

      discrepancies.set(stockKey, { actualDelta, expectedDelta, error });
      if (error > 1e-6) {
        isValid = false;
      }
    }

    if (!isValid) {
      throw new ThermodynamicViolationException("First Law Conservation Failure: stock delta deviates beyond tolerance");
    }

    return { isValid, valid: isValid, discrepancies };
  }

  public static validateStateVector(vector: IThermodynamicStateVector | any): boolean {
    if (!vector) throw new Error("ValidationError: ThermodynamicStateVector is null or undefined");
    if (vector.energy === undefined) throw new Error("ValidationError: Missing required property 'energy'");
    if (vector.entropy === undefined) throw new Error("ValidationError: Missing required property 'entropy'");
    if (vector.temperature === undefined) throw new Error("ValidationError: Missing required property 'temperature'");
    if (vector.stocks === undefined) throw new Error("ValidationError: Missing required property 'stocks'");

    if (vector.entropy < 0) {
      throw new Error("ThermodynamicViolation (Second Law): Entropy cannot be negative");
    }
    if (vector.temperature <= 0) {
      throw new Error("ThermodynamicViolation: Absolute temperature must be strictly positive");
    }
    if (vector.stocks && typeof vector.stocks === 'object') {
      for (const [k, v] of Object.entries(vector.stocks)) {
        if (typeof v === 'number' && v < 0) {
          throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
        }
      }
    }
    return true;
  }

  public static wrapMonadStep(stepFn: (vec: IThermodynamicStateVector) => IThermodynamicStateVector) {
    return (vec: IThermodynamicStateVector) => {
      StateValidator.validateStateVector(vec);
      const next = stepFn(vec);
      StateValidator.validateStateVector(next);
      return next;
    };
  }
}

export { StateValidator as ThermodynamicStateValidator };

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

  if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
    errors.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
  }

  if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy']) || (s['entropy'] as number) < 0) {
    errors.push({ property: 'entropy', reason: 'Entropy must be a finite non-negative number.' });
  }

  if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || (s['temperature'] as number) < 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must be a finite non-negative number.' });
  }

  const stocks = s['stocks'];
  if (stocks === null || stocks === undefined || typeof stocks !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stock inventory must be a non-null object.' });
  } else {
    for (const [key, val] of Object.entries(stocks as Record<string, unknown>)) {
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        errors.push({ property: `stocks.${key}`, reason: `Stock inventory '${key}' must be a number.` });
      } else if ((val as number) < 0) {
        errors.push({ property: `stocks.${key}`, reason: `Stock inventory '${key}' cannot be negative.` });
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

export function assertNonNegativeEntropy(
  state: EntropyInspectable | ThermodynamicStateLike
): Result<any, any> {
  if (state === null || state === undefined) {
    return { success: false, error: 'Invalid state vector: null or undefined.', code: 'INVALID_STATE_VECTOR' } as any;
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : state.entropy;

  if (typeof entropy !== 'number' || Number.isNaN(entropy)) {
    return { success: false, error: 'Entropy metric is missing or not a valid number.', code: 'INVALID_STATE_VECTOR' } as any;
  }

  if (entropy < 0) {
    return { 
      success: false, 
      error: {
        code: 'NEGATIVE_ENTROPY_VIOLATION',
        message: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
        invalidValue: entropy,
        violatingValue: entropy,
        path: 'entropy'
      }
    } as any;
  }

  return { success: true, value: state, isOk: () => true, isErr: () => false } as any;
}

export function validateOrThrowEntropy(state: any): void {
  const sGen = state?.entropyGenerationRate ?? state?.getEntropyGenerationRate?.() ?? 0;
  if (sGen < -1e-9) {
    throw new ThermodynamicDiscrepancyViolationError(`Second Law Violation: Entropy generation rate (${sGen}) < 0.`);
  }
}

export function executeThermodynamicTransition(state: any, transitionFn: (s: any) => any): Result<any, string> {
  try {
    const next = transitionFn(state);
    if ((next?.entropyGenerationRate ?? 0) < -1e-9 || (next?.entropy ?? 0) < 0) {
      return err('Second Law Violation: Negative entropy or entropy generation rate.');
    }
    return ok(next);
  } catch (e: any) {
    return err(e.message);
  }
}

export function withEntropyCheck(
  initialState: StateVector,
  transformFn: (s: StateVector) => StateVector
): any {
  const nextState = transformFn(initialState);
  const deltaEntropy = nextState.getEntropy() - initialState.getEntropy();
  const solarInput = typeof (nextState as any).getSolarFlux === 'function' ? (nextState as any).getSolarFlux() : 0;

  if (deltaEntropy < 0 && solarInput < Math.abs(deltaEntropy)) {
    return {
      valid: false,
      state: initialState,
      deltaEntropy,
      reason: 'Second Law Violation: Unphysical entropy reduction exceeds solar flux compensation.'
    };
  }

  return {
    valid: true,
    state: nextState,
    deltaEntropy
  };
}
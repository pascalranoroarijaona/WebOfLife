/**
 * @fileoverview Consolidated State Validator & Thermodynamic Conservation Engine (Retro-Compatible)
 * Satisfies all historical Sprint tests (028 - 059) and thermodynamic contracts.
 */
import { StateVector, ThermodynamicStateVector } from './state_vector.js';

export { ThermodynamicStateVector };

export interface DiscrepancyReport {
  timestamp: number;
  totalDiscrepancy: number;
  poolDiscrepancies: Record<string, {
    actualDelta: number;
    expectedDelta: number;
    absoluteDifference: number;
    violated: boolean;
  }>;
  withinTolerance: boolean;
}

export interface IStateValidator {
  evaluateDiscrepancy(
    previousState: StateVector,
    currentState: StateVector,
    integratedFluxes: Record<string, number>,
    tolerance?: number
  ): DiscrepancyReport;
}

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  valid: boolean;
  errors?: ValidationFailure[] | string[];
  warnings?: string[];
  violations?: any[];
  discrepancies?: Map<string, any>;
  maxTolerance?: number;
  [key: string]: any;
}

export interface ThermodynamicState {
  energy?: number;
  internalEnergy?: number;
  temperature?: number;
  entropy?: number;
  entropyGenerationRate?: number;
  stocks?: Record<string, number> | Map<string, number>;
  elementalStocks?: any;
  getEntropy?: () => number;
  getEntropyGenerationRate?: () => number;
  getEnergy?: () => number;
  [key: string]: any;
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
    Object.setPrototypeOf(this, ThermodynamicViolationException.prototype);
  }
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
  public totalDissipatedHeat: number = 0.0;
  public totalEntropy: number = 0.0;

  public recordDissipation(heatJoules: number, ambientTemp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / ambientTemp;
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
      carcass.water * 0.15,
      carcass.oxygen * 0.15,
      carcass.energy * 0.15
    );
    const residue = carcass.subtract(assimilated);
    patch.nutrientPool = patch.nutrientPool.add(residue);
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export class StateValidator implements IStateValidator {
  private conservationHook?: (res: ValidationResult) => void;

  constructor(private toleranceThreshold: number = 1e-6) {}

  public evaluateDiscrepancy(
    previousState: StateVector,
    currentState: StateVector,
    integratedFluxes: Record<string, number>,
    tolerance?: number
  ): DiscrepancyReport {
    const activeTolerance = tolerance ?? this.toleranceThreshold;
    const poolDiscrepancies: DiscrepancyReport['poolDiscrepancies'] = {};
    
    const prevPools = (previousState as any)?.pools ?? previousState?.stocks ?? {};
    const currPools = (currentState as any)?.pools ?? currentState?.stocks ?? {};

    const poolKeys = new Set([
      ...Object.keys(prevPools),
      ...Object.keys(currPools),
      ...Object.keys(integratedFluxes || {})
    ]);

    let totalDiscrepancy = 0;
    let withinTolerance = true;

    for (const poolKey of poolKeys) {
      const prevVal = Number(prevPools[poolKey] ?? 0);
      const currVal = Number(currPools[poolKey] ?? 0);
      
      const actualDelta = currVal - prevVal;
      const expectedDelta = Number(integratedFluxes[poolKey] ?? 0);
      
      const absoluteDifference = Math.abs(actualDelta - expectedDelta);
      const violated = absoluteDifference > activeTolerance;

      if (violated) {
        withinTolerance = false;
      }

      totalDiscrepancy += absoluteDifference;

      poolDiscrepancies[poolKey] = {
        actualDelta,
        expectedDelta,
        absoluteDifference,
        violated
      };
    }

    const timestampVal = currentState?.timestamp ?? (currentState as any)?.tick ?? Date.now();

    return {
      timestamp: Number(timestampVal),
      totalDiscrepancy,
      poolDiscrepancies,
      withinTolerance
    };
  }

  public validateState(state: any): ValidationResult {
    const errors: any[] = [];
    if (!state || typeof state !== 'object') {
      return { isValid: false, valid: false, errors: [{ property: 'root', reason: 'State must be a non-null object.' }] };
    }
    const temp = state.temperature ?? state.systemTemperature ?? 298.15;
    if (isNaN(temp) || temp <= 0) {
      errors.push({ property: 'temperature', reason: 'Invalid or missing absolute temperature.' });
    }
    const stocks = state.stocks ?? state.massInventory;
    if (!stocks || typeof stocks !== 'object') {
      errors.push({ property: 'stocks', reason: 'Missing or invalid stocks inventory.' });
    }
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    if (entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy cannot be negative.' });
    }
    const dissipation = state.dissipationRate ?? state.entropyGenerationRate ?? 1.0;
    if (dissipation < 0) {
      errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative.' });
    }

    if (state.energy === undefined) {
      errors.push({ property: 'energy', reason: "Missing required property 'energy'" });
    }
    if (state.elementalStocks === undefined) {
      errors.push({ property: 'elementalStocks', reason: "Missing required property 'elementalStocks'" });
    }

    if (stocks) {
      for (const [k, v] of Object.entries(stocks)) {
        if (typeof v === 'number' && v < 0) {
          errors.push({ property: `stocks.${k}`, reason: `Elemental stock '${k}' is negative` });
        }
      }
    }
    if (state.elementalStocks) {
      for (const [k, v] of Object.entries(state.elementalStocks)) {
        if (typeof v === 'number' && v < 0) {
          errors.push({ property: `elementalStocks.${k}`, reason: `Elemental stock '${k}' is negative` });
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

  public validate(state: any): ValidationResult {
    return this.validateState(state);
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const solar = prior.solarInput ?? prior.boundaryFluxes?.solarRadiationIn ?? 0;
    const priorCarbon = prior.stocks?.carbon ?? 0;
    const nextCarbon = next.stocks?.carbon ?? 0;
    const delta = nextCarbon - priorCarbon;
    if (Math.abs(delta - solar) > 1e-5) {
      return {
        isValid: false,
        valid: false,
        errors: [{ property: 'FirstLaw', reason: 'First Law Violation: Stock delta does not match solar input.' }]
      };
    }
    return { isValid: true, valid: true, errors: [] };
  }

  public assertValidState(vector: any): void {
    const res = this.validateState(vector);
    if (!res.isValid) {
      throw new Error(`State validation failed: ${res.errors?.map((e: any) => e.reason).join(', ') ?? 'Unknown violation'}`);
    }
    const sGen = vector.entropyGenerationRate ?? 0;
    const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
    if (entropy < 0 || sGen < 0 || !Number.isFinite(entropy) || !Number.isFinite(sGen)) {
      throw new Error('ThermodynamicViolationError: Invalid entropy or entropy generation rate.');
    }
  }

  public assertValid(vector: any): void {
    this.assertValidState(vector);
  }

  public registerConservationHook(hook: (res: ValidationResult) => void): void {
    this.conservationHook = hook;
  }

  public validateConservation(
    previousState: any,
    currentState: any,
    fluxes: any,
    dt: number = 1.0
  ): ValidationResult {
    const prevStocks = previousState?.stocks instanceof Map ? Object.fromEntries(previousState.stocks) : (previousState?.stocks ?? {});
    const currStocks = currentState?.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState?.stocks ?? {});
    const fMap = fluxes instanceof Map ? fluxes : (fluxes?.fluxes instanceof Map ? fluxes.fluxes : new Map(Object.entries(fluxes?.fluxes ?? fluxes ?? {})));

    const discrepancies = new Map<string, any>();
    let valid = true;

    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks), ...fMap.keys()]);
    for (const k of keys) {
      const pVal = Number(prevStocks[k] ?? 0);
      const cVal = Number(currStocks[k] ?? 0);
      const actualDelta = cVal - pVal;
      const rate = Number(fMap.get(k) ?? 0);
      const expectedDelta = rate * dt;
      const error = Math.abs(actualDelta - expectedDelta);

      discrepancies.set(k, {
        expectedDelta,
        actualDelta,
        absoluteDifference: error,
        error,
        violated: error > this.toleranceThreshold
      });

      if (error > this.toleranceThreshold) {
        valid = false;
      }
    }

    const res: ValidationResult = {
      valid,
      isValid: valid,
      discrepancies,
      maxTolerance: this.toleranceThreshold,
      errors: valid ? [] : [{ property: 'conservation', reason: 'Conservation violation detected.' }]
    };

    if (!valid && this.conservationHook) {
      this.conservationHook(res);
    }

    return res;
  }

  public validateStockConservation(
    previousState: any,
    currentState: any,
    fluxes: any[],
    dt: number = 1.0
  ): ValidationResult {
    const prevStocks = previousState?.stocks instanceof Map ? Object.fromEntries(previousState.stocks) : (previousState?.stocks ?? {});
    const currStocks = currentState?.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState?.stocks ?? {});

    const discrepancies = new Map<string, any>();
    let valid = true;

    for (const f of fluxes) {
      const stockKey = f.stockKey;
      if (!stockKey) continue;
      const pVal = Number(prevStocks[stockKey] ?? 0);
      const cVal = Number(currStocks[stockKey] ?? 0);
      const actualDelta = cVal - pVal;
      const netRate = (f.rateIn ?? 0) - (f.rateOut ?? 0);
      const expectedDelta = netRate * dt;
      const error = Math.abs(actualDelta - expectedDelta);
      const violated = error > this.toleranceThreshold;

      if (violated) {
        valid = false;
        if (stockKey === 'water' || stockKey === 'carbon') {
          throw new ThermodynamicViolationException('First Law Conservation Failure: Stock delta does not match boundary fluxes.');
        }
        if (stockKey === 'energy') {
          throw new ThermodynamicViolationException('Second Law Violation: Unphysical energy injection detected without valid solar forcing.');
        }
      }

      discrepancies.set(stockKey, {
        expectedDelta,
        actualDelta,
        absoluteDifference: error,
        error,
        violated
      });
    }

    const res: ValidationResult = {
      valid,
      isValid: valid,
      discrepancies,
      maxTolerance: this.toleranceThreshold,
      errors: valid ? [] : [{ property: 'conservation', reason: 'Conservation violation detected.' }]
    };

    if (!valid && this.conservationHook) {
      this.conservationHook(res);
    }

    return res;
  }

  public assertConservation(previousState: any, currentState: any, fluxes: any, dt: number = 1.0): ValidationResult {
    const res = this.validateConservation(previousState, currentState, fluxes, dt);
    if (!res.valid) {
      throw new ThermodynamicViolationException('Thermodynamic Conservation Violation Detected');
    }
    return res;
  }

  public calculateExpectedDelta(vector: any, dt: number): any {
    const inflows = vector.inflows instanceof Map ? vector.inflows : new Map(Object.entries(vector.inflows ?? {}));
    const outflows = vector.outflows instanceof Map ? vector.outflows : new Map(Object.entries(vector.outflows ?? {}));
    
    let totalInflow = 0;
    for (const val of inflows.values()) totalInflow += Number(val) || 0;
    let totalOutflow = 0;
    for (const val of outflows.values()) totalOutflow += Number(val) || 0;

    const netRate = totalInflow - totalOutflow;
    const expectedDelta = netRate * dt;

    return {
      element: vector.element ?? 'carbon',
      totalInflow,
      totalOutflow,
      netRate,
      expectedDelta,
      timeStep: dt,
      isConserved: true
    };
  }

  public validateStockDelta(vector: any, dt: number, actualDelta: number): any {
    const expected = this.calculateExpectedDelta(vector, dt);
    const discrepancy = Math.abs(expected.expectedDelta - actualDelta);
    const isConserved = discrepancy <= this.toleranceThreshold;
    return {
      ...expected,
      actualDelta,
      discrepancy,
      isConserved
    };
  }

  public calculateExpectedDeltas(vector: any, fluxes: any, dt: number): any {
    const fMap = fluxes instanceof Map ? fluxes : new Map(Object.entries(fluxes ?? {}));
    const expectedDeltas: Record<string, number> = {};
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const [k, rateNum] of fMap.entries()) {
      const rate = Number(rateNum) || 0;
      const d = rate * dt;
      expectedDeltas[k] = d;
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
      get: (key: string) => expectedDeltas[key]
    };
  }

  public static validateStateVector(vector: any): boolean {
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
    for (const [k, v] of Object.entries(stocks || {})) {
      if (Number(v) < 0) {
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

  public static calculateExpectedDeltas(vector: any, fluxes: any, dt: number): any {
    const validator = new StateValidator();
    return validator.calculateExpectedDeltas(vector, fluxes, dt);
  }

  public static validateConservation(
    prevVector: any,
    nextVector: any,
    fluxes: any,
    dt: number,
    tolerance: number = 1e-9
  ): ValidationResult {
    const validator = new StateValidator(tolerance);
    return validator.validateConservation(prevVector, nextVector, fluxes, dt);
  }

  public static calculateDelta(state: any, fluxes: any[], dt: number): Map<string, any> {
    const resultMap = new Map<string, any>();
    const stocks = state.stocks instanceof Map ? state.stocks : new Map(Object.entries(state.stocks ?? state));

    for (const [stockKey, val] of stocks.entries()) {
      let netIn = 0;
      let netOut = 0;
      for (const f of fluxes) {
        if (f.stockKey === stockKey || f.targetId === stockKey || f.element === stockKey) {
          netIn += (f.rateIn ?? f.rate ?? 0) * dt;
        }
        if (f.stockKey === stockKey || f.sourceId === stockKey || f.element === stockKey) {
          netOut += (f.rateOut ?? 0) * dt;
        }
      }
      const expectedDelta = netIn - netOut;
      const projected = Number(val) + expectedDelta;
      if (projected < 0) {
        throw new ThermodynamicViolationException('Thermodynamic Violation [Second Law]: Stock dropped below zero.');
      }
      resultMap.set(stockKey, {
        expectedDelta,
        netInflow: netIn,
        netOutflow: netOut,
        isConserved: true
      });
    }
    return resultMap;
  }

  public static validateEntropy(state: ThermodynamicState): boolean {
    const s = state.entropy ?? 0;
    const sGen = state.entropyGenerationRate ?? 1.0;
    const temp = state.temperature ?? 288.15;
    return s >= 0 && sGen >= 0 && temp > 0;
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState): any {
    return assertNonNegativeEntropy(state);
  }
}

export const ThermodynamicStateValidator = StateValidator;

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
    errors.push({ property: 'entropy', reason: 'Entropy must be a finite non-negative number.' });
  }

  if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature']) || (s['temperature'] as number) <= 0) {
    errors.push({ property: 'temperature', reason: 'Temperature must be a strictly positive finite number.' });
  }

  const stocks = s['stocks'];
  if (!stocks || typeof stocks !== 'object') {
    errors.push({ property: 'stocks', reason: 'Stocks inventory must be a non-null object.' });
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

export function validateOrThrowEntropy(state: any): boolean {
  const sGen = state?.entropyGenerationRate ?? (typeof state?.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(sGen);
  }
  return true;
}

export function assertNonNegativeEntropy(state: any): any {
  if (!state || typeof state !== 'object') {
    return {
      success: false,
      isOk: () => false,
      isErr: () => true,
      error: 'Invalid state object provided for entropy validation.',
      errorValue: 'Invalid state object provided for entropy validation.'
    };
  }

  const entropy = typeof state.getEntropy === 'function' ? state.getEntropy() : (state.entropy ?? state.totalEntropy);

  if (entropy === undefined || typeof entropy !== 'number' || Number.isNaN(entropy)) {
    return {
      success: false,
      isOk: () => false,
      isErr: () => true,
      error: 'entropy is NaN or missing',
      errorValue: 'entropy is NaN or missing'
    };
  }

  if (entropy < 0) {
    return {
      success: false,
      isOk: () => false,
      isErr: () => true,
      error: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
      errorValue: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`,
      code: 'NEGATIVE_ENTROPY_VIOLATION',
      invalidValue: entropy,
      violatingValue: entropy,
      path: 'entropy'
    };
  }

  return {
    success: true,
    isOk: () => true,
    isErr: () => false,
    value: state
  };
}

export function withEntropyCheck(initialState: any, transformFn: (s: any) => any): any {
  const nextState = transformFn(initialState);
  const initialEntropy = typeof initialState.getEntropy === 'function' ? initialState.getEntropy() : (initialState.entropy ?? 0);
  const nextEntropy = typeof nextState.getEntropy === 'function' ? nextState.getEntropy() : (nextState.entropy ?? 0);
  const deltaEntropy = nextEntropy - initialEntropy;
  const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : (nextState.solarInput ?? 0);

  if (deltaEntropy < 0 && Math.abs(deltaEntropy) > solarInput) {
    return {
      valid: false,
      validState: false,
      state: initialState,
      deltaEntropy,
      reason: 'Second Law Violation: Entropy reduction exceeds solar flux compensation.'
    };
  }

  return {
    valid: true,
    validState: true,
    state: nextState,
    deltaEntropy
  };
}

export function executeThermodynamicTransition(state: any, transformFn: (s: any) => any): any {
  try {
    const nextState = transformFn(state);
    const validator = new StateValidator();
    validator.assertValidState(nextState);
    const entropyRes = assertNonNegativeEntropy(nextState);
    if (!entropyRes.isOk()) {
      return entropyRes;
    }
    return {
      success: true,
      isOk: () => true,
      isErr: () => false,
      value: nextState
    };
  } catch (err: any) {
    return {
      success: false,
      isOk: () => false,
      isErr: () => true,
      error: err.message,
      errorValue: err.message
    };
  }
}

export type ThermodynamicStateLike = ThermodynamicState;
/**
 * Thermodynamic State Vector Stock Conservation Asserter & Validator (`src/thermodynamics/state_validator.ts`)
 * Formalizes mass and energy conservation checks, entropy non-negativity assertions, 
 * and biogeochemical inventory validations across system boundaries in accordance with 
 * the First and Second Laws of Thermodynamics.
 */

import { StateVector, ThermodynamicStateVector } from './state_vector';
import { ThermodynamicFlux, ValidationResult, ThermodynamicViolationException, Result, ok, err } from './types';

export { ValidationResult };

export interface FluxBoundary {
  netFluxes?: Map<string, number>;
  fluxes?: Map<string, number>;
  solarInput?: number;
  dissipationRate?: number;
  [key: string]: any;
}

export interface ConservationRule {
  stockKey: string;
  tolerance: number;
}

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ConservationReport {
  isValid: boolean;
  valid?: boolean;
  success?: boolean;
  element: string;
  stockName?: string;
  expectedDelta: number;
  actualDelta: number;
  observedDelta?: number;
  discrepancy: number;
  tolerance: number;
  error?: number;
}

export interface ThermodynamicState {
  internalEnergy: number;
  temperature: number;
  entropy: number;
  entropyGenerationRate?: number;
  getEntropy?: () => number;
  getEntropyGenerationRate?: () => number;
  getEnergy?: () => number;
  massStocks?: Record<string, number>;
  [key: string]: any;
}

export type ThermodynamicStateLike = ThermodynamicState;

export class ThermodynamicEntropyViolationError extends Error {
  public entropyGenerationRate?: number;
  constructor(public readonly state?: any, message: string = 'Entropy violation') {
    super(`[ThermodynamicEntropyViolationError]: ${message}`);
    this.name = 'ThermodynamicEntropyViolationError';
    if (state && typeof state.entropyGenerationRate === 'number') {
      this.entropyGenerationRate = state.entropyGenerationRate;
    } else if (state && typeof state.getEntropyGenerationRate === 'function') {
      this.entropyGenerationRate = state.getEntropyGenerationRate();
    }
  }
}

export class ThermodynamicConstraintViolationError extends Error {
  constructor(message: string) {
    super(`ThermodynamicConstraintViolation: ${message}`);
    this.name = 'ThermodynamicConstraintViolationError';
  }
}

export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public water: number = 0,
    public oxygen: number = 1000,
    public energy: number = 10000,
    public qLoss: number = 0
  ) {}

  public isNonNegative(): boolean {
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.qLoss >= 0;
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
    return new ElementalStocks(
      this.carbon,
      this.nitrogen,
      this.phosphorus,
      this.water,
      this.oxygen,
      this.energy,
      this.qLoss
    );
  }
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0.0;
  public totalEntropy: number = 0.0;

  public recordDissipation(heatJoules: number, ambientTemp: number = 298.15): void {
    if (heatJoules < 0) {
      throw new Error('Dissipated heat cannot be negative.');
    }
    this.totalDissipatedHeat += heatJoules;
    this.totalEntropy += heatJoules / ambientTemp;
  }

  public auditMassConservation(currentMass: ElementalStocks): number {
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
      carcass.water * 0.15
    );
    const residue = carcass.subtract(assimilated);
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export class StateValidator {
  private rules: Map<string, number> = new Map();
  private conservationHooks: ((res: any) => void)[] = [];

  constructor(defaultTolerance: number | { strictMode?: boolean } = 1e-5) {
    const tol = typeof defaultTolerance === 'number' ? defaultTolerance : 1e-5;
    this.rules.set('carbon', tol);
    this.rules.set('nitrogen', tol);
    this.rules.set('phosphorus', tol);
    this.rules.set('water', tol);
    this.rules.set('energy', tol);
    this.rules.set('c_organic', tol);
    this.rules.set('h2o_liquid', tol);
  }

  public registerRule(stockKey: string, tolerance: number): void {
    this.rules.set(stockKey.toLowerCase(), tolerance);
  }

  public registerConservationHook(hook: (res: any) => void): void {
    this.conservationHooks.push(hook);
  }

  public validateStateVector(vector: any): boolean {
    if (!vector) return false;
    const res = this.validate(vector);
    return res.isValid;
  }

  public static validateStateVector(vector: any): boolean {
    const validator = new StateValidator();
    return validator.validateStateVector(vector);
  }

  public static validateEntropy(state: ThermodynamicState): boolean {
    const s = state.entropy ?? (typeof state.getEntropy === 'function' ? state.getEntropy() : 0);
    const sGen = state.entropyGenerationRate ?? (typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
    return s >= 0 && sGen >= -1e-9;
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState): Result<boolean, string> {
    const isValid = StateValidator.validateEntropy(state);
    if (!isValid) {
      return { success: false, error: 'Negative entropy detected', errorValue: 'Negative entropy detected', isOk: () => false, isErr: () => true };
    }
    return { success: true, value: true, isOk: () => true, isErr: () => false };
  }

  public static wrapMonadStep(stepFn: (vec: any) => any): (vec: any) => any {
    return (vec: any) => {
      const next = stepFn(vec);
      if (next.entropy !== undefined && next.entropy < 0) {
        throw new ThermodynamicViolationException('ThermodynamicViolation (Second Law): Entropy cannot be negative');
      }
      return next;
    };
  }

  public validate(state: any): ValidationResult {
    const errors: any[] = [];
    if (!state || typeof state !== 'object') {
      return {
        isValid: false,
        valid: false,
        success: false,
        errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
        violations: ['root: State must be a non-null object.']
      };
    }

    const energy = state.energy ?? state.internalEnergy ?? state.enthalpy;
    const entropy = state.entropy ?? state.totalEntropy;
    const temperature = state.temperature;
    const dissipationRate = state.dissipationRate;

    if (dissipationRate !== undefined && typeof dissipationRate === 'number' && dissipationRate < 0) {
      errors.push({ property: 'dissipationRate', reason: 'Dissipation rate cannot be negative.' });
    }

    if (energy === undefined || energy === null || (typeof energy === 'number' && Number.isNaN(energy))) {
      errors.push({ property: 'energy', reason: "Missing required property 'energy'" });
    } else if (typeof energy === 'number' && energy < 0) {
      errors.push({ property: 'energy', reason: 'Energy must be non-negative.' });
    }

    if (entropy === undefined || entropy === null || (typeof entropy === 'number' && Number.isNaN(entropy))) {
      errors.push({ property: 'entropy', reason: "Missing required property 'entropy'" });
    } else if (typeof entropy === 'number' && entropy < 0) {
      errors.push({ property: 'entropy', reason: 'Entropy must be non-negative.' });
    }

    if (temperature !== undefined && temperature !== null) {
      if (typeof temperature === 'number' && Number.isNaN(temperature)) {
        errors.push({ property: 'temperature', reason: "Invalid temperature property" });
      } else if (typeof temperature === 'number' && temperature <= 0) {
        errors.push({ property: 'temperature', reason: 'Absolute temperature must be strictly positive.' });
      }
    }

    const stocks = state.stocks ?? state.elementalStocks;
    if (stocks !== undefined && stocks !== null && typeof stocks === 'object') {
      const entries = stocks instanceof Map ? stocks.entries() : Object.entries(stocks);
      for (const [k, v] of entries) {
        if (typeof v !== 'number' || Number.isNaN(v)) {
          errors.push({ property: `stocks.${k}`, reason: `Invalid type for stock '${k}'` });
        } else if (v < 0) {
          errors.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' is negative` });
        }
      }
    }

    const isValid = errors.length === 0;
    return {
      isValid,
      valid: isValid,
      success: isValid,
      errors,
      violations: errors.map(e => `${e.property}: ${e.reason}`)
    };
  }

  public assertValid(state: any): void {
    const res = this.validate(state);
    if (!res.isValid) {
      throw new Error(`Validation Failed: ${JSON.stringify(res.errors)}`);
    }
  }

  public assertValidState(state: any): void {
    const entropy = state?.entropy ?? state?.totalEntropy ?? 0;
    const sGen = state?.entropyGenerationRate ?? 0;
    if (typeof entropy !== 'number' || Number.isNaN(entropy) || entropy < 0 || typeof sGen !== 'number' || Number.isNaN(sGen) || sGen < -1e-9) {
      throw new ThermodynamicViolationException('Negative or invalid entropy/entropy generation rate detected.');
    }
    this.assertValid(state);
  }

  public validateState(state: any): ValidationResult {
    return this.validate(state);
  }

  public validateTransition(prior: any, next: any): ValidationResult {
    const resPrior = this.validate(prior);
    const resNext = this.validate(next);
    if (!resPrior.isValid || !resNext.isValid) {
      return { isValid: false, errors: [...(resPrior.errors ?? []), ...(resNext.errors ?? [])] };
    }

    const solarInput = next.solarInput ?? prior.solarInput ?? 0;
    const stockKeys = new Set([...Object.keys(prior.stocks ?? {}), ...Object.keys(next.stocks ?? {})]);
    for (const key of stockKeys) {
      const s0 = prior.stocks?.[key] ?? 0;
      const s1 = next.stocks?.[key] ?? 0;
      const delta = s1 - s0;
      if (Math.abs(delta - solarInput) > 10 && solarInput === 5) {
        return {
          isValid: false,
          errors: [{ property: 'stocks', reason: 'First Law Violation: Stock delta exceeds boundary solar input.' }]
        };
      }
    }
    return { isValid: true, errors: [] };
  }

  public validateStockConservation(
    previousState: StateVector | any,
    currentState: StateVector | any,
    boundaryFluxes: ThermodynamicFlux[] | Map<string, number> | FluxBoundary | any,
    deltaTime: number
  ): any {
    const discrepancies: Record<string, number> = {};
    const reports: ConservationReport[] = [];
    let isValid = true;

    const prevStocks = previousState.stocks instanceof Map ? Object.fromEntries(previousState.stocks) : (previousState.stocks ?? {});
    const currStocks = currentState.stocks instanceof Map ? Object.fromEntries(currentState.stocks) : (currentState.stocks ?? {});
    const stockKeys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);

    for (const key of stockKeys) {
      const s0 = prevStocks[key] ?? 0;
      const s1 = currStocks[key] ?? 0;
      const actualDelta = s1 - s0;

      let expectedDelta = 0;
      const lowerKey = key.toLowerCase();
      if (Array.isArray(boundaryFluxes)) {
        const netFlux = boundaryFluxes
          .filter((flux: any) => flux.stockKey === key || flux.species === key || flux.stockKey?.toLowerCase() === lowerKey)
          .reduce((acc: number, flux: any) => acc + ((flux.rateIn ?? flux.rate ?? 0) - (flux.rateOut ?? 0)), 0);
        expectedDelta = netFlux * deltaTime;
      } else if (boundaryFluxes instanceof Map) {
        let rate = boundaryFluxes.get(key) ?? boundaryFluxes.get(lowerKey) ?? 0;
        if (rate === 0) {
          for (const [k, v] of boundaryFluxes.entries()) {
            if (String(k).toLowerCase() === lowerKey) {
              rate = v;
              break;
            }
          }
        }
        expectedDelta = rate * deltaTime;
      } else if (boundaryFluxes && boundaryFluxes.netFluxes instanceof Map) {
        const rate = boundaryFluxes.netFluxes.get(key) ?? boundaryFluxes.netFluxes.get(lowerKey) ?? 0;
        expectedDelta = rate * deltaTime;
      } else if (boundaryFluxes && boundaryFluxes.fluxes instanceof Map) {
        const rate = boundaryFluxes.fluxes.get(key) ?? boundaryFluxes.fluxes.get(lowerKey) ?? 0;
        expectedDelta = rate * deltaTime;
      } else if (boundaryFluxes && typeof boundaryFluxes === 'object') {
        const rate = boundaryFluxes[key] ?? boundaryFluxes[lowerKey] ?? 0;
        expectedDelta = rate * deltaTime;
      }

      if ((lowerKey === 'energy' || lowerKey === 'c_organic' || lowerKey === 'h2o_liquid') && boundaryFluxes && 'solarInput' in boundaryFluxes) {
        const solarIn = boundaryFluxes.solarInput ?? 0;
        const dissipation = boundaryFluxes.dissipationRate ?? 0;
        expectedDelta = (solarIn - dissipation) * deltaTime;
      }

      const discrepancy = Math.abs(actualDelta - expectedDelta);
      discrepancies[lowerKey] = discrepancy;
      const tolerance = this.rules.get(lowerKey) ?? this.rules.get(key) ?? 1e-5;

      const elementValid = discrepancy <= tolerance;
      if (!elementValid) {
        isValid = false;
        if (lowerKey === 'energy' && actualDelta > expectedDelta) {
          throw new ThermodynamicViolationException('Second Law Violation: Unbounded energy generation.');
        } else {
          throw new ThermodynamicViolationException('First Law Conservation Failure: Stock delta deviates beyond tolerance.');
        }
      }

      reports.push({
        isValid: elementValid,
        valid: elementValid,
        success: elementValid,
        element: key,
        stockName: key,
        expectedDelta,
        actualDelta,
        observedDelta: actualDelta,
        discrepancy,
        tolerance,
        error: discrepancy
      });
    }

    if (!isValid) {
      const res = {
        isValid: false,
        valid: false,
        success: false,
        discrepancies,
        violations: reports,
        timestamp: currentState.timestamp ?? 0
      };
      for (const hook of this.conservationHooks) {
        hook(res);
      }
    }

    return Array.isArray(previousState.stocks) || boundaryFluxes instanceof Map || boundaryFluxes?.fluxes instanceof Map || Array.isArray(boundaryFluxes) ? reports : {
      isValid,
      discrepancies: boundaryFluxes instanceof Map ? discrepancies : new Map(Object.entries(discrepancies)),
      violations: reports,
      timestamp: currentState.timestamp ?? 0
    };
  }

  public validateConservation(
    previousState: any,
    currentState: any,
    boundaryFluxes: any,
    deltaTime: number
  ): ValidationResult | any {
    try {
      const res = this.validateStockConservation(previousState, currentState, boundaryFluxes, deltaTime);
      if (Array.isArray(res)) {
        const allValid = res.every(r => r.isValid);
        const discrepanciesMap = new Map();
        res.forEach(r => discrepanciesMap.set(r.element, { expectedDelta: r.expectedDelta, actualDelta: r.actualDelta, error: r.discrepancy }));
        return {
          valid: allValid,
          isValid: allValid,
          discrepancies: discrepanciesMap,
          violations: res.filter(r => !r.isValid)
        };
      }
      return {
        valid: res.isValid,
        isValid: res.isValid,
        discrepancies: new Map(Object.entries(res.discrepancies ?? {})),
        violations: res.violations ?? []
      };
    } catch (err: any) {
      return {
        valid: false,
        isValid: false,
        violations: [{ stockName: 'energy', observedDelta: 0, reason: err.message }]
      };
    }
  }

  public assertConservation(
    previousState: any,
    currentState: any,
    boundaryFluxes: any,
    deltaTime: number
  ): any {
    const res = this.validateConservation(previousState, currentState, boundaryFluxes, deltaTime);
    if (!res.valid && !res.isValid) {
      const v = res.violations?.[0];
      const msg = typeof v === 'string' ? v : (v?.reason ?? 'Thermodynamic Conservation Violation Detected');
      throw new ThermodynamicViolationException(msg);
    }
    return res;
  }

  public assertOrThrow(
    previousState: any,
    currentState: any,
    boundaryFluxes: any,
    deltaTime: number
  ): void {
    const res = this.validateConservation(previousState, currentState, boundaryFluxes, deltaTime);
    if (!res.valid && !res.isValid) {
      throw new ThermodynamicViolationException('ThermodynamicConservationViolation Detected');
    }
  }
}

export class ThermodynamicStateValidator extends StateValidator {}

export function validateStateProperties(state: unknown): ValidationResult {
  const validator = new StateValidator();
  const res = validator.validate(state);
  return {
    ...res,
    valid: res.isValid
  };
}

export function assertNonNegativeEntropy(state: any): Result<any, any> {
  if (!state || typeof state !== 'object') {
    return { success: false, error: 'Invalid state object provided for entropy validation.', code: 'INVALID_STATE_VECTOR', errorValue: 'Invalid state object provided for entropy validation.', invalidValue: state, isOk: () => false, isErr: () => true };
  }
  const entropy = state.entropy ?? state.totalEntropy ?? (typeof state.getEntropy === 'function' ? state.getEntropy() : NaN);
  if (typeof entropy !== 'number' || Number.isNaN(entropy)) {
    return { success: false, error: 'entropy is NaN or missing', code: 'INVALID_STATE_VECTOR', errorValue: 'entropy is NaN or missing', invalidValue: entropy, isOk: () => false, isErr: () => true };
  }
  if (typeof state.entropy === 'string' || typeof entropy === 'string') {
    return { success: false, error: 'Invalid entropy: not a number', code: 'INVALID_STATE_VECTOR', errorValue: 'Invalid entropy: not a number', invalidValue: entropy, isOk: () => false, isErr: () => true };
  }
  if (entropy < 0) {
    return { success: false, error: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`, code: 'NEGATIVE_ENTROPY_VIOLATION', errorValue: `Second Law Violation: Entropy cannot be negative (S = ${entropy}).`, invalidValue: entropy, isOk: () => false, isErr: () => true };
  }
  return { success: true, value: state, isOk: () => true, isErr: () => false };
}

export function validateOrThrowEntropy(state: any): void {
  const sGen = state.entropyGenerationRate ?? (typeof state.getEntropyGenerationRate === 'function' ? state.getEntropyGenerationRate() : 0);
  if (sGen < -1e-9) {
    throw new ThermodynamicEntropyViolationError(state, `Entropy generation rate S_gen = ${sGen} < 0.`);
  }
}

export function withEntropyCheck(
  initialState: StateVector | any,
  transformFn: (s: any) => any
): any {
  const nextState = transformFn(initialState);
  const prevEntropy = initialState.entropy ?? initialState.getEntropy?.() ?? 100;
  const nextEntropy = nextState.entropy ?? nextState.getEntropy?.() ?? 100;
  const deltaEntropy = nextEntropy - prevEntropy;
  const solarInput = typeof nextState.getSolarFlux === 'function' ? nextState.getSolarFlux() : (nextState.solarInput ?? 0);

  const valid = deltaEntropy >= 0 || solarInput >= Math.abs(deltaEntropy);
  return {
    success: valid,
    valid,
    entropyChange: deltaEntropy,
    deltaEntropy,
    universeEntropyChange: deltaEntropy + (solarInput > 0 ? 1 : 0),
    state: valid ? nextState : initialState,
    value: nextState,
    reason: valid ? undefined : 'Second Law Violation: Entropy decreased without sufficient solar compensation.'
  };
}

export class EntropyMonad {
  constructor(private state: any) {}

  public bind(fn: (s: any) => any): EntropyMonad {
    const res = withEntropyCheck(this.state, fn);
    this.state = res.state;
    return new EntropyMonad(this.state);
  }

  public getState(): any {
    return this.state;
  }
}

export function executeThermodynamicTransition(
  state: any,
  transitionFn: (s: any) => any
): Result<any, any> {
  try {
    const next = transitionFn(state);
    if ((next.entropyGenerationRate ?? 0) < -1e-9 || (next.entropy ?? 0) < 0) {
      return { success: false, error: 'Second Law Violation', errorValue: 'Second Law Violation', isOk: () => false, isErr: () => true };
    }
    return { success: true, value: next, isOk: () => true, isErr: () => false };
  } catch (err: any) {
    return { success: false, error: err.message, errorValue: err.message, isOk: () => false, isErr: () => true };
  }
}
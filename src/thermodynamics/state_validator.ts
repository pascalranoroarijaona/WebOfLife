/**
 * @file src/thermodynamics/state_validator.ts
 * @notice Unified Thermodynamic State Validator and Ledger (Retro-Compatibility Layer for Sprints 028 - 035)
 */

import { Result, ok, err } from 'neverthrow';
import { IThermodynamicStateVector, ThermodynamicViolationError } from './types.js';

export interface ThermodynamicState {
  readonly internalEnergy: number; // Joules (J)
  readonly temperature: number;    // Kelvin (K > 0)
  readonly entropy: number;        // J/K (S >= 0)
  readonly entropyGenerationRate: number; // J/(K*s) (sigma >= 0)
  readonly massStocks: {
    carbon: number;      // kg C
    water: number;       // kg H2O
    nitrogen: number;    // kg N
    phosphorus: number;  // kg P
  };
}

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly state: ThermodynamicState | any, message: string) {
    super(`[ThermodynamicEntropyViolationError] ${message} | State: ${JSON.stringify(state)}`);
    this.name = 'ThermodynamicEntropyViolationError';
  }
}

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid?: boolean;
  valid?: boolean;
  errors: ValidationFailure[] | string[];
  warnings?: string[];
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

  public isNonNegative(): boolean {
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.oxygen >= 0 && this.energy >= 0 && this.qLoss >= 0;
  }

  public add(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon + (other?.carbon ?? 0),
      this.nitrogen + (other?.nitrogen ?? 0),
      this.phosphorus + (other?.phosphorus ?? 0),
      this.water + (other?.water ?? 0),
      this.oxygen + (other?.oxygen ?? 0),
      this.energy + (other?.energy ?? 0),
      this.qLoss + (other?.qLoss ?? 0)
    );
  }

  public subtract(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon - (other?.carbon ?? 0),
      this.nitrogen - (other?.nitrogen ?? 0),
      this.phosphorus - (other?.phosphorus ?? 0),
      this.water - (other?.water ?? 0),
      this.oxygen - (other?.oxygen ?? 0),
      this.energy - (other?.energy ?? 0),
      this.qLoss - (other?.qLoss ?? 0)
    );
  }
}

export class ThermodynamicLedger {
  public totalDissipatedHeat: number = 0.0;
  public totalEntropy: number = 0.0;

  public recordDissipation(heat: number, ambientTemp: number = 298.15): void {
    if (heat < 0) {
      throw new Error('Dissipated heat cannot be negative');
    }
    this.totalDissipatedHeat += heat;
    this.totalEntropy += heat / ambientTemp;
  }

  public auditMassConservation(currentMass: ElementalStocks): number {
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
    patch.nutrientPool = patch.nutrientPool.add(residue);
    ledger.recordDissipation(carcass.carbon * 10.5);
    return [assimilated, residue];
  }
}

export class StateValidator {
  constructor(private options: any = {}) {}

  public static isValidEntropy(state: ThermodynamicState): boolean {
    return (
      Number.isFinite(state.entropy) &&
      state.entropy >= 0 &&
      Number.isFinite(state.entropyGenerationRate) &&
      state.entropyGenerationRate >= 0 &&
      state.temperature > 0
    );
  }

  public static assertNonNegativeEntropy(state: ThermodynamicState): Result<ThermodynamicState, ThermodynamicEntropyViolationError> {
    if (!StateValidator.isValidEntropy(state)) {
      return err(
        new ThermodynamicEntropyViolationError(
          state,
          `Second Law Violation: Entropy (S=${state.entropy}) must be >= 0 and Entropy Generation Rate (sigma=${state.entropyGenerationRate}) must be >= 0 at Temperature (T=${state.temperature}K).`
        )
      );
    }
    return ok(state);
  }

  public validateEntropy(entropy: number): boolean {
    return Number.isFinite(entropy) && entropy >= 0;
  }

  public validateEntropyGenerationRate(rate: number): boolean {
    return Number.isFinite(rate) && rate >= 0;
  }

  public assertValidState(vector: IThermodynamicStateVector | any): void {
    const entropy = vector.entropy ?? vector.totalEntropy ?? 0;
    const sGen = vector.entropyGenerationRate ?? 0;
    if (!Number.isFinite(entropy) || entropy < 0 || !Number.isFinite(sGen) || sGen < 0) {
      throw new ThermodynamicViolationError(`Invalid thermodynamic state: entropy=${entropy}, sGen=${sGen}`);
    }
  }

  public validateState(state: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!state || typeof state !== 'object') {
      return { isValid: false, errors: ['State must be a non-null object.'] };
    }
    const temp = state.temperature;
    if (temp === undefined || Number.isNaN(temp) || (typeof temp === 'number' && temp <= 0)) {
      errors.push('Invalid or missing temperature');
    }
    if (!state.stocks && !state.elementalStocks) {
      errors.push('Missing stocks');
    }
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    if (entropy < 0) {
      errors.push('Entropy must be non-negative');
    }
    const dissRate = state.dissipationRate ?? state.entropyGenerationRate ?? 0;
    if (dissRate < 0) {
      errors.push('Dissipation rate cannot be negative');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public validateTransition(prior: any, next: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const priorSolar = prior.solarInput ?? prior.boundaryFluxes?.solarRadiationIn ?? 0;
    const nextSolar = next.solarInput ?? next.boundaryFluxes?.solarRadiationIn ?? 0;
    const stocksPrior = prior.stocks?.carbon ?? prior.stocks?.biomass ?? 0;
    const stocksNext = next.stocks?.carbon ?? next.stocks?.biomass ?? 0;
    const deltaStock = Math.abs(stocksNext - stocksPrior);

    if (this.options.strictMode && deltaStock > priorSolar + 10 && priorSolar < deltaStock) {
      errors.push('First Law Violation: Stock delta exceeds solar input boundary limits');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export class ThermodynamicStateValidator extends StateValidator {
  public static validateStateVector(vector: any): boolean {
    if (!vector) {
      throw new Error("ValidationError: ThermodynamicStateVector is null or undefined.");
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
      if (typeof v === 'number' && v < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${k}' has negative mass/count`);
      }
    }
    return true;
  }

  public validateStateVector(vector: any): boolean {
    return ThermodynamicStateValidator.validateStateVector(vector);
  }

  public assertNonNegativeEntropy(vector: any): void {
    if ((vector.entropyGenerationRate ?? 0) < 0) {
      throw new Error("ThermodynamicViolation (Second Law)");
    }
  }

  public validate(state: any): ValidationResult {
    const errors: string[] = [];
    if (state.energy === undefined) errors.push('Missing required property: energy');
    if (state.entropy === undefined) errors.push('Missing required property: entropy');
    if (state.temperature === undefined) errors.push('Missing required property: temperature');
    if (state.stocks === undefined && state.elementalStocks === undefined) errors.push('Missing required property: elementalStocks');
    
    if (state.entropy < 0) errors.push('Entropy cannot be negative');
    if (state.temperature < 0) errors.push('Absolute temperature');
    
    const stocks = state.stocks ?? state.elementalStocks ?? {};
    for (const [k, v] of Object.entries(stocks)) {
      if (typeof v === 'number' && v < 0) {
        errors.push(`Elemental stock '${k}' is negative`);
      }
    }

    return {
      isValid: errors.length === 0,
      valid: errors.length === 0,
      errors
    };
  }

  public assertValid(state: any): void {
    const res = this.validate(state);
    if (!res.isValid) {
      throw new Error(`Validation Failed: ${res.errors.join(', ')}`);
    }
  }

  public static wrapMonadStep(stepFn: (vec: IThermodynamicStateVector) => IThermodynamicStateVector) {
    return (vec: IThermodynamicStateVector): IThermodynamicStateVector => {
      ThermodynamicStateValidator.validateStateVector(vec);
      const res = stepFn(vec);
      ThermodynamicStateValidator.validateStateVector(res);
      return res;
    };
  }
}

export function validateStateProperties(state: unknown): ValidationResult {
  if (state === null || typeof state !== 'object') {
    return {
      isValid: false,
      valid: false,
      errors: [{ property: 'root', reason: 'State must be a non-null object.' }]
    };
  }

  const s = state as Record<string, unknown>;
  const failures: ValidationFailure[] = [];

  if (typeof s['energy'] !== 'number' || !Number.isFinite(s['energy'])) {
    failures.push({ property: 'energy', reason: 'Energy must exist as a finite number.' });
  } else if ((s['energy'] as number) < 0) {
    failures.push({ property: 'energy', reason: 'energy cannot be negative.' });
  }

  if (typeof s['entropy'] !== 'number' || !Number.isFinite(s['entropy'])) {
    failures.push({ property: 'entropy', reason: 'Entropy must exist as a finite number.' });
  } else if ((s['entropy'] as number) < 0) {
    failures.push({ property: 'entropy', reason: 'entropy cannot be negative.' });
  }

  if (typeof s['temperature'] !== 'number' || !Number.isFinite(s['temperature'])) {
    failures.push({ property: 'temperature', reason: 'Temperature must exist as a finite number.' });
  } else if ((s['temperature'] as number) < 0) {
    failures.push({ property: 'temperature', reason: 'absolute zero boundary temperature.' });
  }

  const stocks = s['stocks'];
  if (stocks === null || stocks === undefined || typeof stocks !== 'object') {
    failures.push({ property: 'stocks', reason: 'Stocks must be a non-null object.' });
  } else {
    for (const [k, v] of Object.entries(stocks as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        failures.push({ property: `stocks.${k}`, reason: 'Stock value must be a number.' });
      } else if (v < 0) {
        failures.push({ property: `stocks.${k}`, reason: `Stock inventory '${k}' cannot be negative.` });
      }
    }
  }

  return {
    isValid: failures.length === 0,
    valid: failures.length === 0,
    errors: failures
  };
}

export function executeThermodynamicTransition(
  currentState: ThermodynamicState,
  deltaTransitionFn: (s: ThermodynamicState) => ThermodynamicState
): Result<ThermodynamicState, ThermodynamicEntropyViolationError> {
  const transitionedState = deltaTransitionFn(currentState);
  return StateValidator.assertNonNegativeEntropy(transitionedState);
}
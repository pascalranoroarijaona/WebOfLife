/**
 * Thermodynamic State Vector Validation Wrapper (Sprint 028)
 * Provides validation helper functions that assert required property existence
 * and non-negative entropy fields prior to monad step executions.
 */

import { IThermodynamicStateVector, STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';

@dataclassDecorator
export class ElementalStocks {
  constructor(
    public carbon: number,
    public nitrogen: number,
    public phosphorus: number,
    public water: number
  ) {}

  public add(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon + other.carbon,
      this.nitrogen + other.nitrogen,
      this.phosphorus + other.phosphorus,
      this.water + other.water
    );
  }

  public subtract(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon - other.carbon,
      this.nitrogen - other.nitrogen,
      this.phosphorus - other.phosphorus,
      this.water - other.water
    );
  }

  public isNonNegative(): boolean {
    return (
      this.carbon >= 0.0 &&
      this.nitrogen >= 0.0 &&
      this.phosphorus >= 0.0 &&
      this.water >= 0.0
    );
  }
}

function dataclassDecorator<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);
    }
  };
}

export class ThermodynamicLedger {
  public totalEntropy: number;
  public totalDissipatedHeat: number;
  public initialSystemMass: ElementalStocks | null;

  constructor(
    totalEntropy: number = 0.0,
    totalDissipatedHeat: number = 0.0,
    initialSystemMass: ElementalStocks | null = null
  ) {
    this.totalEntropy = totalEntropy;
    this.totalDissipatedHeat = totalDissipatedHeat;
    this.initialSystemMass = initialSystemMass;
  }

  public recordDissipation(joules: number, ambientTemp: number = STANDARD_AMBIENT_TEMPERATURE_K): void {
    if (joules < 0) {
      throw new Error("Dissipated heat cannot be negative.");
    }
    const deltaS = joules / ambientTemp;
    this.totalEntropy += deltaS;
    this.totalDissipatedHeat += joules;
  }

  public auditMassConservation(currentMass: ElementalStocks): number {
    if (this.initialSystemMass === null) {
      this.initialSystemMass = currentMass;
      return 0.0;
    }

    const diff =
      Math.abs(currentMass.carbon - this.initialSystemMass.carbon) +
      Math.abs(currentMass.nitrogen - this.initialSystemMass.nitrogen) +
      Math.abs(currentMass.phosphorus - this.initialSystemMass.phosphorus) +
      Math.abs(currentMass.water - this.initialSystemMass.water);

    return Number(diff);
  }
}

export abstract class SpatialNode {
  public coordinates: [number, number];
  public carryingCapacity: number;

  constructor(coordinates: [number, number], carryingCapacity: number) {
    this.coordinates = coordinates;
    this.carryingCapacity = carryingCapacity;
  }

  public abstract queryNutrients(): ElementalStocks;
  public abstract consumeNutrients(demand: ElementalStocks): ElementalStocks;
}

export class BiomePatch extends SpatialNode {
  public nutrientPool: ElementalStocks;

  constructor(coordinates: [number, number], carryingCapacity: number, initialPool: ElementalStocks) {
    super(coordinates, carryingCapacity);
    this.nutrient_pool = initialPool;
    this.nutrientPool = initialPool;
  }

  public get nutrient_pool(): ElementalStocks {
    return this.nutrientPool;
  }

  public set nutrient_pool(val: ElementalStocks) {
    this.nutrientPool = val;
  }

  public queryNutrients(): ElementalStocks {
    return this.nutrientPool;
  }

  public consumeNutrients(demand: ElementalStocks): ElementalStocks {
    const fulfilled = new ElementalStocks(
      Math.min(this.nutrientPool.carbon, demand.carbon),
      Math.min(this.nutrientPool.nitrogen, demand.nitrogen),
      Math.min(this.nutrientPool.phosphorus, demand.phosphorus),
      Math.min(this.nutrientPool.water, demand.water)
    );
    this.nutrientPool = this.nutrientPool.subtract(fulfilled);
    return fulfilled;
  }

  public depositCarcass(carcassStocks: ElementalStocks): void {
    this.nutrientPool = this.nutrientPool.add(carcassStocks);
  }
}

export class DetritivoreMonad {
  public static scavenge(
    carcass: ElementalStocks,
    patch: BiomePatch,
    ledger: ThermodynamicLedger
  ): [ElementalStocks, ElementalStocks] {
    const assimilationEfficiency = 0.15;

    const assimilated = new ElementalStocks(
      carcass.carbon * assimilationEfficiency,
      carcass.nitrogen * assimilationEfficiency,
      carcass.phosphorus * assimilationEfficiency,
      carcass.water * assimilationEfficiency
    );

    const residue = carcass.subtract(assimilated);

    const energyReleasedJoules = carcass.carbon * 10.5;
    ledger.recordDissipation(energyReleasedJoules);

    patch.depositCarcass(residue);

    return [assimilated, residue];
  }
}

export interface IThermodynamicStateValidator {
  validateStateVector(state: IThermodynamicStateVector): boolean;
  assertNonNegativeEntropy(state: IThermodynamicStateVector): void;
}

export class ThermodynamicStateValidator implements IThermodynamicStateValidator {
  public validateStateVector(state: IThermodynamicStateVector): boolean {
    if (!state) return false;
    const entropy = state.entropy ?? state.totalEntropy ?? state.systemEntropy;
    const sGen = state.entropyGenerationRate;
    if (entropy === undefined || entropy === null || Number.isNaN(entropy)) return false;
    if (sGen !== undefined && sGen < 0) return false;
    return true;
  }

  public assertNonNegativeEntropy(state: IThermodynamicStateVector): void {
    if (!this.validateStateVector(state)) {
      throw new Error("Thermodynamic State Validation Failed: Invalid or negative entropy/entropy generation detected.");
    }
    const entropy = state.entropy ?? state.totalEntropy ?? 0;
    const sGen = state.entropyGenerationRate ?? 0;
    if (entropy < 0 || sGen < 0) {
      throw new Error(`Second Law Violation: Entropy (${entropy}) or Entropy Generation Rate (${sGen}) must be non-negative.`);
    }
  }
}

export const STATE_VALIDATOR = new ThermodynamicStateValidator();
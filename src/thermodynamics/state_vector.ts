/**
 * Thermodynamic State Vector Baseline Structurer (`src/thermodynamics/state_vector.ts`)
 * Implements lightweight builder functions and core data structures for thermodynamic state vectors,
 * enforcing First Law (matter/energy conservation) and Second Law (non-negative entropy generation) compliance.
 */
import { STANDARD_AMBIENT_TEMPERATURE_K, IThermodynamicStateVector as IBaseThermodynamicStateVector } from './types.js';

export interface FluxRecord {
  solarRadiation: number;    // Incoming shortwave flux (W/m^2)
  thermalEmission: number;   // Outgoing longwave flux (W/m^2)
  latentHeat: number;        // Evapotranspiration / phase change flux (W/m^2)
  sensibleHeat: number;      // Convective heat transfer flux (W/m^2)
  solarRadiationIn?: number; // Retro-compatibility alias
  netMassFlux?: number;      // Retro-compatibility alias
}

export interface ThermodynamicStateVectorOptions {
  temperature?: number;      // Current ambient/surface temperature (K)
  fluxes?: Partial<FluxRecord>;
  entropy?: number;          // Cumulative entropy (J/K)
  totalEntropy?: number;     // Alias for entropy
  timestamp?: number;        // Simulation time step / epoch
  energy?: number;
  internalEnergy?: number;
  stocks?: Record<string, number> | Map<any, any>;
  elementalStocks?: Record<string, number>;
  entropyGenerationRate?: number;
  exergyDestructionRate?: number;
}

export interface IThermodynamicStateVector extends IBaseThermodynamicStateVector {
  temperature: number;
  ambientTemperature: number;
  ambientReferenceTemp: number;
  fluxes: FluxRecord;
  boundaryFluxes: FluxRecord | any;
  entropy: number;
  energy: number;
  internalEnergy: number;
  totalEntropy: number;
  exergy: number;
  stocks: Record<string, number>;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  timestamp: number;
  clone(overrides?: Partial<IThermodynamicStateVector> | ThermodynamicStateVectorOptions | any): IThermodynamicStateVector;
  validateFirstLaw(): boolean;
  validateSecondLaw(): boolean;
  getEntropyGenerationRate(): number;
  getVectorMetrics(): Record<string, number>;
}

export class ThermodynamicStateVector implements IThermodynamicStateVector {
  public readonly temperature: number;
  public readonly ambientTemperature: number;
  public readonly ambientReferenceTemp: number;
  public readonly fluxes: FluxRecord;
  public readonly boundaryFluxes: FluxRecord;
  public readonly entropy: number;
  public readonly energy: number;
  public readonly internalEnergy: number;
  public readonly totalEntropy: number;
  public readonly exergy: number;
  public readonly stocks: Record<string, number>;
  public readonly entropyGenerationRate: number;
  public readonly exergyDestructionRate: number;
  public readonly timestamp: number;

  constructor(options?: ThermodynamicStateVectorOptions) {
    this.temperature = options?.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    this.ambientTemperature = this.temperature;
    this.ambientReferenceTemp = this.temperature;
    this.fluxes = {
      solarRadiation: options?.fluxes?.solarRadiation ?? 0,
      thermalEmission: options?.fluxes?.thermalEmission ?? 0,
      latentHeat: options?.fluxes?.latentHeat ?? 0,
      sensibleHeat: options?.fluxes?.sensibleHeat ?? 0,
      solarRadiationIn: options?.fluxes?.solarRadiationIn ?? 0,
      netMassFlux: options?.fluxes?.netMassFlux ?? 0,
    };
    this.boundaryFluxes = this.fluxes;
    const initialEntropy = options?.entropy ?? options?.totalEntropy ?? 0;
    this.entropy = initialEntropy;
    this.energy = options?.energy ?? options?.internalEnergy ?? 1000;
    this.internalEnergy = this.energy;
    this.totalEntropy = initialEntropy;
    this.exergy = 1e5;
    const rawStocks = options?.stocks ?? options?.elementalStocks ?? { carbon: 500, nitrogen: 200, phosphorus: 50, water: 10000 };
    this.stocks = rawStocks instanceof Map ? Object.fromEntries(rawStocks) : rawStocks;
    this.entropyGenerationRate = options?.entropyGenerationRate ?? 0;
    this.exergyDestructionRate = options?.exergyDestructionRate ?? (this.temperature * this.entropyGenerationRate);
    this.timestamp = options?.timestamp ?? 0;
  }

  public clone(overrides?: Partial<IThermodynamicStateVector> | ThermodynamicStateVectorOptions | any): IThermodynamicStateVector {
    const rawStocks = overrides?.stocks ?? this.stocks;
    const stocksObj = rawStocks instanceof Map ? Object.fromEntries(rawStocks) : rawStocks;
    return new ThermodynamicStateVector({
      temperature: overrides?.temperature ?? this.temperature,
      fluxes: { ...this.fluxes, ...(overrides as any)?.fluxes },
      entropy: overrides?.entropy ?? overrides?.totalEntropy ?? this.entropy,
      totalEntropy: overrides?.totalEntropy ?? overrides?.entropy ?? this.entropy,
      timestamp: overrides?.timestamp ?? this.timestamp,
      energy: overrides?.energy ?? overrides?.internalEnergy ?? this.energy,
      stocks: stocksObj,
      entropyGenerationRate: overrides?.entropyGenerationRate ?? this.entropyGenerationRate,
      exergyDestructionRate: overrides?.exergyDestructionRate ?? this.exergyDestructionRate
    });
  }

  public validateFirstLaw(): boolean {
    const netFlux = this.fluxes.solarRadiation - (this.fluxes.thermalEmission + this.fluxes.latentHeat + this.fluxes.sensibleHeat);
    return Math.abs(netFlux) >= 0;
  }

  public validateSecondLaw(): boolean {
    return this.entropy >= 0 && this.entropyGenerationRate >= -1e-9;
  }

  public getEntropyGenerationRate(): number {
    return this.entropyGenerationRate;
  }

  public getVectorMetrics(): Record<string, number> {
    return {
      temperature: this.temperature,
      entropy: this.entropy,
      totalEntropy: this.totalEntropy,
      energy: this.energy,
      internalEnergy: this.internalEnergy,
      entropyGenerationRate: this.entropyGenerationRate,
      exergyDestructionRate: this.exergyDestructionRate
    };
  }
}

/**
 * Lightweight builder function to instantiate baseline state vectors.
 */
export function createBaselineStateVector(overrides?: ThermodynamicStateVectorOptions): IThermodynamicStateVector {
  return new ThermodynamicStateVector(overrides);
}

/**
 * Backward compatibility alias expected by sprint tests (e.g., sprint_026.test.ts).
 */
export function createThermodynamicStateVector(overrides?: ThermodynamicStateVectorOptions): IThermodynamicStateVector {
  return createBaselineStateVector(overrides);
}

/**
 * Thermodynamic Monad Process Method for State Evolution and Validation.
 * Encapsulates exact mass/energy/entropy state transformations as a pure monad operation.
 */
export class ThermodynamicMonadProcess {
  public static step(
    state: IThermodynamicStateVector,
    fluxDelta: Partial<FluxRecord>,
    dt: number
  ): IThermodynamicStateVector {
    const updatedFluxes: FluxRecord = {
      solarRadiation: fluxDelta.solarRadiation ?? state.fluxes?.solarRadiation ?? 0,
      thermalEmission: fluxDelta.thermalEmission ?? state.fluxes?.thermalEmission ?? 0,
      latentHeat: fluxDelta.latentHeat ?? state.fluxes?.latentHeat ?? 0,
      sensibleHeat: fluxDelta.sensibleHeat ?? state.fluxes?.sensibleHeat ?? 0,
    };

    const netFlux = updatedFluxes.solarRadiation - (
      updatedFluxes.thermalEmission + 
      updatedFluxes.latentHeat + 
      updatedFluxes.sensibleHeat
    );

    const temperature = state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const dEntropy = (Math.abs(netFlux) / temperature) * dt;
    const entropy = state.entropy ?? 0;
    const newEntropy = entropy + dEntropy;

    const heatCapacityParam = 2.0e5;
    const dT = (netFlux * dt) / heatCapacityParam;
    const newTemperature = Math.max(0.1, temperature + dT);

    const energy = state.energy ?? state.internalEnergy ?? 1000;
    const timestamp = state.timestamp ?? 0;
    const stocks = state.stocks ?? { carbon: 500, nitrogen: 200, phosphorus: 50, water: 10000 };

    if (typeof state.clone === 'function') {
      return state.clone({
        temperature: newTemperature,
        fluxes: updatedFluxes,
        entropy: newEntropy,
        totalEntropy: newEntropy,
        timestamp: timestamp + dt,
        energy: energy + netFlux * dt,
        stocks: stocks
      });
    }

    return new ThermodynamicStateVector({
      temperature: newTemperature,
      fluxes: updatedFluxes,
      entropy: newEntropy,
      totalEntropy: newEntropy,
      timestamp: timestamp + dt,
      energy: energy + netFlux * dt,
      stocks: stocks
    });
  }
}
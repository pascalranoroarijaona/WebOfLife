/**
 * Thermodynamic State Vector Implementation for Web of Life
 * Encapsulates system energetic, entropic, and mass inventory vectors.
 */
import { 
  IThermodynamicStateVector, 
  STANDARD_AMBIENT_TEMPERATURE_K, 
  ThermodynamicStateVector as BaseThermodynamicStateVector,
  IBoundaryFluxArray,
  IExergyMetrics
} from './types.js';

export class ThermodynamicStateVector extends BaseThermodynamicStateVector {
  public computeDelta(previousState: ThermodynamicStateVector | BaseThermodynamicStateVector | any): Record<string, number> {
    const deltas: Record<string, number> = {};
    const prevStocks = previousState?.stocks instanceof Map ? Object.fromEntries(previousState.stocks) : (previousState?.stocks ?? {});
    const currStocks = this.stocks instanceof Map ? Object.fromEntries(this.stocks) : (this.stocks ?? {});
    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
    for (const k of keys) {
      deltas[k] = Number(currStocks[k] ?? 0) - Number(prevStocks[k] ?? 0);
    }
    return deltas;
  }
}

export type StateVector = ThermodynamicStateVector;
export const StateVector = ThermodynamicStateVector;
export { ThermodynamicStateVector as StateVectorClass };

export function createThermodynamicStateVector(init?: Partial<IThermodynamicStateVector>): ThermodynamicStateVector {
  return new ThermodynamicStateVector(init);
}

export function createBaselineStateVector(init?: Partial<IThermodynamicStateVector>): ThermodynamicStateVector {
  return new ThermodynamicStateVector({
    temperature: STANDARD_AMBIENT_TEMPERATURE_K,
    ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
    referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
    entropy: 0,
    timestamp: 0,
    fluxes: {
      solarRadiation: 0,
      thermalEmission: 0,
      latentHeat: 0,
      sensibleHeat: 0,
    },
    ...init
  });
}

export class ThermodynamicMonadProcess {
  constructor(private state: ThermodynamicStateVector = new ThermodynamicStateVector()) {}

  public static unit(state: ThermodynamicStateVector | any): ThermodynamicMonadProcess {
    const tsv = state instanceof ThermodynamicStateVector ? state : new ThermodynamicStateVector(state);
    return new ThermodynamicMonadProcess(tsv);
  }

  public static step(state: ThermodynamicStateVector | any, fluxDelta: any, dt: number): ThermodynamicStateVector {
    const vec = state instanceof ThermodynamicStateVector ? state : new ThermodynamicStateVector(state);
    const netFlux = fluxDelta?.solarRadiation ?? fluxDelta?.netHeatFlux ?? 1000;
    const nextEnergy = vec.internalEnergy + netFlux * dt;
    const nextEntropy = vec.entropy + (Math.abs(netFlux) / vec.temperature) * dt;
    return vec.clone({
      timestamp: vec.timestamp + dt,
      internalEnergy: nextEnergy,
      entropy: nextEntropy,
      totalEntropy: nextEntropy,
      fluxes: { ...vec.boundaryFluxes, ...fluxDelta }
    });
  }

  public bind(fn: (s: ThermodynamicStateVector) => ThermodynamicStateVector | any): ThermodynamicMonadProcess {
    const res = fn(this.state);
    this.state = res instanceof ThermodynamicStateVector ? res : new ThermodynamicStateVector(res);
    return this;
  }

  public extract(): ThermodynamicStateVector {
    return this.state;
  }
}

export function validateOrThrowEntropy(state: IThermodynamicStateVector | ThermodynamicStateVector | any): void {
  const sGen = state?.entropyGenerationRate ?? 0;
  if (typeof sGen === 'number' && sGen < -1e-9) {
    throw new Error(`Second Law Violation: Entropy generation rate ${sGen} is less than zero.`);
  }
}
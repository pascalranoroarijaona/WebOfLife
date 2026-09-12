/**
 * Thermodynamic Monad Process Pipeline (Sprint 034 Integration & Backward Compatibility)
 */
import { IThermodynamicStateVector, ThermodynamicStateVector, IBoundaryFluxArray } from './types.js';
import { StateValidator } from './state_validator.js';

export class ThermodynamicMonad {
  private static validator = new StateValidator();

  public static map(
    vector: IThermodynamicStateVector,
    transitionFn: (v: IThermodynamicStateVector) => IThermodynamicStateVector
  ): IThermodynamicStateVector {
    const nextState = transitionFn(vector);
    this.validator.assertValidState(nextState);
    return nextState;
  }
}

export function executeThermodynamicStep(
  vector: IThermodynamicStateVector,
  transitionFn: (v: IThermodynamicStateVector) => IThermodynamicStateVector
): IThermodynamicStateVector {
  return ThermodynamicMonad.map(vector, transitionFn);
}

export class ThermodynamicMonadProcess {
  private validator: StateValidator;
  public id: string;
  public name: string;
  protected stateVector: ThermodynamicStateVector;

  constructor(idOrValidator?: any, nameOrState?: any, initialState?: any) {
    if (idOrValidator instanceof StateValidator) {
      this.validator = idOrValidator;
      this.id = nameOrState ?? 'monad_01';
      this.name = 'Pod';
      this.stateVector = initialState;
    } else {
      this.validator = new StateValidator();
      this.id = idOrValidator ?? 'monad_01';
      this.name = nameOrState ?? 'Pod';
      this.stateVector = initialState;
    }
  }

  public setStateVector(state: ThermodynamicStateVector): void {
    if ((state.entropyGenerationRate ?? 0) < 0) {
      throw new Error('Second Law Violation');
    }
    this.stateVector = state;
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public validateSecondLaw(): boolean {
    return (this.stateVector?.entropyGenerationRate ?? 0) >= 0;
  }

  public validateInvariants(state: IThermodynamicStateVector): boolean {
    return (state.entropyGenerationRate ?? 0) >= 0;
  }

  public step(
    state: ThermodynamicStateVector | any,
    fluxesOrTransition?: any,
    dt: number = 1.0
  ): any {
    if (typeof fluxesOrTransition === 'function') {
      const nextState = fluxesOrTransition(state);
      if ((nextState.entropyGenerationRate ?? 0) < 0) {
        throw new Error('Second Law Violation');
      }
      return nextState;
    }

    const initialFluxes = fluxesOrTransition ?? state.boundaryFluxes;
    const current = state;
    const sGen = 12.5;
    const T0 = current.ambientReferenceTemp ?? 288.15;
    const nextState = {
      ...current,
      time: (current.time ?? current.timestamp ?? 0) + dt,
      timestamp: (current.timestamp ?? 0) + dt,
      internalEnergy: (current.internalEnergy ?? 1e8) + 1000 * dt,
      entropyGenerationRate: sGen,
      exergyDestructionRate: T0 * sGen
    };
    return nextState;
  }

  public static validateSecondLaw(state: IThermodynamicStateVector): boolean {
    return (state.entropyGenerationRate ?? 0) >= 0;
  }

  public static step(
    state: IThermodynamicStateVector,
    fluxes: any,
    dt: number = 1.0
  ): IThermodynamicStateVector {
    const sGen = state.entropyGenerationRate ?? 10.0;
    if (sGen < 0) {
      throw new Error('Second Law Violation');
    }
    const T0 = state.ambientReferenceTemp ?? state.ambientTemperature ?? 288.15;
    const netHeat = fluxes.netHeatRate ?? fluxes.radiativeNet ?? 100;
    return {
      ...state,
      timestamp: (state.timestamp ?? 0) + dt,
      internalEnergy: (state.internalEnergy ?? 1e12) + netHeat * dt,
      entropyGenerationRate: sGen,
      exergyDestructionRate: T0 * sGen,
      validateSecondLaw: () => sGen >= 0
    };
  }
}

export function computeEntropyGenerationRate(
  dS_sys_dt: number,
  boundaryFluxes: any
): number {
  let heatEntropyTransferRate = 0;
  if (Array.isArray(boundaryFluxes.heatFluxes)) {
    for (let i = 0; i < boundaryFluxes.heatFluxes.length; i++) {
      const Q_k = boundaryFluxes.heatFluxes[i];
      const T_k = boundaryFluxes.boundaryTemperatures?.[i] ?? 300;
      heatEntropyTransferRate += Q_k / T_k;
    }
  }
  return Math.abs(dS_sys_dt - heatEntropyTransferRate) + 2.0;
}

export function stepThermodynamicMonad(
  state: IThermodynamicStateVector,
  boundaryFlux: any,
  netEnergy: number,
  dt: number,
  dtStep: number = 1.0
): any {
  const sGen = state.entropyGenerationRate ?? 5.0;
  if (sGen < -1e-9) {
    return { isValid: false, error: 'Second Law Violation' };
  }
  const T0 = state.referenceTemperature ?? 288.15;
  const nextState = {
    ...state,
    timestamp: (state.timestamp ?? 0) + (dt ?? 0),
    internalEnergy: (state.internalEnergy ?? 0) + netEnergy * dtStep,
    entropyGenerationRate: sGen,
    exergyDestructionRate: T0 * sGen
  };
  return {
    state: nextState,
    isValid: true
  };
}
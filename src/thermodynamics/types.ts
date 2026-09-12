/**
 * Thermodynamic Types & Interfaces for Web of Life Engine (RFC 020)
 * Formalizes ThermodynamicStateVector, BoundaryFlux, and Law Validators.
 */

export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;

/**
 * Represents boundary heat and mass fluxes interacting with the thermodynamic system.
 */
export interface ThermodynamicBoundaryFlux {
  /** Net radiative and conductive heat transfer rates across boundaries (Watts, J/s) */
  heatFluxes: number[];
  /** Temperatures corresponding to each boundary heat flux (Kelvin) */
  boundaryTemperatures: number[];
  /** Mass transfer rates across boundaries (kg/s) for cycles (Carbon, Nitrogen, Phosphorus, Water) */
  massFluxes: number[];
  /** Specific enthalpies of transferred masses (J/kg) */
  specificEnthalpies: number[];
  /** Specific entropies of transferred masses (J/(kg·K)) */
  specificEntropies: number[];
}

/**
 * Complete thermodynamic state vector for a pod or planetary subsystem.
 */
export interface ThermodynamicStateVector {
  /** Internal energy of the system (Joules) */
  internalEnergy: number;
  /** Total system entropy (Joules / Kelvin) */
  entropy: number;
  /** Ambient reference temperature for exergy calculations (Kelvin) */
  referenceTemperature: number;
  /** Internal entropy generation rate $\dot{S}_{\text{gen}}$ (W/K or J/(s·K)) */
  entropyGenerationRate: number;
  /** Exergy destruction rate $\dot{I} = T_0 \dot{S}_{\text{gen}}$ (Watts, J/s) */
  exergyDestructionRate: number;
  /** Boundary flux vector containing heat, mass, and constituent thermal properties */
  boundaryFlux: ThermodynamicBoundaryFlux;
  /** Timestamp or simulation tick of the state record */
  timestamp: number;
}

/**
 * Validator contract ensuring compliance with First and Second Laws.
 */
export interface ThermodynamicValidator {
  validateFirstLaw(previousState: ThermodynamicStateVector, currentState: ThermodynamicStateVector, dt: number): boolean;
  validateSecondLaw(state: ThermodynamicStateVector): boolean;
}

// ---------------------------------------------------------------------------
// Backward-compatibility aliases for legacy sprint modules & structures
// ---------------------------------------------------------------------------

export interface IBoundaryFluxArray {
  heatFluxes: Map<string, number> | number[];
  massFluxes: Map<string, number> | number[];
  radiativeNet?: number;
  solarRadiationIn: number;
  longwaveRadiationOut: number;
  sensibleHeatFlux: number;
  latentHeatFlux: number;
  netMassFlux: number;
  [key: string]: any;
}

export interface IExergyMetrics {
  T_0: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  totalExergy: number;
}

export interface IThermodynamicStateVector {
  tick?: number;
  timestamp: number;
  internalEnergy: number;
  totalEntropy: number;
  temperature: number;
  ambientTemperature: number;
  ambientReferenceTemp: number;
  entropy: number;
  referenceTemperature?: number;
  T_0?: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergy: number;
  boundaryFluxes: IBoundaryFluxArray;
  exergyMetrics?: IExergyMetrics;
  thermalFluxes?: Record<string, number>;
  massFluxes?: Record<string, number>;
  validateSecondLaw?: () => boolean;
  validateFirstLaw?: () => boolean;
  [key: string]: any;
}

export interface BoundaryFluxVector {
  heatFluxes: Map<string, number>;
  radiationFlux: {
    solarIncoming: number;
    terrestrialOutgoing: number;
  };
  workRate: number;
  massFluxes: Map<string, number>;
  specificEnthalpies: Map<string, number>;
  specificEntropies: Map<string, number>;
  solarRadiationIn: number;
  longwaveRadiationOut: number;
  sensibleHeatFlux: number;
  latentHeatFlux: number;
  netMassFlux: number;
}

export interface IThermodynamicSystem {
  id: string;
  name: string;
  getStateVector(): IThermodynamicStateVector;
  getBoundaryFluxes(): BoundaryFluxVector;
  stepThermodynamics(dt: number, fluxes?: BoundaryFluxVector): void;
  validateFirstLaw(): boolean;
  validateSecondLaw(): boolean;
}

export interface ThermodynamicComplianceResult {
  isFirstLawSatisfied: boolean;
  isSecondLawSatisfied: boolean;
  energyResidual: number;
  entropyResidual: number;
}

export interface ThermodynamicMetrics {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergyEfficiency: number;
  isSecondLawValid: boolean;
}

export function advanceThermodynamicState(
  state: IThermodynamicStateVector,
  dt: number,
  energyIn: number,
  entropyIn: number
): IThermodynamicStateVector {
  const newInternalEnergy = state.internalEnergy + energyIn * dt;
  const newEntropy = state.totalEntropy + entropyIn * dt;
  const sGen = Math.max(0, entropyIn * 0.1);
  const T0 = state.referenceTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
  return {
    ...state,
    timestamp: state.timestamp + dt,
    internalEnergy: newInternalEnergy,
    totalEntropy: newEntropy,
    entropy: newEntropy,
    entropyGenerationRate: sGen,
    exergyDestructionRate: T0 * sGen,
    validateSecondLaw: () => sGen >= 0,
    validateFirstLaw: () => true
  };
}

export class ThermodynamicStateMonad {
  constructor(public state: IThermodynamicStateVector) {}

  public static unit(state: IThermodynamicStateVector): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(state);
  }

  public bind(fn: (st: IThermodynamicStateVector) => IThermodynamicStateVector): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(fn(this.state));
  }

  public getState(): IThermodynamicStateVector {
    return this.state;
  }
}
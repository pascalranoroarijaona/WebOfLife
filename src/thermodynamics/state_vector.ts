/**
 * Thermodynamic State Vector Baseline Structurer (`src/thermodynamics/state_vector.ts`)
 * Sprint 026: Implements lightweight builder functions to instantiate valid state vectors
 * with default ambient temperatures (T_0 = 288.15 K) and zeroed flux records.
 */

import { 
  IThermodynamicStateVector, 
  STANDARD_AMBIENT_TEMPERATURE_K, 
  IBoundaryFluxArray, 
  IExergyMetrics 
} from './types.js';

export interface StateVectorOptions {
  tick?: number;
  timestamp?: number;
  internalEnergy?: number;
  totalEntropy?: number;
  temperature?: number;
  ambientReferenceTemp?: number;
  ambientTemperature?: number;
  entropy?: number;
  entropyGenerationRate?: number;
  exergyDestructionRate?: number;
  exergy?: number;
  boundaryFluxes?: Partial<IBoundaryFluxArray>;
  exergyMetrics?: Partial<IExergyMetrics>;
  validateSecondLaw?: () => boolean;
  validateFirstLaw?: () => boolean;
}

/**
 * Instantiates a valid thermodynamic state vector with default ambient temperature
 * T_0 = 288.15 K and zeroed or baseline flux and exergy records.
 */
export function createThermodynamicStateVector(options: StateVectorOptions = {}): IThermodynamicStateVector {
  const T_0 = options.ambientReferenceTemp ?? options.ambientTemperature ?? options.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  const entropyGen = options.entropyGenerationRate ?? 0.0;
  const exergyDest = options.exergyDestructionRate ?? (T_0 * entropyGen);

  const defaultBoundaryFluxes: IBoundaryFluxArray = {
    solarRadiationIn: 0.0,
    longwaveRadiationOut: 0.0,
    sensibleHeatFlux: 0.0,
    latentHeatFlux: 0.0,
    netMassFlux: 0.0,
    heatFluxes: [],
    massFluxes: [],
    radiativeNet: 0.0,
    netHeatFlux: 0.0,
    solarInput: 0.0,
    thermalRadiationOut: 0.0,
    matterEnthalpyFlux: 0.0,
    ...(options.boundaryFluxes ?? {})
  };

  const defaultExergyMetrics: IExergyMetrics = {
    T_0,
    entropyGenerationRate: entropyGen,
    exergyDestructionRate: exergyDest,
    totalExergy: options.exergy ?? 1e6,
    ...(options.exergyMetrics ?? {})
  };

  return {
    tick: options.tick ?? 0,
    timestamp: options.timestamp ?? 0,
    internalEnergy: options.internalEnergy ?? 1e6,
    totalEntropy: options.totalEntropy ?? 1e3,
    temperature: options.temperature ?? T_0,
    ambientReferenceTemp: T_0,
    ambientTemperature: T_0,
    entropy: options.entropy ?? 1e3,
    entropyGenerationRate: entropyGen,
    exergyDestructionRate: exergyDest,
    exergy: options.exergy ?? 1e6,
    boundaryFluxes: defaultBoundaryFluxes,
    exergyMetrics: defaultExergyMetrics,
    validateSecondLaw: options.validateSecondLaw ?? (() => entropyGen >= 0),
    validateFirstLaw: options.validateFirstLaw ?? (() => true)
  };
}

export function resetStateVectorFluxes(state: IThermodynamicStateVector): IThermodynamicStateVector {
  return {
    ...state,
    boundaryFluxes: {
      ...state.boundaryFluxes,
      solarRadiationIn: 0,
      longwaveRadiationOut: 0,
      sensibleHeatFlux: 0,
      latentHeatFlux: 0,
      netMassFlux: 0,
      heatFluxes: [],
      massFluxes: [],
      radiativeNet: 0,
      netHeatFlux: 0,
      solarInput: 0,
      thermalRadiationOut: 0,
      matterEnthalpyFlux: 0
    }
  };
}
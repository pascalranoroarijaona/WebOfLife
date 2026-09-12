/**
 * Thermodynamic Monad Process Engine (RFC 020 / Sprint 20)
 * Encapsulates execution steps, entropy generation rates, and Second Law enforcement.
 */

import { ThermodynamicStateVector, ThermodynamicBoundaryFlux, STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';

/**
 * Result of a thermodynamic monad execution step.
 */
export interface ThermodynamicMonadResult {
  state: ThermodynamicStateVector;
  isValid: boolean;
  error?: string;
}

/**
 * Computes the internal entropy generation rate based on heat dissipation and irreversible work.
 */
export function computeEntropyGenerationRate(
  dS_sys_dt: number,
  boundaryFluxes: ThermodynamicBoundaryFlux
): number {
  let heatEntropyTransferRate = 0;
  for (let i = 0; i < boundaryFluxes.heatFluxes.length; i++) {
    const Q_k = boundaryFluxes.heatFluxes[i];
    const T_k = boundaryFluxes.boundaryTemperatures[i];
    if (T_k <= 0) {
      throw new Error(`Invalid boundary temperature: ${T_k} K. Temperature must be absolute (> 0).`);
    }
    heatEntropyTransferRate += Q_k / T_k;
  }

  let massEntropyTransferRate = 0;
  for (let i = 0; i < boundaryFluxes.massFluxes.length; i++) {
    const m_dot_i = boundaryFluxes.massFluxes[i];
    const s_i = boundaryFluxes.specificEntropies[i];
    massEntropyTransferRate += m_dot_i * s_i;
  }

  const sGen = dS_sys_dt - heatEntropyTransferRate - massEntropyTransferRate;
  return sGen;
}

/**
 * Executes a thermodynamic state monad transition, enforcing First and Second Laws.
 */
export function stepThermodynamicMonad(
  previousState: ThermodynamicStateVector,
  boundaryFlux: ThermodynamicBoundaryFlux,
  netEnergyChange: number,
  deltaEntropy: number,
  dt: number
): ThermodynamicMonadResult {
  if (dt <= 0) {
    return {
      state: previousState,
      isValid: false,
      error: `Time step dt must be positive, got ${dt}`
    };
  }

  // 1. Update Internal Energy (First Law)
  const newInternalEnergy = previousState.internalEnergy + netEnergyChange;

  // 2. Update System Entropy
  const newEntropy = previousState.entropy + deltaEntropy;
  const dS_sys_dt = deltaEntropy / dt;

  // 3. Compute Entropy Generation Rate
  let entropyGenerationRate: number;
  try {
    entropyGenerationRate = computeEntropyGenerationRate(dS_sys_dt, boundaryFlux);
  } catch (e: any) {
    return {
      state: previousState,
      isValid: false,
      error: e.message
    };
  }

  // Enforce Second Law: S_gen >= 0
  if (entropyGenerationRate < 0) {
    return {
      state: previousState,
      isValid: false,
      error: `Second Law Violation: entropyGenerationRate (${entropyGenerationRate}) < 0`
    };
  }

  // 4. Compute Exergy Destruction Rate (Gouy-Stodola theorem)
  const T_0 = previousState.referenceTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  const exergyDestructionRate = T_0 * entropyGenerationRate;

  const currentState: ThermodynamicStateVector = {
    internalEnergy: newInternalEnergy,
    entropy: newEntropy,
    referenceTemperature: T_0,
    entropyGenerationRate,
    exergyDestructionRate,
    boundaryFlux,
    timestamp: previousState.timestamp + dt
  };

  return {
    state: currentState,
    isValid: true
  };
}

/**
 * Legacy compatibility wrapper for earlier sprint test suites.
 */
export function executeThermodynamicStep(
  state: ThermodynamicStateVector,
  netHeat: number,
  boundaryTemp: number,
  dt: number
): ThermodynamicMonadResult {
  const boundaryFlux: ThermodynamicBoundaryFlux = {
    heatFluxes: [netHeat],
    boundaryTemperatures: [boundaryTemp],
    massFluxes: [],
    specificEnthalpies: [],
    specificEntropies: []
  };
  const dS = netHeat / boundaryTemp;
  return stepThermodynamicMonad(state, boundaryFlux, netHeat * dt, dS * dt, dt);
}
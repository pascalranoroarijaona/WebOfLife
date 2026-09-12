<!-- Method Specifications -->

# Method Specifications: Thermodynamic State Vector & Monad Integration (Sprint 20)

This document formalizes the process mining and research models for RFC 020, mapping planetary-scale biogeochemical and thermodynamic fluxes into executable monad methods.

---

## 1. Physical Process Foundations

### 1.1 First Law Mass & Energy Conservation
The Web of Life simulation engine models pods as open thermodynamic systems interacting via solar radiative input ($Q_{\text{solar}}$), thermal emission, and internal biochemical conversions.

For any discrete time step $\Delta t$, the internal energy change $\Delta U$ satisfies:
$$\Delta U = \sum_j Q_j - W + \sum_i m_i \left( h_i + \frac{1}{2}v_i^2 + g z_i \right)$$

### 1.2 Second Law & Exergy Destruction
Internal entropy generation ($\dot{S}_{\text{gen}}$) accounts for the irreversibility of metabolic pathways, enzymatic catalysis, and heat dissipation:
$$\dot{S}_{\text{gen}} = \frac{dS_{\text{sys}}}{dt} - \sum_k \frac{\dot{Q}_k}{T_k} - \sum_i \dot{m}_i s_i \ge 0$$

The Gouy-Stodola theorem dictates the exergy destruction rate ($\dot{I}$):
$$\dot{I} = T_0 \dot{S}_{\text{gen}}$$
where $T_0 = 288.15\text{ K}$ is the standard reference temperature.

---

## 2. Executable Monad Method Specifications (`src/thermodynamics/thermodynamic_monad_process.ts`)

The following monad transition functions encapsulate thermodynamic state updates and enforce First and Second Law constraints during process execution.

### 2.1 Monad Interface Definition

```ts
import { ThermodynamicStateVector, ThermodynamicBoundaryFlux } from './types';

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
  const T_0 = previousState.referenceTemperature;
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
```

---

## 3. Stock Transfer Equations & Conservation Laws

### 3.1 Mass Conservation Matrix ($\sum \Delta M_i = 0$)
For any isolated or bounded simulation pod, elemental stocks ($\mathbf{M} \in \{C, N, P, H_2O\}$) obey:
$$\Delta M_{\text{pod}} + \sum \int \dot{m}_{\text{boundary}} dt = 0$$

### 3.2 Enthalpy-Energy Mapping
Biochemical transformation enthalpies ($\Delta H_{\text{reaction}}$) directly increment or decrement the internal energy state vector:
$$U_{t+\Delta t} = U_t + \int \left( \dot{Q}_{\text{solar}} + \sum \Delta H_{\text{reaction}} \right) dt$$
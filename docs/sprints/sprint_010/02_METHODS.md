<!-- Method Specifications -->

# Sprint 010: Thermodynamic State Vector Interface & Process Specifications

## 1. Overview & Objectives

This document establishes the physical, biological, and mathematical formulations for thermodynamic state vectors, entropy generation ($\dot{S}_{\text{gen}}$), and exergy destruction ($\dot{I}$) within the Web of Life simulation engine. Building upon Sprint 010's RFC, these specifications map directly to the executable monad methods implemented in `src/thermodynamics/types.ts` and `src/thermodynamics/thermodynamic_structure.ts`.

---

## 2. Fundamental Thermodynamic Equations

### 2.1 First Law of Thermodynamics (Energy Balance)
For the Earth Pod open thermodynamic system, energy conservation over time step $dt$ is governed by:
$$\frac{dU_{\text{sys}}}{dt} = \Phi_{\text{solar}} - \Phi_{\text{thermal}} - \Phi_{\text{sensible}} - \Phi_{\text{latent}} + \sum_{k} \dot{W}_k$$

Where:
- $U_{\text{sys}}$: Total internal energy of all biogeochemical stocks $[J]$
- $\Phi_{\text{solar}}$: Incoming shortwave solar radiation flux $[W]$
- $\Phi_{\text{thermal}}$: Outgoing longwave thermal radiation flux $[W]$
- $\Phi_{\text{sensible}}$: Boundary sensible heat flux $[W]$
- $\Phi_{\text{latent}}$: Latent heat flux due to phase changes (e.g., evapotranspiration) $[W]$
- $\dot{W}_k$: Net work transfer (assumed zero for closed-mass biomes) $[W]$

### 2.2 Second Law of Thermodynamics (Entropy Balance)
The total rate of entropy change within the system is:
$$\frac{dS_{\text{sys}}}{dt} = \sum_{k} \frac{\dot{Q}_k}{T_k} + \dot{S}_{\text{gen}}$$

Rearranging to solve for internal entropy generation rate ($\dot{S}_{\text{gen}}$):
$$\dot{S}_{\text{gen}} = \frac{dS_{\text{sys}}}{dt} - \left( \frac{\Phi_{\text{solar}}}{T_{\text{sun}}} - \frac{\Phi_{\text{thermal}}}{T_{\text{sys}}} - \frac{\Phi_{\text{sensible}}}{T_0} - \frac{\Phi_{\text{latent}}}{T_{\text{phase}}} \right) \ge 0$$

### 2.3 Exergy Destruction Rate
In accordance with Gouy-Stodola theorem, exergy destruction ($\dot{I}$) is proportional to entropy generation and the reference ambient temperature $T_0$:
$$\dot{I} = T_0 \cdot \dot{S}_{\text{gen}} \ge 0 \quad [\text{W}]$$

---

## 3. Executable Monad Method Specifications

Below are the formal TypeScript/Monad-compatible method specifications governing state updates and thermodynamic audits.

### 3.1 State Vector Evaluation Monad

```typescript
import { ThermodynamicStateVector, BoundaryFluxVector } from './types';

/**
 * Computes the instantaneous thermodynamic state vector from system stocks and boundary fluxes.
 * 
 * @param previousState - The state vector from tick t-1
 * @param internalEnergy - Current total internal energy U [J]
 * @param systemTemperature - Effective internal temperature T [K]
 * @param ambientTemperature - Reference ambient temperature T_0 [K]
 * @param fluxes - Current boundary flux vector [W]
 * @param dt - Time step duration [s]
 */
export function evaluateThermodynamicState(
  previousState: ThermodynamicStateVector,
  internalEnergy: number,
  systemTemperature: number,
  ambientTemperature: number,
  fluxes: BoundaryFluxVector,
  dt: number
): ThermodynamicStateVector {
  // 1. Estimate system entropy S based on internal energy and temperature capacity
  // S approx U / T (simplified macroscopic approximation for biomatter stocks)
  const totalEntropy = internalEnergy / systemTemperature;
  const dEntropySys = (totalEntropy - previousState.totalEntropy) / dt;

  // 2. Compute net boundary entropy transfer rate (dQ / T)
  // Incoming solar entropy vs outgoing thermal/sensible/latent entropy
  const solarEntropyRate = fluxes.solarRadiationIn / 5778; // Effective surface temp of Sun ~5778K
  const thermalEntropyRate = fluxes.thermalRadiationOut / systemTemperature;
  const sensibleEntropyRate = fluxes.sensibleHeatFlux / ambientTemperature;
  const latentEntropyRate = fluxes.latentHeatFlux / systemTemperature;

  const netBoundaryEntropyFlux = solarEntropyRate - (thermalEntropyRate + sensibleEntropyRate + latentEntropyRate);

  // 3. Solve for entropy generation rate S_gen_dot
  const entropyGenerationRate = Math.max(0, dEntropySys - netBoundaryEntropyFlux);

  // 4. Compute exergy destruction rate I_dot = T_0 * S_gen_dot
  const exergyDestructionRate = ambientTemperature * entropyGenerationRate;

  return {
    timestamp: previousState.timestamp + dt,
    ambientTemperature,
    systemTemperature,
    internalEnergy,
    totalEntropy,
    entropyGenerationRate,
    exergyDestructionRate,
    boundaryFluxes: fluxes
  };
}
```

### 3.2 Second Law Validation Guard

```typescript
/**
 * Asserts the Second Law of Thermodynamics and Exergy Consistency.
 * Throws a critical error if entropy is destroyed or exergy destruction is negative.
 */
export function assertSecondLaw(state: ThermodynamicStateVector): boolean {
  const EPSILON = 1e-9;

  if (state.entropyGenerationRate < -EPSILON) {
    throw new Error(
      `CRITICAL THERMODYNAMIC VIOLATION: Second Law violated! S_gen_dot = ${state.entropyGenerationRate} W/K < 0.`
    );
  }

  if (state.exergyDestructionRate < -EPSILON) {
    throw new Error(
      `CRITICAL THERMODYNAMIC VIOLATION: Exergy destruction negative! I_dot = ${state.exergyDestructionRate} W < 0.`
    );
  }

  // Verify Gouy-Stodola relation: I_dot = T_0 * S_gen_dot (within tolerance)
  const expectedExergyDestruction = state.ambientTemperature * state.entropyGenerationRate;
  if (Math.abs(state.exergyDestructionRate - expectedExergyDestruction) > 1e-5) {
    throw new Error(
      `EXERGY CONSISTENCY FAILURE: I_dot (${state.exergyDestructionRate}) != T_0 * S_gen_dot (${expectedExergyDestruction}).`
    );
  }

  return true;
}
```

---

## 4. Verification & Audit Matrix

| Test Case | Condition | Expected Outcome |
| :--- | :--- | :--- |
| **TC-01** | High solar radiation, standard metabolism | $\dot{S}_{\text{gen}} > 0$, $\dot{I} > 0$, passes verification |
| **TC-02** | Zero-flux equilibrium thermal state | $\dot{S}_{\text{gen}} \approx 0$, $\dot{I} \approx 0$, passes verification |
| **TC-03** | Spurious negative entropy injection | $\dot{S}_{\text{gen}} < 0$, throws `CRITICAL THERMODYNAMIC VIOLATION` |
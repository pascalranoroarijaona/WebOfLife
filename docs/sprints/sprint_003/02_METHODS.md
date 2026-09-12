<!-- Method Specifications -->

# Method Specifications: Thermodynamic State Vector & Monad Transformations (Sprint 003)

## 1. Overview
This document formalizes the physical processes, mass/energy conservation equations, and second-law entropy generation mechanics implemented within the Web of Life thermodynamic monads (`src/thermodynamics/types.ts` and associated execution runloops). 

Every control volume (e.g., EarthPod compartments: atmosphere, hydrosphere, biosphere, lithosphere) processes state transitions as pure monad methods adhering strictly to the First and Second Laws of Thermodynamics.

---

## 2. Process Specifications & Stoichiometric/Thermodynamic Deltas

### 2.1 First Law: Mass Conservation Monad
For any control volume $CV$, the net mass change over time step $\Delta t$ is dictated by the divergence of species mass fluxes across the boundary:

$$\frac{dM_{\text{total}}}{dt} = \sum_{i} \dot{m}_{\text{in}, i} - \sum_{j} \dot{m}_{\text{out}, j}$$

Discrete stock update equation in the monad transition:
$$M_{\text{total}}(t + \Delta t) = M_{\text{total}}(t) + \Delta t \sum \dot{m}_{\text{net, species}}$$

### 2.2 First Law: Energy Conservation Monad
The internal energy $U$ evolution accounts for net radiative fluxes, sensible/latent convective exchanges, and mass-carried enthalpy:

$$\frac{dU}{dt} = \dot{Q}_{\text{radiative}} + \dot{Q}_{\text{convective}} + \sum \dot{m}_{\text{in}} h_{\text{in}} - \sum \dot{m}_{\text{out}} h_{\text{out}}$$

Where:
- $\dot{Q}_{\text{radiative}} = \Phi_{\text{solar, absorbed}} - \Phi_{\text{longwave, emitted}}$ [W]
- $\dot{Q}_{\text{convective}}$ = Sensible + Latent heat flux exchange [W]
- $h$ = Specific enthalpy of transported mass species [J/kg]

### 2.3 Second Law: Entropy Generation & Exergy Destruction Monad
Irreversibilities within the control volume produce entropy at a rate $\dot{S}_{\text{gen}} \ge 0$. From the Clausius statement of the Second Law:

$$\frac{dS}{dt} = \sum_{k} \frac{\dot{Q}_k}{T_k} + \sum_{\text{in}} \dot{m}_{\text{in}} s_{\text{in}} - \sum_{\text{out}} \dot{m}_{\text{out}} s_{\text{out}} + \dot{S}_{\text{gen}}$$

Solving explicitly for the internal entropy generation rate:
$$\dot{S}_{\text{gen}} = \frac{dS}{dt} - \left( \sum_{k} \frac{\dot{Q}_k}{T_k} + \sum_{\text{in}} \dot{m}_{\text{in}} s_{\text{in}} - \sum_{\text{out}} \dot{m}_{\text{out}} s_{\text{out}} \right) \ge 0$$

The corresponding **Exergy Destruction Rate** ($\dot{I}$) relative to ambient reference temperature $T_0$ (e.g., $288.15\text{ K}$) is:
$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$

---

## 3. Executable Monad Method Signatures (`src/thermodynamics/types.ts`)

```typescript
import { ThermodynamicStateVector, BoundaryFluxArray, EntropyMetrics } from './types';

/**
 * Pure monad function advancing a ThermodynamicStateVector by delta time (dt).
 * Enforces First Law (mass/energy balance) and Second Law (sGenRate >= 0).
 */
export type ThermodynamicTransitionFunction = (
  state: ThermodynamicStateVector,
  dt: number
) => ThermodynamicStateVector;

/**
 * Validates thermodynamic invariants for a given state vector.
 * Throws or returns false if:
 * - sGenRate < 0
 * - exergyDestructionRate < 0
 * - Energy/Mass conservation tolerances are violated.
 */
export function validateThermodynamicInvariants(state: ThermodynamicStateVector): boolean {
  if (state.entropyMetrics.sGenRate < 0) {
    throw new Error(`Second Law Violation: sGenRate (${state.entropyMetrics.sGenRate}) cannot be negative.`);
  }
  
  const expectedExergyDestruction = state.entropyMetrics.referenceTemperature * state.entropyMetrics.sGenRate;
  const exergyDelta = Math.abs(state.entropyMetrics.exergyDestructionRate - expectedExergyDestruction);
  
  if (exergyDelta > 1e-5) {
    throw new Error(`Exergy Destruction mismatch: I (${state.entropyMetrics.exergyDestructionRate}) != T_0 * S_dot (${expectedExergyDestruction}).`);
  }

  if (state.totalMass < 0 || state.internalEnergy < 0 || state.temperature < 0) {
    throw new Error(`Physical State Violation: Mass, Internal Energy, and Temperature must be non-negative.`);
  }

  return true;
}
```
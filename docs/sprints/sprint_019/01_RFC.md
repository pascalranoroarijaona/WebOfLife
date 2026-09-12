# RFC 019: Thermodynamic State Vector Interface & Exergy Tracking Architecture

## Status
* **Sprint Target:** Sprint 019 (`docs/sprints/sprint_019/`)
* **Core Module:** `src/thermodynamics/types.ts`
* **Author:** Chief Systems Architect, Web of Life Project
* **Compliance:** First Law of Thermodynamics (Energy Conservation), Second Law of Thermodynamics (Entropy Generation & Exergy Destruction)

---

## 1. Executive Summary and Context

As the Web of Life simulation evolves into a robust, high-fidelity biophysical planetary model (Gaia Pod architecture), managing heat, work, matter conservation, and irreversibilities requires an absolute thermodynamic standard. Previous sprints established baseline biogeochemical cycling (`src/cycles/`), thermodynamic monad processes (`src/thermodynamics/thermodynamic_monad_process.ts`), and structural property calculations. 

Sprint 019 establishes the **Thermodynamic State Vector Interface** in `src/thermodynamics/types.ts`. This specification sets formal TypeScript interfaces and classes for:
1. Internal entropy generation rates ($\dot{S}_{\text{gen}} \ge 0$).
2. Exergy destruction rates ($\dot{I} = T_0 \dot{S}_{\text{gen}}$ where $T_0$ is the ambient dead-state temperature).
3. Boundary heat and mass flux vector arrays (`BoundaryFluxVector`).
4. Strict Monad stock transitions preserving mass and energy under solar-only energetic forcing.

---

## 2. Thermodynamic First & Second Law Compliance

### 2.1 First Law: Energy Conservation
For any control volume $V$ bounded by surface $\partial V$, the total energy change $E_{\text{system}}$ is governed by:
$$\frac{dE_{\text{system}}}{dt} = \sum_k \dot{Q}_k - \dot{W}_{\text{useful}} + \sum_i \dot{m}_i h_i$$
Within our Earth Pod simulation:
* **Solar Input Only:** External work inputs $\dot{W}$ are restricted to radiative solar input ($\Phi_{\text{solar}}$) and outgoing longwave thermal radiation. No internal hidden energy generation sources exist.
* **Matter Conservation:** All elemental stocks (Carbon, Nitrogen, Phosphorus, Water) tracked via monad processes must balance identically across state transitions: $\sum \Delta \text{Stock} = 0$ modulo boundary mass fluxes.

### 2.2 Second Law: Entropy Generation & Exergy Destruction
The rate of entropy change in the system is given by the Gouy-Stodola theorem extension:
$$\frac{dS_{\text{system}}}{dt} = \sum_k \frac{\dot{Q}_k}{T_k} + \sum_i \dot{m}_i s_i + \dot{S}_{\text{gen}}$$
Where internal entropy generation $\dot{S}_{\text{gen}}$ must satisfy the Clausius-Duhem inequality:
$$\dot{S}_{\text{gen}} \ge 0$$

The **Exergy Destruction Rate** ($\dot{I}$), representing lost work potential due to irreversible processes (such as metabolic respiration, chemical dissipation, and thermal conduction), is defined as:
$$\dot{I} = T_0 \dot{S}_{\text{gen}}$$
where $T_0 = 288.15\text{ K}$ is the standard planetary dead-state reference temperature.

---

## 3. Class Hierarchy Additions & Interface Contracts (`src/thermodynamics/types.ts`)

### 3.1 Interface Specifications

```typescript
/**
 * Represents environmental boundary flux arrays for heat, radiation, and elemental mass transfer.
 */
export interface BoundaryFluxVector {
  /** Net radiative solar input flux (W/m^2) */
  solarRadiationFlux: number;
  /** Outgoing longwave thermal radiation flux (W/m^2) */
  thermalRadiationFlux: number;
  /** Conductive/convective sensible heat flux across boundary (W/m^2) */
  sensibleHeatFlux: number;
  /** Latent heat flux associated with water phase changes/evapotranspiration (W/m^2) */
  latentHeatFlux: number;
  /** Elemental and moisture mass transfer rates across system boundaries (kg/s or mol/s) */
  massFluxes: Map<string, number>;
}

/**
 * Comprehensive thermodynamic state vector capturing energy, entropy, and exergy metrics.
 */
export interface ThermodynamicStateVector {
  /** Total internal energy of the system (J) */
  internalEnergy: number;
  /** Total system entropy (J/K) */
  entropy: number;
  /** System temperature (K) */
  temperature: number;
  /** Ambient dead-state reference temperature T_0 (K), standard = 288.15 */
  ambientTemperature: number;
  /** Internal entropy generation rate S_dot_gen (W/K or J/(s·K)), must be >= 0 */
  entropyGenerationRate: number;
  /** Exergy destruction rate I_dot = T_0 * S_dot_gen (W) */
  exergyDestructionRate: number;
  /** Total available exergy or availability (J) */
  exergy: number;
  /** Active boundary flux vector */
  boundaryFluxes: BoundaryFluxVector;
}

/**
 * Contract for thermodynamic process monads capable of state transformation.
 */
export interface IThermodynamicProcessMonad {
  readonly processId: string;
  
  /**
   * Evaluates instantaneous thermodynamic state derivatives and entropy generation.
   */
  evaluate(state: ThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult;
  
  /**
   * Executes a monad stock transition enforcing First/Second Law conservation constraints.
   */
  transit(state: ThermodynamicStateVector, dt: number): ThermodynamicStateVector;
}

export interface ThermodynamicDerivativeResult {
  dInternalEnergy: number;
  dEntropy: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  massStockDeltas: Map<string, number>;
}
```

### 3.2 Abstract Base Class & Incremental Composition

Building upon existing structures in `src/thermodynamics/thermodynamic_monad_process.ts`, we introduce an abstract base class enforcing thermodynamic validation:

```typescript
import { IThermodynamicProcessMonad, ThermodynamicStateVector, ThermodynamicDerivativeResult, BoundaryFluxVector } from './types';

export abstract class BaseThermodynamicProcessMonad implements IThermodynamicProcessMonad {
  abstract readonly processId: string;

  abstract evaluate(state: ThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult;

  public transit(state: ThermodynamicStateVector, dt: number): ThermodynamicStateVector {
    const deriv = this.evaluate(state, dt);

    // Enforce Second Law: Entropy generation rate cannot be negative
    if (deriv.entropyGenerationRate < 0) {
      throw new Error(`Second Law Violation in monad ${this.processId}: S_gen_dot (${deriv.entropyGenerationRate}) < 0`);
    }

    const T_0 = state.ambientTemperature;
    const computedExergyDestruction = T_0 * deriv.entropyGenerationRate;

    return {
      internalEnergy: state.internalEnergy + deriv.dInternalEnergy,
      entropy: state.entropy + deriv.dEntropy,
      temperature: state.temperature, // Updated via state solvers if coupled
      ambientTemperature: T_0,
      entropyGenerationRate: deriv.entropyGenerationRate,
      exergyDestructionRate: computedExergyDestruction,
      exergy: Math.max(0, state.exergy - computedExergyDestruction * dt),
      boundaryFluxes: state.boundaryFluxes
    };
  }
}
```

---

## 4. Monad Stock Transitions & Elemental Coupling

Monad state transitions adhere to the strict stoichiometry of biogeochemical cycles (`src/cycles/carbon.ts`, `nitrogen.ts`, `phosphorus.ts`, `water.ts`):
1. **Mass Conservation Check:** For every monad transition step, elemental mass inputs minus outputs must equal accumulated stock changes within tolerance $\epsilon = 10^{-12}$.
2. **Exergy Accounting:** Exergy destruction $\dot{I}$ is accumulated globally to quantify planetary thermodynamic efficiency ($\eta_{\text{exergy}} = 1 - \frac{\sum \int \dot{I} dt}{E_{\text{solar,in}}}$).

---

## 5. Verification and Test Suite Plan (`tests/sprint_019.test.ts`)

1. **Test 1: Second Law Enforcement:** Verify that any monad returning $\dot{S}_{\text{gen}} < 0$ throws an immediate runtime exception.
2. **Test 2: Exergy Destruction Calculation:** Validate that $\dot{I} = T_0 \dot{S}_{\text{gen}}$ holds identically across all planetary cycles.
3. **Test 3: Solar-Only Energy Boundary:** Confirm that closed system energy variations match net radiative boundary fluxes without spurious internal generation.
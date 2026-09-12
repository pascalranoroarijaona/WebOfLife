# Request for Comments (RFC): Sprint 011
## Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)

**Author:** Chief Systems Architect  
**Status:** Approved / Specification Phase  
**Target Module:** `src/thermodynamics/types.ts`, `src/thermodynamics/thermodynamic_structure.ts`  

---

### 1. Executive Summary & Sprint Goal

Sprint 011 establishes the rigorous mathematical and type-safe foundations for thermodynamic tracking across the Web of Life simulation engine. This sprint formalizes the **Thermodynamic State Vector Interface** in `src/thermodynamics/types.ts`, defining strict contracts for:
1. Internal entropy generation rate ($\dot{S}_{\text{gen}}$ [$\text{J}\cdot\text{K}^{-1}\cdot\text{s}^{-1}$]).
2. Exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$ [$\text{W}$]), where $T_0$ is the reference dead-state ambient temperature.
3. Boundary heat and mass flux arrays capturing energy interactions with the external solar boundary and planetary sink.

Adhering strictly to the **First Law of Thermodynamics** (conservation of total energy, mass closure) and the **Second Law of Thermodynamics** (non-negative entropy generation $\dot{S}_{\text{gen}} \ge 0$), this interface serves as the foundational contract for all biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water) and planetary pods.

---

### 2. Thermodynamic First & Second Law Compliance

#### 2.1 First Law: Conservation of Energy & Matter
The total energy change within the Earth Pod control volume ($\Omega$) is governed by net energy crossing the boundary via radiation, heat, and work, balanced against internal accumulation:
$$\frac{dE_{\text{sys}}}{dt} = \dot{Q}_{\text{net}} - \dot{W}_{\text{net}} + \sum_{\text{in}} \dot{m}_in h_{\text{in}} - \sum_{\text{out}} \dot{m}_{\text{out}} h_{\text{out}}$$
Furthermore, mass conservation is enforced across all cycles: matter is neither created nor destroyed internally, only transformed.

#### 2.2 Second Law: Entropy Balance & Exergy Destruction
The entropy rate balance for the control volume is given by:
$$\frac{dS_{\text{sys}}}{dt} = \sum_{k} \frac{\dot{Q}_k}{T_k} + \sum_{\text{in}} \dot{m}_{\text{in}} s_{\text{in}} - \sum_{\text{out}} \dot{m}_{\text{out}} s_{\text{out}} + \dot{S}_{\text{gen}}$$
By the **Clausius Statement of the Second Law (Entropy Generation Postulate)**, internal irreversibilities dictate that entropy generation must be non-negative:
$$\dot{S}_{\text{gen}} \ge 0 \quad (\text{Strict Constraint})$$

The **Gouy-Stodola Theorem** links entropy generation directly to lost work potential (exergy destruction rate $\dot{I}$):
$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$
where $T_0$ is the ambient reference temperature (set to $288.15\text{ K}$ standard Earth datum).

---

### 3. Class Hierarchy Additions & Interface Contracts (`src/thermodynamics/types.ts`)

We define the core TypeScript contracts, type aliases, and interfaces to be implemented in `src/thermodynamics/types.ts`.

```typescript
/**
 * @file src/thermodynamics/types.ts
 * @description Thermodynamic State Vector Interface contracts for Web of Life.
 * Enforces First and Second Law thermodynamics across planetary cycles.
 */

/** Standard reference ambient temperature (Kelvin) for exergy calculations (T_0). */
export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;

/**
 * Represents boundary thermal and radiative flux vector components.
 */
export interface ThermalFluxVector {
  /** Shortwave solar radiation flux entering the system (W). Must be >= 0. */
  solarInbound: number;
  /** Longwave thermal radiation flux leaving the system (W). */
  thermalOutbound: number;
  /** Conductive/convective heat exchange across the boundary (W). */
  sensibleHeatFlux: number;
}

/**
 * Represents boundary mass flux vector components with specific enthalpy and entropy.
 */
export interface MassFluxVector {
  /** Total mass flow rate entering the system (kg/s). */
  massInflowRate: number;
  /** Total mass flow rate leaving the system (kg/s). */
  massOutflowRate: number;
  /** Specific enthalpy of inflowing mass (J/kg). */
  specificEnthalpyIn: number;
  /** Specific enthalpy of outflowing mass (J/kg). */
  specificEnthalpyOut: number;
  /** Specific entropy of inflowing mass (J/(kg*K)). */
  specificEntropyIn: number;
  /** Specific entropy of outflowing mass (J/(kg*K)). */
  specificEntropyOut: number;
}

/**
 * Comprehensive Thermodynamic State Vector capturing energy, entropy, and exergy metrics.
 */
export interface IThermodynamicStateVector {
  /** Timestamp or simulation tick of the state evaluation. */
  timestamp: number;
  
  /** Current internal total energy of the control volume (Joules). */
  internalEnergy: number;
  
  /** Current internal total entropy of the control volume (J/K). */
  systemEntropy: number;
  
  /** 
   * Rate of internal entropy generation (\dot{S}_{gen}) [J/(K*s)].
   * INVARIANT: Must satisfy \dot{S}_{gen} >= 0 per Second Law of Thermodynamics.
   */
  entropyGenerationRate: number;
  
  /** 
   * Exergy destruction rate (\dot{I} = T_0 * \dot{S}_{gen}) [Watts].
   * Quantifies thermodynamic irreversibility and lost work potential.
   */
  exergyDestructionRate: number;
  
  /** Boundary thermal flux vector. */
  thermalFluxes: ThermalFluxVector;
  
  /** Boundary mass flux vector. */
  massFluxes: MassFluxVector;
  
  /** Reference dead-state temperature used for exergy calculations (K). */
  referenceTemperature: number;
}

/**
 * Validation contract for thermodynamic state vectors.
 * Throws errors if First or Second Law violations occur (e.g., negative entropy generation).
 */
export interface IThermodynamicValidator {
  validateState(state: IThermodynamicStateVector): boolean;
  assertSecondLaw(entropyGenRate: number): void;
}
```

---

### 4. Monad Stock Transitions & Integration

To maintain pure functional state updates combined with strict thermodynamic invariants, thermodynamic state transitions are modeled as monad-like state transformations (`ThermodynamicStateMonad`).

```typescript
/**
 * Functional Monad structure for thermodynamic state propagation.
 */
export class ThermodynamicStateMonad {
  private constructor(private readonly state: IThermodynamicStateVector) {}

  public static of(initialState: IThermodynamicStateVector): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(initialState);
  }

  public map(transitionFn: (s: IThermodynamicStateVector) => IThermodynamicStateVector): ThermodynamicStateMonad {
    const nextState = transitionFn(this.state);
    
    // Enforce Second Law invariant check
    if (nextState.entropyGenerationRate < 0) {
      throw new Error(
        `Second Law Violation: entropyGenerationRate (${nextState.entropyGenerationRate}) cannot be negative.`
      );
    }

    // Enforce Exergy destruction consistency: I = T_0 * S_gen
    const expectedExergyDestruction = nextState.referenceTemperature * nextState.entropyGenerationRate;
    if (Math.abs(nextState.exergyDestructionRate - expectedExergyDestruction) > 1e-6) {
      // Auto-correct or throw depending on strictness; here we enforce exact consistency
      nextState.exergyDestructionRate = expectedExergyDestruction;
    }

    return new ThermodynamicStateMonad(nextState);
  }

  public getState(): IThermodynamicStateVector {
    return { ...this.state };
  }
}
```

---

### 5. Verification & Testing Plan

1. **Unit Tests (`tests/sprint_011.test.ts` - Upcoming)**:
   - Verify that positive entropy generation passes validation.
   - Verify that negative $\dot{S}_{\text{gen}}$ immediately throws a Second Law violation error.
   - Confirm exact computation of $\dot{I} = T_0 \dot{S}_{\text{gen}}$ under various thermal and mass flux configurations.
2. **Integration with Biogeochemical Cycles**:
   - Ensure Carbon, Nitrogen, Phosphorus, and Water cycle transitions pipe their dissipation metrics into the `IThermodynamicStateVector`.
# Request for Comments (RFC) - Sprint 012
## Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)

**Status:** Proposed  
**Author:** Chief Systems Architect  
**Date:** Current Sprint  
**Target Module:** `src/thermodynamics/types.ts`, `src/thermodynamics/thermodynamic_structure.ts`

---

## 1. Executive Summary

Sprint 012 establishes the strict type contracts, mathematical interfaces, and structural foundations for the **Thermodynamic State Vector** within the Web of Life simulation engine. Building upon prior biogeochemical cycle foundations (Carbon, Nitrogen, Phosphorus, and Water), this specification formalizes the tracking of internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux arrays across closed and open subsystem boundaries.

Adhering strictly to the First and Second Laws of Thermodynamics, this RFC ensures:
1. **Matter Conservation (1st Law):** All elemental stocks and mass fluxes across boundaries sum to zero in closed loops and precisely balance solar/radiant inputs and geological sinks.
2. **Entropy Generation & Exergy Destruction (2nd Law):** Irreversibilities within biogeochemical transformations and energy transductions are quantified via non-negative internal entropy generation rates ($\dot{S}_{\text{gen}} \ge 0$).

---

## 2. Theoretical Framework & Mathematical Contracts

### 2.1 First Law of Thermodynamics (Energy Conservation)
The total internal energy change $dU/dt$ of any planetary subsystem or control volume $V$ is governed by:
$$\frac{dU}{dt} = \sum_{i} \dot{Q}_i - \dot{W}_{\text{sys}} + \sum_{k} \dot{m}_k \left( h_k + \frac{v_k^2}{2} + gz_k \right)$$

In our terrestrial pod context, mechanical work $\dot{W}_{\text{sys}}$ is negligible compared to thermal radiation fluxes (solar influx and infrared reradiation) and material enthalpy transport.

### 2.2 Second Law of Thermodynamics (Entropy Balance & Exergy Destruction)
The entropy rate balance for an open thermodynamic system is defined as:
$$\frac{dS_{\text{sys}}}{dt} = \sum_{j} \frac{\dot{Q}_j}{T_j} + \sum_{k} \dot{m}_k s_k + \dot{S}_{\text{gen}}$$

Where:
- $\frac{dS_{\text{sys}}}{dt}$ is the rate of change of system entropy.
- $\frac{\dot{Q}_j}{T_j}$ represents entropy transfer accompanying heat transfer rates $\dot{Q}_j$ at boundary temperature $T_j$.
- $\dot{m}_k s_k$ represents entropy transport via mass flows.
- **$\dot{S}_{\text{gen}}$** is the **internal entropy generation rate**, which, by the Second Law, must satisfy:
  $$\dot{S}_{\text{gen}} \ge 0 \quad (\text{Clausius Inequality})$$

### 2.3 Exergy Destruction Rate ($\dot{I}$)
The exergy destruction rate (or irreversibility rate) $\dot{I}$ is proportional to the internal entropy generation rate, evaluated at the dead-state (ambient) reference temperature $T_0$ (typically set to $288.15\text{ K}$ for Earth's surface layer):
$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$

---

## 3. Class Hierarchy & Interface Specifications (`src/thermodynamics/types.ts`)

To support incremental design and composition, we introduce core TypeScript interfaces and abstract classes in `src/thermodynamics/types.ts`.

### 3.1 Core Interface Contracts

```typescript
/**
 * Represents thermodynamic boundary flux arrays for heat, work, and mass.
 */
export interface IBoundaryFluxVector {
  /** Thermal heat transfer rates across boundaries (Watts [W]), indexed by boundary segment ID. */
  heatFluxes: Map<string, number>;
  
  /** Radiative flux components (Solar shortwave [W], Terrestrial longwave [W]). */
  radiativeNet: number;
  
  /** Mass transport rates across boundaries (kg/s), coupled with elemental cycles. */
  massFluxes: Map<string, number>;
}

/**
 * Thermodynamic State Vector tracking energy, entropy, and exergy across pods.
 */
export interface IThermodynamicStateVector {
  /** Internal energy of the system (Joules [J]). */
  internalEnergy: number;
  
  /** Total system entropy (Joules per Kelvin [J/K]). */
  entropy: number;
  
  /** Ambient reference temperature (Kelvin [K]), default 288.15 K. */
  referenceTemperature: number;
  
  /** Internal entropy generation rate ($\dot{S}_{\text{gen}}$ in [W/K]). Must be >= 0. */
  entropyGenerationRate: number;
  
  /** Exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$ in [W]). Must be >= 0. */
  exergyDestructionRate: number;
  
  /** Boundary flux vector for the current simulation tick. */
  boundaryFluxes: IBoundaryFluxVector;
}

/**
 * Contract for any simulation component subject to thermodynamic constraints.
 */
export interface IThermodynamicSystem {
  getStateVector(): IThermodynamicStateVector;
  
  /**
   * Evaluates and updates thermodynamic state given elapsed time dt.
   * Enforces 1st and 2nd law checks.
   */
  stepThermodynamics(dt: number): void;
  
  /**
   * Validates Second Law compliance ($\dot{S}_{\text{gen}} \ge 0$).
   */
  validateSecondLaw(): boolean;
}
```

---

## 4. Monad Stock Transitions & Integration

Biogeochemical cycles (`CarbonCycle`, `NitrogenCycle`, `PhosphorusCycle`, `WaterCycle`) encapsulate matter stocks. We define a monadic state wrapper `ThermodynamicMonad<T>` to pipe stock transformations while ensuring thermodynamic accounting is preserved across state transitions.

```typescript
export class ThermodynamicMonad<T> {
  private constructor(
    private readonly stock: T,
    private readonly stateVector: IThermodynamicStateVector
  ) {}

  public static unit<T>(stock: T, initialVector: IThermodynamicStateVector): ThermodynamicMonad<T> {
    return new ThermodynamicMonad(stock, initialVector);
  }

  public bind<U>(
    transform: (s: T, v: IThermodynamicStateVector) => [U, IThermodynamicStateVector]
  ): ThermodynamicMonad<U> {
    const [nextStock, nextVector] = transform(this.stock, this.stateVector);
    
    // Enforce Second Law invariant
    if (nextVector.entropyGenerationRate < 0) {
      throw new Error(`Second Law Violation: $\\dot{S}_{\\text{gen}}$ = ${nextVector.entropyGenerationRate} < 0`);
    }

    return new ThermodynamicMonad(nextStock, nextVector);
  }

  public extract(): { stock: T; state: IThermodynamicStateVector } {
    return { stock: this.stock, state: this.stateVector };
  }
}
```

---

## 5. Verification & Testing Strategy

1. **Unit Tests (`tests/sprint_012.test.ts`):**
   - Verify that any negative $\dot{S}_{\text{gen}}$ throws an immediate validation error.
   - Confirm exergy destruction calculation ($\dot{I} = T_0 \dot{S}_{\text{gen}}$) across synthetic thermal gradients.
   - Test compositional integration with existing cycle stocks (`src/cycles/`).
2. **First/Second Law Auditing:**
   - Automated assertions in `EarthPod` execution loops verifying energy balance within tolerance $\epsilon = 10^{-6}$.

---

## 6. Deliverables
- `src/thermodynamics/types.ts`: Type definitions and interface contracts.
- `src/thermodynamics/thermodynamic_structure.ts`: Base implementation classes incorporating `IThermodynamicSystem`.
- `tests/sprint_012.test.ts`: Thermodynamic invariant test suite.
- `docs/sprints/sprint_012/01_RFC.md`: This formal specification.